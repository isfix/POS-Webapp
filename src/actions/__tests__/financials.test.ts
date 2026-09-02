import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockSelect = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
    })),
  },
  isSupabaseConfigured: vi.fn(() => true),
}));

vi.mock('@/actions/ai', () => ({
  runAutomatedFinancialProjection: vi.fn().mockResolvedValue({
    projectedRevenue: 0,
    projectedProfit: 0,
    confidenceScore: 90,
  }),
}));

import { generateFinancialStatements, generateFinancialProjection } from '../financials';

describe('Financial Calculation Logic (src/actions/financials.ts)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns exact zeros (no hardcoded numbers) when database has no orders or expenses', async () => {
    // Chain mock: .select().gte().lte()
    const lteMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const gteMock = vi.fn(() => ({ lte: lteMock }));
    mockSelect.mockReturnValue({ gte: gteMock, lte: lteMock, data: [] });

    const startDate = new Date('2026-01-01');
    const endDate = new Date('2026-01-31');

    const result = await generateFinancialStatements(startDate, endDate);

    expect(result.profitAndLoss.revenue).toBe(0);
    expect(result.profitAndLoss.cogs).toBe(0);
    expect(result.profitAndLoss.grossProfit).toBe(0);
    expect(result.profitAndLoss.totalExpenses).toBe(0);
    expect(result.profitAndLoss.netIncome).toBe(0);
    expect(result.cashFlow.cashFromOperations).toBe(0);
  });

  it('correctly calculates gross profit and net income when order records exist', async () => {
    const mockOrders = [
      { id: '1', gross_revenue: 100000, total_cost: 40000, total: 100000 },
      { id: '2', gross_revenue: 50000, total_cost: 20000, total: 50000 },
    ];
    const mockExpenses = [
      { id: 'e1', category: 'Operasional', amount: 30000 },
    ];

    const lteOrdersMock = vi.fn().mockResolvedValue({ data: mockOrders, error: null });
    const lteExpensesMock = vi.fn().mockResolvedValue({ data: mockExpenses, error: null });

    const { supabase } = await import('@/lib/supabase');
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'orders') {
        return {
          select: () => ({ gte: () => ({ lte: lteOrdersMock }) }),
        } as any;
      }
      if (table === 'expenses') {
        return {
          select: () => ({ gte: () => ({ lte: lteExpensesMock }) }),
        } as any;
      }
      return {
        select: () => Promise.resolve({ data: [] }),
      } as any;
    });

    const result = await generateFinancialStatements(new Date('2026-02-01'), new Date('2026-02-28'));

    expect(result.profitAndLoss.revenue).toBe(150000);
    expect(result.profitAndLoss.cogs).toBe(60000);
    expect(result.profitAndLoss.grossProfit).toBe(90000);
    expect(result.profitAndLoss.totalExpenses).toBe(30000);
    // operatingIncome = 90000 - 30000 = 60000; tax = 60000 * 0.005 = 300; netIncome = 59700
    expect(result.profitAndLoss.operatingIncome).toBe(60000);
    expect(result.profitAndLoss.taxes).toBe(300);
    expect(result.profitAndLoss.netIncome).toBe(59700);
  });

  it('runs financial projection without throwing when baseline assumptions are zero', async () => {
    const assumptions = {
      projectionPeriod: 3,
      revenueGrowth: 5,
      cogsPercentage: 40,
      cogsInflation: 2,
      startingBalance: { cash: 10000000, inventory: 5000000, fixedAssets: 20000000, accountsPayable: 0 },
      opex: [{ category: 'Gaji', amount: 2000000 }],
      capex: [],
    };

    const result = await generateFinancialProjection(assumptions);

    expect(result.incomeStatement.length).toBe(3);
    expect(result.cashFlowStatement.length).toBe(3);
    expect(result.details.revenue.length).toBe(3);
  });
});
