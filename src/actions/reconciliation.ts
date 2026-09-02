/**
 * Cash Reconciliation & End-of-Day Shift Close Action Module
 * Supports physical cash count, variance calculation, shift state transitions,
 * and optimistic localStorage synchronization with audit logging.
 */

import { supabase } from '@/lib/supabase';
import { withFallback, mutateWithLocalSync } from '@/lib/db';
import { recordAudit } from '@/actions/audit';
import { format, startOfDay, endOfDay } from 'date-fns';
import { parseSafeDate } from '@/lib/utils';

export type ReconciliationStatus = 'open' | 'counted' | 'closed' | 'discrepancy';

export type CashReconciliation = {
  id: string;
  date: string; // YYYY-MM-DD
  opened_by?: string;
  closed_by?: string;
  opened_at?: string;
  closed_at?: string;
  opening_float: number; // uang modal kasir awal di laci
  expected_cash: number; // total uang fisik yang seharusnya ada (modal awal + omzet tunai)
  counted_cash?: number | null; // uang fisik yang dihitung secara manual
  variance?: number | null; // counted_cash - expected_cash
  notes?: string;
  cash_sales: number; // total penjualan tunai dari orders
  qris_sales: number; // total penjualan non-tunai / QRIS dari orders
  total_orders: number; // total pesanan
  status: ReconciliationStatus;
  created_at?: string;
  updated_at?: string;
};

export const RECONCILIATION_LOCAL_KEY = 'rotikita_cash_reconciliations';

/**
 * Computes expected cash and sales totals for a specific date from the orders table.
 */
export async function computeExpectedCash(date: Date): Promise<{
  cashSales: number;
  qrisSales: number;
  totalOrders: number;
}> {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  // Fetch orders for this day using withFallback
  const orders = await withFallback<any>(
    () =>
      supabase
        .from('orders')
        .select('*')
        .gte('created_at', dayStart.toISOString())
        .lte('created_at', dayEnd.toISOString()),
    'rotikita_orders',
    {
      fallbackDefault: [],
      transform: (data) =>
        data.filter((item: any) => {
          const itemDate = parseSafeDate(item.created_at || item.timestamp);
          return itemDate >= dayStart && itemDate <= dayEnd;
        }),
    }
  );

  let cashSales = 0;
  let qrisSales = 0;

  for (const order of orders) {
    const totalAmount = Number(order.gross_revenue || order.total || 0);
    const method = (order.payment_method || '').toLowerCase();

    if (method === 'tunai' || method === 'cash') {
      cashSales += totalAmount;
    } else {
      qrisSales += totalAmount;
    }
  }

  return {
    cashSales,
    qrisSales,
    totalOrders: orders.length,
  };
}

/**
 * Opens a cash reconciliation record for the given date (Buka Shift Kasir).
 */
export async function openCashReconciliation(
  date: Date,
  openedBy: string = 'Staf Kasir',
  openingFloat: number = 0
): Promise<CashReconciliation> {
  const dateStr = format(date, 'yyyy-MM-dd');
  const { cashSales, qrisSales, totalOrders } = await computeExpectedCash(date);
  const expectedCash = openingFloat + cashSales;

  const existing = await getReconciliationForDate(date);
  const newRecord: CashReconciliation = {
    id: existing?.id || `recon-${dateStr}-${Date.now()}`,
    date: dateStr,
    opened_by: openedBy,
    closed_by: existing?.closed_by,
    opened_at: existing?.opened_at || new Date().toISOString(),
    closed_at: existing?.closed_at,
    opening_float: openingFloat,
    expected_cash: expectedCash,
    counted_cash: existing?.counted_cash ?? null,
    variance: existing?.variance ?? null,
    notes: existing?.notes || '',
    cash_sales: cashSales,
    qris_sales: qrisSales,
    total_orders: totalOrders,
    status: existing?.status === 'closed' ? 'closed' : 'open',
    created_at: existing?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const allReconciliations = await getRecentReconciliations(100);
  const updatedList = [
    newRecord,
    ...allReconciliations.filter((r) => r.date !== dateStr),
  ];

  await mutateWithLocalSync(RECONCILIATION_LOCAL_KEY, updatedList, () =>
    supabase.from('cash_reconciliations').upsert([
      {
        id: newRecord.id,
        date: newRecord.date,
        opened_by: newRecord.opened_by,
        closed_by: newRecord.closed_by,
        opened_at: newRecord.opened_at,
        closed_at: newRecord.closed_at,
        opening_float: newRecord.opening_float,
        expected_cash: newRecord.expected_cash,
        counted_cash: newRecord.counted_cash,
        variance: newRecord.variance,
        notes: newRecord.notes,
        cash_sales: newRecord.cash_sales,
        qris_sales: newRecord.qris_sales,
        total_orders: newRecord.total_orders,
        status: newRecord.status,
        created_at: newRecord.created_at,
        updated_at: newRecord.updated_at,
      },
    ], { onConflict: 'date' })
  );

  recordAudit({
    action: `Buka Shift Kasir (${dateStr}) - Modal Awal: Rp ${openingFloat.toLocaleString('id-ID')}`,
    entityType: 'reconciliation',
    entityId: newRecord.id,
    userName: openedBy,
    details: {
      date: dateStr,
      openingFloat,
      status: 'open',
    },
  });

  return newRecord;
}

/**
 * Records physical counted cash and finalizes shift closing (Tutup Shift Kasir).
 */
export async function recordCountedCash(
  date: Date,
  countedCash: number,
  closedBy: string = 'Staf Kasir',
  openingFloat?: number,
  notes?: string
): Promise<CashReconciliation> {
  const dateStr = format(date, 'yyyy-MM-dd');
  const existing = await getReconciliationForDate(date);
  const { cashSales, qrisSales, totalOrders } = await computeExpectedCash(date);

  const floatValue = openingFloat !== undefined ? openingFloat : (existing?.opening_float || 0);
  const expectedTotal = floatValue + cashSales;
  const variance = countedCash - expectedTotal;

  // Status determination
  const status: ReconciliationStatus = variance === 0 ? 'closed' : 'discrepancy';

  const updatedRecord: CashReconciliation = {
    id: existing?.id || `recon-${dateStr}-${Date.now()}`,
    date: dateStr,
    opened_by: existing?.opened_by || closedBy,
    closed_by: closedBy,
    opened_at: existing?.opened_at || new Date().toISOString(),
    closed_at: new Date().toISOString(),
    opening_float: floatValue,
    expected_cash: expectedTotal,
    counted_cash: countedCash,
    variance: variance,
    notes: notes || existing?.notes || (variance !== 0 ? `Selisih kasir ${variance > 0 ? 'lebih' : 'kurang'} Rp ${Math.abs(variance).toLocaleString('id-ID')}` : ''),
    cash_sales: cashSales,
    qris_sales: qrisSales,
    total_orders: totalOrders,
    status: status,
    created_at: existing?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const allReconciliations = await getRecentReconciliations(100);
  const updatedList = [
    updatedRecord,
    ...allReconciliations.filter((r) => r.date !== dateStr),
  ];

  await mutateWithLocalSync(RECONCILIATION_LOCAL_KEY, updatedList, () =>
    supabase.from('cash_reconciliations').upsert([
      {
        id: updatedRecord.id,
        date: updatedRecord.date,
        opened_by: updatedRecord.opened_by,
        closed_by: updatedRecord.closed_by,
        opened_at: updatedRecord.opened_at,
        closed_at: updatedRecord.closed_at,
        opening_float: updatedRecord.opening_float,
        expected_cash: updatedRecord.expected_cash,
        counted_cash: updatedRecord.counted_cash,
        variance: updatedRecord.variance,
        notes: updatedRecord.notes,
        cash_sales: updatedRecord.cash_sales,
        qris_sales: updatedRecord.qris_sales,
        total_orders: updatedRecord.total_orders,
        status: updatedRecord.status,
        created_at: updatedRecord.created_at,
        updated_at: updatedRecord.updated_at,
      },
    ], { onConflict: 'date' })
  );

  recordAudit({
    action: `Tutup Shift Kasir (${dateStr}) - Uang Dihitung: Rp ${countedCash.toLocaleString('id-ID')} (Selisih: Rp ${variance.toLocaleString('id-ID')})`,
    entityType: 'reconciliation',
    entityId: updatedRecord.id,
    userName: closedBy,
    details: {
      date: dateStr,
      openingFloat: floatValue,
      cashSales,
      expectedCash: expectedTotal,
      countedCash,
      variance,
      status,
      notes: updatedRecord.notes,
    },
  });

  return updatedRecord;
}

/**
 * Retrieves reconciliation record for a specific date.
 */
export async function getReconciliationForDate(date: Date): Promise<CashReconciliation | null> {
  const dateStr = format(date, 'yyyy-MM-dd');
  const list = await getRecentReconciliations(60);
  return list.find((r) => r.date === dateStr) || null;
}

/**
 * Retrieves recent cash reconciliation records.
 */
export async function getRecentReconciliations(limit: number = 30): Promise<CashReconciliation[]> {
  const records = await withFallback<CashReconciliation>(
    () =>
      supabase
        .from('cash_reconciliations')
        .select('*')
        .order('date', { ascending: false })
        .limit(limit),
    RECONCILIATION_LOCAL_KEY,
    {
      fallbackDefault: [],
      transform: (data) =>
        data.map((item: any) => ({
          id: item.id,
          date: item.date,
          opened_by: item.opened_by,
          closed_by: item.closed_by,
          opened_at: item.opened_at,
          closed_at: item.closed_at,
          opening_float: Number(item.opening_float || 0),
          expected_cash: Number(item.expected_cash || 0),
          counted_cash: item.counted_cash !== null && item.counted_cash !== undefined ? Number(item.counted_cash) : null,
          variance: item.variance !== null && item.variance !== undefined ? Number(item.variance) : null,
          notes: item.notes || '',
          cash_sales: Number(item.cash_sales || 0),
          qris_sales: Number(item.qris_sales || 0),
          total_orders: Number(item.total_orders || 0),
          status: item.status || 'open',
          created_at: item.created_at,
          updated_at: item.updated_at,
        })),
    }
  );

  return records.slice(0, limit);
}
