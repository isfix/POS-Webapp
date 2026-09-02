import { describe, it, expect, beforeEach, vi } from 'vitest';

const localStore = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => localStore.get(key) || null,
  setItem: (key: string, val: string) => localStore.set(key, val),
  removeItem: (key: string) => localStore.delete(key),
  clear: () => localStore.clear(),
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    from: vi.fn(),
  },
  isSupabaseConfigured: vi.fn(() => true),
}));

import {
  getPendingOrders,
  enqueuePendingOrder,
  dequeuePendingOrder,
  drainPendingOrders,
} from '../order-queue';
import { supabase } from '@/lib/supabase';

describe('Order Queue & Offline Draining (src/lib/order-queue.ts)', () => {
  beforeEach(() => {
    localStore.clear();
    vi.restoreAllMocks();
  });

  it('enqueues an order to rotikita_pending_orders', () => {
    const testOrder = { id: 'ord-101', total: 35000, items: [] };
    enqueuePendingOrder(testOrder);

    const pending = getPendingOrders();
    expect(pending.length).toBe(1);
    expect(pending[0].id).toBe('ord-101');
    expect(pending[0].order.total).toBe(35000);
  });

  it('dequeues an order by id from rotikita_pending_orders', () => {
    enqueuePendingOrder({ id: 'ord-201', total: 10000 });
    enqueuePendingOrder({ id: 'ord-202', total: 20000 });

    expect(getPendingOrders().length).toBe(2);
    dequeuePendingOrder('ord-201');

    const remaining = getPendingOrders();
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe('ord-202');
  });

  it('does NOT drain orders when user is not authenticated (auth guard)', async () => {
    enqueuePendingOrder({ id: 'ord-301', total: 15000 });
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null });

    const result = await drainPendingOrders();

    expect(result.synced).toBe(0);
    expect(result.remaining).toBe(1);
    expect(getPendingOrders().length).toBe(1);
  });

  it('drains orders and removes synced items when authenticated', async () => {
    enqueuePendingOrder({
      id: 'ord-401',
      items: [{ id: '1', name: 'Roti' }],
      gross_revenue: 15000,
      total_cost: 8000,
      total_profit: 7000,
      total: 15000,
      payment_method: 'Tunai',
    });

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'auth-user-1' } } as any },
      error: null,
    });

    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({ insert: mockInsert } as any);

    const result = await drainPendingOrders();

    expect(result.synced).toBe(1);
    expect(result.remaining).toBe(0);
    expect(getPendingOrders().length).toBe(0);
  });

  it('retains failed orders and increments attempt counter on server error', async () => {
    enqueuePendingOrder({
      id: 'ord-501',
      items: [],
      gross_revenue: 20000,
      total_cost: 10000,
      total_profit: 10000,
      total: 20000,
      payment_method: 'QRIS',
    });

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'auth-user-1' } } as any },
      error: null,
    });

    const mockInsert = vi.fn().mockResolvedValue({ error: { message: '500 Internal Server Error' } });
    vi.mocked(supabase.from).mockReturnValue({ insert: mockInsert } as any);

    const result = await drainPendingOrders();

    expect(result.synced).toBe(0);
    expect(result.remaining).toBe(1);

    const pending = getPendingOrders();
    expect(pending.length).toBe(1);
    expect(pending[0].attempts).toBe(1);
    expect(pending[0].lastError).toBe('500 Internal Server Error');
  });
});
