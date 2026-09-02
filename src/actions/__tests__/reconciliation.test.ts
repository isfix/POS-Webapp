import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  computeExpectedCash,
  openCashReconciliation,
  recordCountedCash,
  getReconciliationForDate,
  getRecentReconciliations,
  RECONCILIATION_LOCAL_KEY,
} from '../reconciliation';

describe('Cash Reconciliation Module (src/actions/reconciliation.ts)', () => {
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  })();

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    localStorageMock.clear();
  });

  describe('computeExpectedCash', () => {
    it('returns 0 when there are no orders for the given date', async () => {
      const today = new Date('2026-09-02T12:00:00.000Z');
      const result = await computeExpectedCash(today);

      expect(result.cashSales).toBe(0);
      expect(result.qrisSales).toBe(0);
      expect(result.totalOrders).toBe(0);
    });

    it('sums only Tunai/cash orders into cashSales and separates QRIS into qrisSales', async () => {
      const today = new Date('2026-09-02T12:00:00.000Z');
      const mockOrders = [
        {
          id: 'ord-1',
          created_at: '2026-09-02T08:00:00.000Z',
          gross_revenue: 25000,
          payment_method: 'Tunai',
        },
        {
          id: 'ord-2',
          created_at: '2026-09-02T09:30:00.000Z',
          gross_revenue: 40000,
          payment_method: 'cash',
        },
        {
          id: 'ord-3',
          created_at: '2026-09-02T10:15:00.000Z',
          gross_revenue: 50000,
          payment_method: 'QRIS',
        },
        // Order from another date (should be ignored)
        {
          id: 'ord-yesterday',
          created_at: '2026-09-01T15:00:00.000Z',
          gross_revenue: 100000,
          payment_method: 'Tunai',
        },
      ];

      localStorageMock.setItem('rotikita_orders', JSON.stringify(mockOrders));

      const result = await computeExpectedCash(today);
      expect(result.cashSales).toBe(65000); // 25000 + 40000
      expect(result.qrisSales).toBe(50000);
      expect(result.totalOrders).toBe(3);
    });
  });

  describe('openCashReconciliation', () => {
    it('opens shift with initial opening float and calculated expected cash', async () => {
      const today = new Date('2026-09-02T07:00:00.000Z');
      const mockOrders = [
        {
          id: 'ord-1',
          created_at: '2026-09-02T08:00:00.000Z',
          gross_revenue: 30000,
          payment_method: 'Tunai',
        },
      ];
      localStorageMock.setItem('rotikita_orders', JSON.stringify(mockOrders));

      const record = await openCashReconciliation(today, 'Kasir Budi', 200000);

      expect(record.date).toBe('2026-09-02');
      expect(record.opened_by).toBe('Kasir Budi');
      expect(record.opening_float).toBe(200000);
      expect(record.cash_sales).toBe(30000);
      expect(record.expected_cash).toBe(230000); // 200000 + 30000
      expect(record.status).toBe('open');
      expect(record.counted_cash).toBeNull();
      expect(record.variance).toBeNull();
    });
  });

  describe('recordCountedCash', () => {
    it('closes shift with status closed when counted cash exactly matches expected cash', async () => {
      const today = new Date('2026-09-02T05:00:00.000Z');
      const mockOrders = [
        {
          id: 'ord-1',
          created_at: '2026-09-02T04:00:00.000Z',
          gross_revenue: 150000,
          payment_method: 'Tunai',
        },
      ];
      localStorageMock.setItem('rotikita_orders', JSON.stringify(mockOrders));

      // Open shift with Rp 100.000 modal awal
      await openCashReconciliation(today, 'Kasir Budi', 100000);

      // Expected total in drawer = 100.000 + 150.000 = 250.000
      // Manager counts exactly Rp 250.000
      const closedRecord = await recordCountedCash(today, 250000, 'Manager Siti');

      expect(closedRecord.expected_cash).toBe(250000);
      expect(closedRecord.counted_cash).toBe(250000);
      expect(closedRecord.variance).toBe(0);
      expect(closedRecord.status).toBe('closed');
      expect(closedRecord.closed_by).toBe('Manager Siti');
    });

    it('sets status to discrepancy when counted cash does not match expected cash', async () => {
      const today = new Date('2026-09-02T05:00:00.000Z');
      const mockOrders = [
        {
          id: 'ord-1',
          created_at: '2026-09-02T04:00:00.000Z',
          gross_revenue: 150000,
          payment_method: 'Tunai',
        },
      ];
      localStorageMock.setItem('rotikita_orders', JSON.stringify(mockOrders));

      await openCashReconciliation(today, 'Kasir Budi', 100000);

      // Expected is 250.000, but counted is 245.000 (Kurang Rp 5.000)
      const discrepancyRecord = await recordCountedCash(today, 245000, 'Manager Siti', 100000, 'Selisih Rp 5.000 uang receh');

      expect(discrepancyRecord.expected_cash).toBe(250000);
      expect(discrepancyRecord.counted_cash).toBe(245000);
      expect(discrepancyRecord.variance).toBe(-5000);
      expect(discrepancyRecord.status).toBe('discrepancy');
      expect(discrepancyRecord.notes).toContain('Selisih Rp 5.000');
    });
  });

  describe('getReconciliationForDate and getRecentReconciliations', () => {
    it('retrieves stored reconciliation records', async () => {
      const today = new Date('2026-09-02T12:00:00.000Z');
      await openCashReconciliation(today, 'Kasir Budi', 150000);

      const found = await getReconciliationForDate(today);
      expect(found).not.toBeNull();
      expect(found?.date).toBe('2026-09-02');
      expect(found?.opening_float).toBe(150000);

      const recent = await getRecentReconciliations(10);
      expect(recent.length).toBeGreaterThanOrEqual(1);
    });
  });
});
