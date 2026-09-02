import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export interface MutationResult<T = any> {
  ok: boolean;
  error?: string;
  data?: T;
}

export interface PendingMutation {
  id: string;
  localKey: string;
  payload: any;
  attempts: number;
  lastError?: string;
  createdAt: string;
}

const PENDING_MUTATIONS_KEY = 'rotikita_pending_mutations';
const MAX_PENDING_MUTATIONS = 50;

/**
 * Reads pending mutations queue from localStorage
 */
export function getPendingMutations(): PendingMutation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PENDING_MUTATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Adds a failed mutation to the pending mutations queue (FIFO, max 50)
 */
export function enqueuePendingMutation(entry: Omit<PendingMutation, 'id' | 'attempts' | 'createdAt'>): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getPendingMutations();
    const newEntry: PendingMutation = {
      ...entry,
      id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      attempts: 1,
      createdAt: new Date().toISOString(),
    };
    const updated = [newEntry, ...existing].slice(0, MAX_PENDING_MUTATIONS);
    localStorage.setItem(PENDING_MUTATIONS_KEY, JSON.stringify(updated));
  } catch (err) {
    logger.warn('Gagal menyimpan pending mutation ke localStorage', { key: entry.localKey }, err);
  }
}

/**
 * Removes a pending mutation by ID
 */
export function dequeuePendingMutation(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getPendingMutations();
    const updated = existing.filter(m => m.id !== id);
    localStorage.setItem(PENDING_MUTATIONS_KEY, JSON.stringify(updated));
  } catch (err) {
    logger.warn('Gagal menghapus pending mutation', { id }, err);
  }
}

/**
 * Retries a specific local mutation manually
 */
export async function retryLocalMutation(
  localKey: string,
  mutationFn: () => PromiseLike<any> | Promise<any> | any
): Promise<MutationResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Koneksi database belum dikonfigurasi.' };
  }

  try {
    const res = await mutationFn();
    if (res && typeof res === 'object' && 'error' in res && res.error) {
      return { ok: false, error: res.error.message || 'Database mutation returned error' };
    }
    return { ok: true, data: res?.data };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Database offline' };
  }
}

/**
 * Executes a Supabase fetch query with automatic localStorage fallback and synchronization.
 */
export async function withFallback<T>(
  fetchFn: () => PromiseLike<any> | Promise<any> | any,
  localKey: string,
  options?: {
    fallbackDefault?: T[];
    transform?: (data: any[]) => T[];
  }
): Promise<T[]> {
  const fallbackDefault = options?.fallbackDefault || [];

  if (isSupabaseConfigured()) {
    try {
      const result = await fetchFn();
      let rawData: any[] | null = null;

      if (result && typeof result === 'object' && 'data' in result) {
        if (!result.error && Array.isArray(result.data) && result.data.length > 0) {
          rawData = result.data;
        }
      } else if (Array.isArray(result) && result.length > 0) {
        rawData = result;
      }

      if (rawData && rawData.length > 0) {
        const parsed = options?.transform ? options.transform(rawData) : (rawData as T[]);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(localKey, JSON.stringify(parsed));
          } catch (storageErr) {
            logger.warn(`Gagal memperbarui cache lokal untuk ${localKey}`, { key: localKey }, storageErr);
          }
        }
        return parsed;
      }
    } catch (err) {
      logger.debug(`Koneksi database offline untuk ${localKey}, menggunakan cache lokal`, { key: localKey });
    }
  }

  // Fallback to localStorage
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(localKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return options?.transform ? options.transform(parsed) : (parsed as T[]);
        }
      }
    } catch (cacheErr) {
      logger.warn(`Gagal membaca ${localKey} dari penyimpanan lokal`, { key: localKey }, cacheErr);
    }
  }

  return fallbackDefault;
}

/**
 * Optimistically updates localStorage with the new state, and executes a database mutation.
 * For authenticated users: executes Supabase mutation with JWT.
 * For unauthenticated / demo users: stores locally without erroring.
 * Returns { ok: boolean, error?: string, data?: any } without silently hiding real errors.
 */
export async function mutateWithLocalSync<T>(
  localKey: string,
  updatedItems: T[],
  mutationFn?: () => PromiseLike<any> | Promise<any> | any
): Promise<MutationResult> {
  // 1. Optimistic write to localStorage (instant UX)
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(localKey, JSON.stringify(updatedItems));
    } catch (e) {
      logger.warn(`Gagal memperbarui cache lokal untuk ${localKey}`, { key: localKey }, e);
    }
  }

  // 2. Execute DB mutation if Supabase is configured and mutation function provided
  if (mutationFn && isSupabaseConfigured()) {
    try {
      // Check if user has an active authenticated Supabase session
      let hasSession = false;
      try {
        const sessionRes = await supabase.auth.getSession();
        hasSession = Boolean(sessionRes?.data?.session?.user);
      } catch {
        hasSession = false;
      }

      // If unauthenticated / demo mode: safely keep local-only state
      if (!hasSession) {
        return { ok: true, data: { mode: 'offline_local_demo' } };
      }

      // Authenticated session: execute remote mutation
      const res = await mutationFn();
      if (res && typeof res === 'object' && 'error' in res && res.error) {
        const errorMsg = res.error.message || 'Gagal menyimpan data ke database server.';
        logger.warn(`Database mutation error untuk ${localKey}`, { key: localKey, error: res.error });
        enqueuePendingMutation({ localKey, payload: updatedItems, lastError: errorMsg });
        return { ok: false, error: errorMsg };
      }
      return { ok: true, data: res?.data };
    } catch (e: any) {
      const errorMsg = e?.message || 'Koneksi database offline / tertunda.';
      logger.warn(`Database mutation offline / tertunda untuk ${localKey}`, { key: localKey }, e);
      enqueuePendingMutation({ localKey, payload: updatedItems, lastError: errorMsg });
      return { ok: false, error: errorMsg };
    }
  }

  return { ok: true };
}

export const saveWithLocalSync = mutateWithLocalSync;

