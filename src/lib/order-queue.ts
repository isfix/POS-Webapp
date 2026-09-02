import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export interface PendingOrder {
  id: string;
  order: any;
  attempts: number;
  lastError?: string;
  createdAt: string;
}

const PENDING_ORDERS_KEY = 'rotikita_pending_orders';
const MAX_PENDING_ORDERS = 100;

export function getPendingOrders(): PendingOrder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PENDING_ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function enqueuePendingOrder(order: any): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getPendingOrders();
    if (existing.some(p => p.id === order.id || p.order?.id === order.id)) {
      return;
    }
    const newEntry: PendingOrder = {
      id: order.id,
      order,
      attempts: 0,
      createdAt: new Date().toISOString(),
    };
    const updated = [newEntry, ...existing].slice(0, MAX_PENDING_ORDERS);
    localStorage.setItem(PENDING_ORDERS_KEY, JSON.stringify(updated));
    logger.debug('Order enqueued to offline queue', { orderId: order.id, queueSize: updated.length });
  } catch (err) {
    logger.warn('Gagal enqueue pending order', { orderId: order.id }, err);
  }
}

export function dequeuePendingOrder(orderId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getPendingOrders();
    const updated = existing.filter(p => p.id !== orderId && p.order?.id !== orderId);
    localStorage.setItem(PENDING_ORDERS_KEY, JSON.stringify(updated));
    logger.debug('Order dequeued from offline queue', { orderId, queueSize: updated.length });
  } catch (err) {
    logger.warn('Gagal dequeue pending order', { orderId }, err);
  }
}

let isDraining = false;

/**
 * Iterates through pending orders and syncs them to Supabase
 */
export async function drainPendingOrders(): Promise<{ synced: number; remaining: number }> {
  if (isDraining || typeof window === 'undefined') return { synced: 0, remaining: 0 };
  if (!isSupabaseConfigured()) return { synced: 0, remaining: getPendingOrders().length };

  // Only attempt server drain if user is authenticated with a real Supabase session
  try {
    const sessionRes = await supabase.auth.getSession();
    if (!sessionRes?.data?.session?.user) {
      return { synced: 0, remaining: getPendingOrders().length };
    }
  } catch {
    return { synced: 0, remaining: getPendingOrders().length };
  }

  isDraining = true;
  let synced = 0;

  try {
    const pending = getPendingOrders();
    if (pending.length === 0) {
      isDraining = false;
      return { synced: 0, remaining: 0 };
    }

    logger.info('Starting drain for pending offline orders', { count: pending.length });

    for (const item of pending) {
      try {
        const order = item.order;
        const { error } = await supabase.from('orders').insert([{
          id: order.id,
          items: order.items,
          gross_revenue: order.gross_revenue,
          total_cost: order.total_cost,
          total_profit: order.total_profit,
          total: order.total,
          payment_method: order.payment_method,
          cash_given: order.cash_given,
          change_due: order.change_due,
          customer_name: order.customer_name || 'Walk-in Customer',
          status: order.status || 'Completed',
          created_at: order.created_at || item.createdAt,
        }]);

        if (!error || error.code === '23505') {
          dequeuePendingOrder(item.id);
          synced++;
        } else {
          item.attempts += 1;
          item.lastError = error.message;
          logger.error('Failed to sync offline order', { orderId: item.id, error: error.message });
        }
      } catch (err: any) {
        item.attempts += 1;
        item.lastError = err?.message;
        logger.error('Exception syncing offline order', { orderId: item.id }, err);
      }
    }

    if (synced > 0) {
      logger.info('Successfully drained offline orders to server', { syncedCount: synced });
      window.dispatchEvent(new CustomEvent('rotikita:orders_synced', { detail: { count: synced } }));
    }

    // Persist updated attempts and lastError for any remaining failed orders
    const remainingOrders = getPendingOrders();
    if (remainingOrders.length > 0) {
      const updatedRemaining = remainingOrders.map(rem => {
        const matching = pending.find(p => p.id === rem.id);
        return matching || rem;
      });
      localStorage.setItem(PENDING_ORDERS_KEY, JSON.stringify(updatedRemaining));
    }
  } finally {
    isDraining = false;
  }

  return { synced, remaining: getPendingOrders().length };
}

/**
 * Attaches online event listener to auto-drain queue
 */
export function setupOrderQueueListeners(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => {
    drainPendingOrders();
  };

  window.addEventListener('online', handleOnline);
  return () => {
    window.removeEventListener('online', handleOnline);
  };
}
