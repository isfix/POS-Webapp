'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs, Timestamp, where } from 'firebase/firestore';
import * as xlsx from 'xlsx';
import { runAutomatedFinancialProjection } from '@/actions/ai';
import type { AutomatedFinancialProjectionOutput } from '@/ai/flows/automated-financial-projection';
import { subDays, differenceInMonths, startOfDay, endOfDay } from 'date-fns';


// TYPE DEFINITIONS
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
        assets: any[],
        inventory: any[],
        fixedAssets: any[],
        totalAssets: any[],
        accountsPayable: any[],
        totalLiabilities: any[],
        retainedEarnings: any[],
        totalEquity: any[],
        totalLiabilitiesAndEquity: any[]
    };
    details: {
        revenue: any[],
        cogs: any[],
        opex: any[],
        capex: any[],
        depreciation: any[],
    }
};

export type AiProjectionOutput = AutomatedFinancialProjectionOutput;

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
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const q = query(collection(db, 'orders'), where('timestamp', '>=', Timestamp.fromDate(oneYearAgo)));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return 75000000; // Return a default value if no historical data (in IDR)
    }

    const monthlySales: { [key: string]: number } = {};
    let monthCount = 0;

    querySnapshot.forEach(doc => {
        const data = doc.data();
        const date = (data.timestamp as Timestamp).toDate();
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        if (!monthlySales[monthKey]) {
            monthlySales[monthKey] = 0;
            monthCount++;
        }
        monthlySales[monthKey] += data.grossRevenue || 0;
    });

    const totalRevenue = Object.values(monthlySales).reduce((acc, val) => acc + val, 0);
    return totalRevenue / (monthCount || 1);
}

async function getAverageMonthlyExpenses(): Promise<number> {
    const expensesQuery = query(collection(db, 'expenses'));
    const snapshot = await getDocs(expensesQuery);
    if (snapshot.empty) return 0;

    let totalExpenses = 0;
    let firstDate: Date | null = null;
    let lastDate: Date | null = null;

    snapshot.forEach(doc => {
        const expense = doc.data();
        totalExpenses += expense.amount;
        const expenseDate = (expense.expenseDate as Timestamp).toDate();
        if (!firstDate || expenseDate < firstDate) firstDate = expenseDate;
        if (!lastDate || expenseDate > lastDate) lastDate = expenseDate;
    });

    if (!firstDate || !lastDate) return 0;

    const months = differenceInMonths(lastDate, firstDate) + 1;
    return totalExpenses / (months || 1);
}


export async function generateFinancialProjection(assumptions: ProjectionAssumptions): Promise<ProjectionResults> {
    const [baselineRevenue, historicalAvgMonthlyExpenses] = await Promise.all([
        getBaselineRevenue(),
        getAverageMonthlyExpenses(),
    ]);
    
    const manualMonthlyOpex = assumptions.opex.reduce((sum, item) => sum + item.amount, 0);
    const totalMonthlyOpex = historicalAvgMonthlyExpenses + manualMonthlyOpex;

    const incomeStatement: any[] = [];
    const cashFlowStatement: any[] = [];
    const balanceSheet = {
        assets: [] as any[], inventory: [] as any[], fixedAssets: [] as any[], totalAssets: [] as any[],
        accountsPayable: [] as any[], totalLiabilities: [] as any[],
        retainedEarnings: [] as any[], totalEquity: [] as any[], totalLiabilitiesAndEquity: [] as any[],
    };
    
    const details = {
        revenue: [] as any[], cogs: [] as any[], opex: [] as any[], capex: [] as any[], depreciation: [] as any[],
    };

    let lastMonthRevenue = baselineRevenue;
    let currentCogsPercentage = assumptions.cogsPercentage;
    
    let lastCash = assumptions.startingBalance.cash;
    let lastInventory = assumptions.startingBalance.inventory;
    let lastFixedAssets = assumptions.startingBalance.fixedAssets;
    let lastAccountsPayable = assumptions.startingBalance.accountsPayable;
    let lastRetainedEarnings = (lastCash + lastInventory + lastFixedAssets) - lastAccountsPayable;

    for (let month = 1; month <= assumptions.projectionPeriod; month++) {
        const revenue = lastMonthRevenue * (1 + assumptions.revenueGrowth);
        if (month % 12 === 1 && month > 1) { 
             currentCogsPercentage *= (1 + assumptions.cogsInflation);
        }
        const cogs = revenue * currentCogsPercentage;
        const grossProfit = revenue - cogs;
        
        const capexForMonth = assumptions.capex.filter(c => c.purchaseMonth === month);
        const capexCost = capexForMonth.reduce((sum, item) => sum + item.cost, 0);
        
        let monthlyDepreciation = 0;
        assumptions.capex.forEach(item => {
            if (month >= item.purchaseMonth) {
                monthlyDepreciation += item.cost / (item.usefulLife * 12);
            }
        });
        
        const ebitda = grossProfit - totalMonthlyOpex;
        const ebit = ebitda - monthlyDepreciation;
        const taxes = 0;
        const netIncome = ebit - taxes;

        incomeStatement.push({ month, revenue, cogs, grossProfit, totalOPEX: totalMonthlyOpex, ebitda, depreciation: monthlyDepreciation, ebit, taxes, netIncome });

        const netCashFlow = netIncome + monthlyDepreciation - capexCost;
        const endingCashBalance = lastCash + netCashFlow;
        cashFlowStatement.push({ month, netIncome, depreciation: monthlyDepreciation, capex: capexCost, netCashFlow, endingCashBalance });

        const currentCash = endingCashBalance;
        const currentInventory = cogs * 0.5;
        const currentFixedAssets = lastFixedAssets + capexCost - monthlyDepreciation;
        const totalAssets = currentCash + currentInventory + currentFixedAssets;
        
        const currentAccountsPayable = cogs * 0.5;
        const totalLiabilities = currentAccountsPayable;
        
        const currentRetainedEarnings = lastRetainedEarnings + netIncome;
        const totalEquity = currentRetainedEarnings;
        
        const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

        balanceSheet.assets.push({ month, value: currentCash });
        balanceSheet.inventory.push({ month, value: currentInventory });
        balanceSheet.fixedAssets.push({ month, value: currentFixedAssets });
        balanceSheet.totalAssets.push({ month, value: totalAssets });
        balanceSheet.accountsPayable.push({ month, value: currentAccountsPayable });
        balanceSheet.totalLiabilities.push({ month, value: totalLiabilities });
        balanceSheet.retainedEarnings.push({ month, value: currentRetainedEarnings });
        balanceSheet.totalEquity.push({ month, value: totalEquity });
        balanceSheet.totalLiabilitiesAndEquity.push({ month, value: totalLiabilitiesAndEquity });

        details.revenue.push({ Month: month, Revenue: revenue });
        details.cogs.push({ Month: month, COGS: cogs });
        details.opex.push({ Month: month, 'Historical Average': historicalAvgMonthlyExpenses, ...Object.fromEntries(assumptions.opex.map(o => [o.category, o.amount])), Total: totalMonthlyOpex });
        details.capex.push({ Month: month, CAPEX: capexCost });
        details.depreciation.push({ Month: month, Depreciation: monthlyDepreciation });

        lastMonthRevenue = revenue;
        lastCash = currentCash;
        lastFixedAssets = currentFixedAssets;
        lastRetainedEarnings = currentRetainedEarnings;
    }

    return { assumptions, incomeStatement, cashFlowStatement, balanceSheet, details };
}

export async function exportProjectionToExcel(projection: ProjectionResults): Promise<string> {
    const wb = xlsx.utils.book_new();

    const styleSheet = (ws: xlsx.WorkSheet, data: any[], isAOA = false) => {
        if (!ws['!ref'] || !data || data.length === 0) return;

        const headers = isAOA ? data[0] : Object.keys(data[0] || {});
        if (headers.length > 0) {
            const colWidths = headers.map((header: any, i: number) => {
                const dataForCol = isAOA
                    ? data.map(row => row[i])
                    : data.map(row => row[headers[i] as keyof typeof row]);

                const maxLength = Math.max(
                    (headers[i] || '').toString().length,
                    ...dataForCol.map(cell => (cell || '').toString().length)
                );
                return { wch: maxLength + 4 };
            });
            ws['!cols'] = colWidths;
        }

        const range = xlsx.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cell_address = { c: C, r: R };
                const cell_ref = xlsx.utils.encode_cell(cell_address);
                if (!ws[cell_ref]) continue;

                const defaultStyle = {
                    alignment: {
                        horizontal: 'center',
                        vertical: 'center',
                        wrapText: true,
                    },
                    border: {
                        top: { style: 'thin', color: { rgb: "DDDDDD" } },
                        bottom: { style: 'thin', color: { rgb: "DDDDDD" } },
                        left: { style: 'thin', color: { rgb: "DDDDDD" } },
                        right: { style: 'thin', color: { rgb: "DDDDDD" } },
                    }
                };
                
                if (R === 0) {
                    ws[cell_ref].s = {
                        ...defaultStyle,
                        font: { bold: true },
                        fill: { fgColor: { rgb: "E6E6FA" } } // Soft Lavender
                    };
                } else {
                    ws[cell_ref].s = defaultStyle;
                }
            }
        }
    };
    
    // Sheet 1: Assumptions
    const assumptionsData = [
        ['General Assumptions', ''],
        ['Projection Period', `${projection.assumptions.projectionPeriod} Months`],
        ['Monthly Revenue Growth', `${(projection.assumptions.revenueGrowth * 100).toFixed(2)}%`],
        ['Baseline COGS', `${(projection.assumptions.cogsPercentage * 100).toFixed(2)}% of Revenue`],
        ['Yearly COGS Inflation', `${(projection.assumptions.cogsInflation * 100).toFixed(2)}%`],
        ['', ''],
        ['Starting Balance Sheet', ''],
        ['Cash (Rp)', projection.assumptions.startingBalance.cash],
        ['Inventory (Rp)', projection.assumptions.startingBalance.inventory],
        ['Fixed Assets (Rp)', projection.assumptions.startingBalance.fixedAssets],
        ['Accounts Payable (Rp)', projection.assumptions.startingBalance.accountsPayable],
    ];
    const wsAssumptions = xlsx.utils.aoa_to_sheet(assumptionsData);
    styleSheet(wsAssumptions, assumptionsData, true);
    if (wsAssumptions['!cols']) {
        wsAssumptions['!cols'][0].wch = 30; // Widen first column for labels
        wsAssumptions['!cols'][1].wch = 20;
    }
     // Special styling for labels in first column of assumptions
    const range = xlsx.utils.decode_range(wsAssumptions['!ref']!);
    for (let R = range.s.r; R <= range.e.r; ++R) {
        const cell_ref = xlsx.utils.encode_cell({ c: 0, r: R });
        if (wsAssumptions[cell_ref]) {
             wsAssumptions[cell_ref].s = { ...wsAssumptions[cell_ref].s, alignment: { horizontal: 'left', vertical: 'center', wrapText: true}, font: { bold: true } };
        }
    }
    xlsx.utils.book_append_sheet(wb, wsAssumptions, 'Penjelasan Project');

    // Sheet 2: Revenue
    const wsRevenue = xlsx.utils.json_to_sheet(projection.details.revenue);
    styleSheet(wsRevenue, projection.details.revenue);
    xlsx.utils.book_append_sheet(wb, wsRevenue, 'Pendapatan');

    // Sheet 3: COGS
    const wsCogs = xlsx.utils.json_to_sheet(projection.details.cogs);
    styleSheet(wsCogs, projection.details.cogs);
    xlsx.utils.book_append_sheet(wb, wsCogs, 'HPP');
    
    // Sheet 4: OPEX
    const wsOpex = xlsx.utils.json_to_sheet(projection.details.opex);
    styleSheet(wsOpex, projection.details.opex);
    xlsx.utils.book_append_sheet(wb, wsOpex, 'OPEX');

    // Sheet 5: CAPEX
    const wsCapex = xlsx.utils.json_to_sheet(projection.details.capex);
    styleSheet(wsCapex, projection.details.capex);
    xlsx.utils.book_append_sheet(wb, wsCapex, 'CAPEX');
    
    // Sheet 6: Depreciation
    const wsDepreciation = xlsx.utils.json_to_sheet(projection.details.depreciation);
    styleSheet(wsDepreciation, projection.details.depreciation);
    xlsx.utils.book_append_sheet(wb, wsDepreciation, 'Depresiasi');
    
    // Sheet 7: Cash Flow
    const cashflowData = projection.cashFlowStatement.map(r => ({
        Month: r.month,
        "Net Income": r.netIncome,
        "Depreciation": r.depreciation,
        "CAPEX": r.capex,
        "Net Cash Flow": r.netCashFlow,
        "Ending Cash": r.endingCashBalance,
    }));
    const wsCashflow = xlsx.utils.json_to_sheet(cashflowData);
    styleSheet(wsCashflow, cashflowData);
    xlsx.utils.book_append_sheet(wb, wsCashflow, 'CASHFLOW');

    // Sheet 8: Balance Sheet
    const bs = projection.balanceSheet;
    const balanceSheetJsonData: any[] = [];
    const months = bs.assets.map(a => a.month);
    
    const items: Record<string, (month: number) => number | undefined | string> = {
        'ASSETS': () => '',
        'Cash': (m) => bs.assets.find(d => d.month === m)?.value,
        'Inventory': (m) => bs.inventory.find(d => d.month === m)?.value,
        'Fixed Assets, Net': (m) => bs.fixedAssets.find(d => d.month === m)?.value,
        'Total Assets': (m) => bs.totalAssets.find(d => d.month === m)?.value,
        'LIABILITIES & EQUITY': () => '',
        'Accounts Payable': (m) => bs.accountsPayable.find(d => d.month === m)?.value,
        'Total Liabilities': (m) => bs.totalLiabilities.find(d => d.month === m)?.value,
        'Retained Earnings': (m) => bs.retainedEarnings.find(d => d.month === m)?.value,
        'Total Equity': (m) => bs.totalEquity.find(d => d.month === m)?.value,
        'Total Liabilities & Equity': (m) => bs.totalLiabilitiesAndEquity.find(d => d.month === m)?.value,
    };
    
    Object.keys(items).forEach(item => {
        const row: any = { Item: item };
        months.forEach(m => {
            row[`Month ${m}`] = items[item](m);
        });
        balanceSheetJsonData.push(row);
    });

    const wsBalanceSheet = xlsx.utils.json_to_sheet(balanceSheetJsonData);
    styleSheet(wsBalanceSheet, balanceSheetJsonData);
    if(wsBalanceSheet['!cols']) wsBalanceSheet['!cols'][0].wch = 30; // Widen first column
    xlsx.utils.book_append_sheet(wb, wsBalanceSheet, 'AKI');
    
    const wbout = xlsx.write(wb, { bookType: 'xlsx', type: 'base64' });
    return wbout;
}

export async function generateAiProjection(): Promise<AiProjectionOutput> {
    try {
        const ninetyDaysAgo = subDays(new Date(), 90);
        
        const salesQuery = query(collection(db, 'orders'), where('timestamp', '>=', ninetyDaysAgo));
        const inventoryQuery = query(collection(db, 'inventory'));
        const menuItemsQuery = query(collection(db, 'menuItems'));
        const expensesQuery = query(collection(db, 'expenses'), where('expenseDate', '>=', ninetyDaysAgo));
        
        const [salesSnapshot, inventorySnapshot, menuItemsSnapshot, expensesSnapshot] = await Promise.all([
            getDocs(salesQuery),
            getDocs(inventoryQuery),
            getDocs(menuItemsQuery),
            getDocs(expensesQuery),
        ]);

        const historicalSales = salesSnapshot.docs.map(doc => {
            const order = doc.data();
            return {
                date: (order.timestamp as Timestamp).toDate().toISOString().split('T')[0],
                revenue: order.grossRevenue,
                profit: order.totalProfit,
            };
        });
        
        const inventoryLevels = inventorySnapshot.docs.map(doc => ({ ...doc.data() }));
        const menuItems = menuItemsSnapshot.docs.map(doc => ({ ...doc.data() }));

        const historicalExpenses = expensesSnapshot.docs.map(doc => {
            const expense = doc.data();
            return {
                date: (expense.expenseDate as Timestamp).toDate().toISOString().split('T')[0],
                category: expense.category,
                amount: expense.amount
            }
        });

        if (historicalSales.length === 0) {
            throw new Error("Not enough historical sales data to generate a projection. At least one sale in the last 90 days is required.");
        }

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

    const ordersQuery = query(collection(db, 'orders'), where('timestamp', '>=', start), where('timestamp', '<=', end));
    const expensesQuery = query(collection(db, 'expenses'), where('expenseDate', '>=', start), where('expenseDate', '<=', end));
    const assetsQuery = query(collection(db, 'assets'));

    const [ordersSnapshot, expensesSnapshot, assetsSnapshot] = await Promise.all([
        getDocs(ordersQuery),
        getDocs(expensesQuery),
        getDocs(assetsQuery),
    ]);

    // 1. P&L - Revenue & COGS
    let revenue = 0;
    let cogs = 0;
    ordersSnapshot.forEach(doc => {
        const order = doc.data();
        revenue += order.grossRevenue || 0;
        cogs += order.totalCost || 0;
    });
    const grossProfit = revenue - cogs;

    // 2. P&L - Expenses
    const categorizedExpenses: Record<string, number> = {};
    let totalExpenses = 0;
    expensesSnapshot.forEach(doc => {
        const expense = doc.data();
        categorizedExpenses[expense.category] = (categorizedExpenses[expense.category] || 0) + expense.amount;
        totalExpenses += expense.amount;
    });
    const expenses = Object.entries(categorizedExpenses).map(([category, total]) => ({ category, total }));

    // 3. P&L - Depreciation
    let depreciation = 0;
    const periodMonths = differenceInMonths(end, start) + 1;
    assetsSnapshot.forEach(doc => {
        const asset = doc.data();
        if (asset.purchaseDate && asset.price && asset.usefulLife) {
            const purchaseDate = (asset.purchaseDate as Timestamp).toDate();
            if (purchaseDate <= end) {
                const monthlyDepreciation = asset.price / (asset.usefulLife * 12);
                depreciation += monthlyDepreciation * periodMonths;
            }
        }
    });

    // 4. P&L - Final Calculations
    const operatingIncome = grossProfit - totalExpenses - depreciation;
    const taxes = 0; // Assuming no taxes for simplicity
    const netIncome = operatingIncome - taxes;

    // 5. Cash Flow - Simplified
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
