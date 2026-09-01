import { supabase } from '@/lib/supabase';
import * as xlsx from 'xlsx';
import { runAutomatedFinancialProjection } from '@/actions/ai';
import { differenceInMonths, startOfDay, endOfDay } from 'date-fns';

export type ProjectionAssumptions = {
  projectionPeriod: number;
  revenueGrowth: number;
  cogsPercentage: number;
  cogsInflation: number;
  startingBalance: {
    cash: number;
    inventory: number;
    fixedAssets: number;
    accountsPayable: number;
  };
  opex: { category: string; amount: number }[];
  capex: { assetName: string; cost: number; purchaseMonth: number; usefulLife: number }[];
};

export type ProjectionResults = {
  assumptions: ProjectionAssumptions;
  incomeStatement: any[];
  cashFlowStatement: any[];
  balanceSheet: {
    assets: any[];
    inventory: any[];
    fixedAssets: any[];
    totalAssets: any[];
    accountsPayable: any[];
    totalLiabilities: any[];
    retainedEarnings: any[];
    totalEquity: any[];
    totalLiabilitiesAndEquity: any[];
  };
  details: {
    revenue: any[];
    cogs: any[];
    opex: any[];
    capex: any[];
    depreciation: any[];
  };
};

export type AiProjectionOutput = {
  projectedRevenue: number;
  projectedProfit: number;
  confidenceScore: number;
  revenueTrendAnalysis: string;
  profitMarginAnalysis: string;
  topPerformingItems: string[];
  recommendations: string;
};

export type FinancialStatementResults = {
  period: { start: string; end: string };
  profitAndLoss: {
    revenue: number;
    cogs: number;
    grossProfit: number;
    expenses: { category: string; total: number }[];
    totalExpenses: number;
    depreciation: number;
    operatingIncome: number;
    taxes: number;
    netIncome: number;
  };
  cashFlow: {
    netIncome: number;
    depreciation: number;
    cashFromOperations: number;
  };
};

async function getBaselineRevenue(): Promise<number> {
  try {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const { data } = await supabase
      .from('orders')
      .select('gross_revenue, total, created_at')
      .gte('created_at', oneYearAgo.toISOString());

    if (!data || data.length === 0) {
      return 75000000;
    }

    const monthlySales: { [key: string]: number } = {};
    let monthCount = 0;

    data.forEach(row => {
      const date = new Date(row.created_at);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      if (!monthlySales[monthKey]) {
        monthlySales[monthKey] = 0;
        monthCount++;
      }
      monthlySales[monthKey] += row.gross_revenue || row.total || 0;
    });

    const totalRevenue = Object.values(monthlySales).reduce((acc, val) => acc + val, 0);
    return totalRevenue / (monthCount || 1);
  } catch (e) {
    return 75000000;
  }
}

async function getAverageMonthlyExpenses(): Promise<number> {
  try {
    const { data } = await supabase.from('expenses').select('amount, expense_date');
    if (!data || data.length === 0) return 15000000;

    let totalExpenses = 0;
    let firstDate: Date | null = null;
    let lastDate: Date | null = null;

    data.forEach(row => {
      totalExpenses += Number(row.amount || 0);
      const expenseDate = new Date(row.expense_date || Date.now());
      if (!firstDate || expenseDate < firstDate) firstDate = expenseDate;
      if (!lastDate || expenseDate > lastDate) lastDate = expenseDate;
    });

    if (!firstDate || !lastDate) return 15000000;

    const months = differenceInMonths(lastDate, firstDate) + 1;
    return totalExpenses / (months || 1);
  } catch (e) {
    return 15000000;
  }
}

export async function generateFinancialProjection(assumptions: ProjectionAssumptions): Promise<ProjectionResults> {
  const [baselineRevenue, historicalAvgMonthlyExpenses] = await Promise.all([
    getBaselineRevenue(),
    getAverageMonthlyExpenses(),
  ]);

  const {
    projectionPeriod,
    revenueGrowth,
    cogsPercentage,
    cogsInflation,
    startingBalance,
    opex,
    capex,
  } = assumptions;

  const totalOpex = opex.reduce((sum, item) => sum + item.amount, 0);
  const effectiveOpex = totalOpex > 0 ? totalOpex : historicalAvgMonthlyExpenses;

  const results: ProjectionResults = {
    assumptions,
    incomeStatement: [],
    cashFlowStatement: [],
    balanceSheet: {
      assets: [],
      inventory: [],
      fixedAssets: [],
      totalAssets: [],
      accountsPayable: [],
      totalLiabilities: [],
      retainedEarnings: [],
      totalEquity: [],
      totalLiabilitiesAndEquity: [],
    },
    details: {
      revenue: [],
      cogs: [],
      opex: [],
      capex: [],
      depreciation: [],
    },
  };

  let currentCash = startingBalance.cash;
  let currentInventory = startingBalance.inventory;
  let currentFixedAssets = startingBalance.fixedAssets;
  let currentRetainedEarnings = 0;
  const capexDepreciationSchedules: { [assetName: string]: { monthlyDep: number; remainingMonths: number } } = {};

  for (let month = 1; month <= projectionPeriod; month++) {
    // 1. Revenue
    const monthlyRevenue = baselineRevenue * Math.pow(1 + revenueGrowth / 100, month - 1);
    results.details.revenue.push({ month, amount: monthlyRevenue });

    // 2. COGS
    const effectiveCogsPercentage = (cogsPercentage / 100) * Math.pow(1 + cogsInflation / 100, month - 1);
    const monthlyCogs = monthlyRevenue * effectiveCogsPercentage;
    results.details.cogs.push({ month, amount: monthlyCogs });

    // 3. Gross Profit
    const grossProfit = monthlyRevenue - monthlyCogs;

    // 4. OPEX
    results.details.opex.push({ month, amount: effectiveOpex });

    // 5. CAPEX & Depreciation
    let monthlyCapex = 0;
    capex.forEach(asset => {
      if (asset.purchaseMonth === month) {
        monthlyCapex += asset.cost;
        currentFixedAssets += asset.cost;
        capexDepreciationSchedules[`${asset.assetName}-${month}`] = {
          monthlyDep: asset.cost / (asset.usefulLife * 12),
          remainingMonths: asset.usefulLife * 12,
        };
      }
    });
    results.details.capex.push({ month, amount: monthlyCapex });

    let monthlyDepreciation = 0;
    Object.keys(capexDepreciationSchedules).forEach(key => {
      const schedule = capexDepreciationSchedules[key];
      if (schedule.remainingMonths > 0) {
        monthlyDepreciation += schedule.monthlyDep;
        schedule.remainingMonths--;
      }
    });
    results.details.depreciation.push({ month, amount: monthlyDepreciation });

    // 6. Net Income
    const operatingIncome = grossProfit - effectiveOpex - monthlyDepreciation;
    const taxes = operatingIncome > 0 ? operatingIncome * 0.11 : 0;
    const netIncome = operatingIncome - taxes;

    results.incomeStatement.push({
      month,
      revenue: monthlyRevenue,
      cogs: monthlyCogs,
      grossProfit,
      opex: effectiveOpex,
      depreciation: monthlyDepreciation,
      operatingIncome,
      taxes,
      netIncome,
    });

    // 7. Cash Flow
    const cashFromOperations = netIncome + monthlyDepreciation;
    const cashFromInvesting = -monthlyCapex;
    const netCashFlow = cashFromOperations + cashFromInvesting;
    currentCash += netCashFlow;

    results.cashFlowStatement.push({
      month,
      netIncome,
      depreciation: monthlyDepreciation,
      cashFromOperations,
      capex: monthlyCapex,
      netCashFlow,
      endingCash: currentCash,
    });

    // 8. Balance Sheet
    currentFixedAssets -= monthlyDepreciation;
    currentRetainedEarnings += netIncome;

    results.balanceSheet.assets.push({ month, amount: currentCash });
    results.balanceSheet.inventory.push({ month, amount: currentInventory });
    results.balanceSheet.fixedAssets.push({ month, amount: currentFixedAssets });
    const totalAssets = currentCash + currentInventory + currentFixedAssets;
    results.balanceSheet.totalAssets.push({ month, amount: totalAssets });

    results.balanceSheet.accountsPayable.push({ month, amount: startingBalance.accountsPayable });
    results.balanceSheet.totalLiabilities.push({ month, amount: startingBalance.accountsPayable });
    results.balanceSheet.retainedEarnings.push({ month, amount: currentRetainedEarnings });
    const totalEquity = currentRetainedEarnings;
    results.balanceSheet.totalEquity.push({ month, amount: totalEquity });
    results.balanceSheet.totalLiabilitiesAndEquity.push({ month, amount: startingBalance.accountsPayable + totalEquity });
  }

  return results;
}

export async function generateAiProjection(): Promise<AiProjectionOutput> {
  try {
    const { data: orders } = await supabase.from('orders').select('*').limit(50);
    const { data: inventory } = await supabase.from('inventory').select('*');
    const { data: menu } = await supabase.from('menu_items').select('*');
    const { data: exp } = await supabase.from('expenses').select('*').limit(50);

    const historicalSales = (orders || []).map((order: any) => ({
      date: new Date(order.created_at || Date.now()).toISOString().split('T')[0],
      total: order.gross_revenue || order.total || 45000,
      items: order.items || [],
    }));

    const inventoryLevels = (inventory || []).map((item: any) => ({
      name: item.name,
      quantity: item.quantity,
      costPerUnit: item.cost_per_unit,
    }));

    const menuItems = (menu || []).map((item: any) => ({
      name: item.name,
      price: item.price,
      costPrice: item.cost_price,
    }));

    const historicalExpenses = (exp || []).map((expense: any) => ({
      date: new Date(expense.expense_date || Date.now()).toISOString().split('T')[0],
      category: expense.category,
      amount: expense.amount,
    }));

    const result = await runAutomatedFinancialProjection({
      historicalSales: JSON.stringify(historicalSales),
      inventoryLevels: JSON.stringify(inventoryLevels),
      menuItems: JSON.stringify(menuItems),
      historicalExpenses: JSON.stringify(historicalExpenses),
    });

    return result;
  } catch (error) {
    console.error("Error in generateAiProjection:", error);
    throw error;
  }
}

export async function generateFinancialStatements(
  startDate: Date,
  endDate: Date
): Promise<FinancialStatementResults> {
  const start = startOfDay(startDate);
  const end = endOfDay(endDate);

  const startIso = start.toISOString();
  const endIso = end.toISOString();

  let revenue = 0;
  let cogs = 0;
  let totalExpenses = 0;
  const categorizedExpenses: Record<string, number> = {};

  try {
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', startIso)
      .lte('created_at', endIso);

    if (ordersData && ordersData.length > 0) {
      ordersData.forEach((order: any) => {
        revenue += Number(order.gross_revenue || order.total || 0);
        cogs += Number(order.total_cost || (order.gross_revenue ? order.gross_revenue * 0.45 : 0));
      });
    } else {
      revenue = 38500000;
      cogs = 15400000;
    }

    const { data: expensesData } = await supabase
      .from('expenses')
      .select('*')
      .gte('expense_date', startIso)
      .lte('expense_date', endIso);

    if (expensesData && expensesData.length > 0) {
      expensesData.forEach((expense: any) => {
        const amt = Number(expense.amount || 0);
        categorizedExpenses[expense.category] = (categorizedExpenses[expense.category] || 0) + amt;
        totalExpenses += amt;
      });
    } else {
      categorizedExpenses['Listrik & Gas Oven'] = 2500000;
      categorizedExpenses['Gaji Baker & Kasir'] = 8000000;
      categorizedExpenses['Kemasan Dus Roti'] = 1200000;
      totalExpenses = 11700000;
    }
  } catch (e) {
    revenue = 38500000;
    cogs = 15400000;
    categorizedExpenses['Listrik & Gas Oven'] = 2500000;
    categorizedExpenses['Gaji Baker & Kasir'] = 8000000;
    categorizedExpenses['Kemasan Dus Roti'] = 1200000;
    totalExpenses = 11700000;
  }

  const grossProfit = revenue - cogs;
  const expenses = Object.entries(categorizedExpenses).map(([category, total]) => ({ category, total }));
  const depreciation = 750000;
  const operatingIncome = grossProfit - totalExpenses - depreciation;
  const taxes = operatingIncome > 0 ? operatingIncome * 0.005 : 0;
  const netIncome = operatingIncome - taxes;
  const cashFromOperations = netIncome + depreciation;

  return {
    period: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    profitAndLoss: {
      revenue,
      cogs,
      grossProfit,
      expenses,
      totalExpenses,
      depreciation,
      operatingIncome,
      taxes,
      netIncome,
    },
    cashFlow: {
      netIncome,
      depreciation,
      cashFromOperations,
    },
  };
}

export function exportProjectionsToExcel(results: ProjectionResults, fileName = "Proyeksi_Keuangan.xlsx") {
  const wb = xlsx.utils.book_new();

  const incomeData = results.incomeStatement.map((item) => ({
    'Bulan': `Bulan ${item.month}`,
    'Pendapatan (Rp)': item.revenue,
    'HPP (Rp)': item.cogs,
    'Laba Kotor (Rp)': item.grossProfit,
    'Beban Operasional (Rp)': item.opex,
    'Penyusutan (Rp)': item.depreciation,
    'Laba Operasional (Rp)': item.operatingIncome,
    'Pajak (Rp)': item.taxes,
    'Laba Bersih (Rp)': item.netIncome,
  }));
  const wsIncome = xlsx.utils.json_to_sheet(incomeData);
  xlsx.utils.book_append_sheet(wb, wsIncome, "Laba Rugi Proyeksi");

  const cashFlowData = results.cashFlowStatement.map((item) => ({
    'Bulan': `Bulan ${item.month}`,
    'Laba Bersih (Rp)': item.netIncome,
    'Penyusutan (Rp)': item.depreciation,
    'Arus Kas Operasi (Rp)': item.cashFromOperations,
    'Belanja Modal CAPEX (Rp)': item.capex,
    'Arus Kas Bersih (Rp)': item.netCashFlow,
    'Saldo Kas Akhir (Rp)': item.endingCash,
  }));
  const wsCash = xlsx.utils.json_to_sheet(cashFlowData);
  xlsx.utils.book_append_sheet(wb, wsCash, "Arus Kas Proyeksi");

  xlsx.writeFile(wb, fileName);
}

export const exportProjectionToExcel = exportProjectionsToExcel;
