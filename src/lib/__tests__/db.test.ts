import { describe, it, expect, beforeEach, vi } from 'vitest';

// In-memory localStorage mock
const localStore = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => localStore.get(key) || null,
  setItem: (key: string, val: string) => localStore.set(key, val),
  removeItem: (key: string) => localStore.delete(key),
  clear: () => localStore.clear(),
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

// Mock supabase module
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    from: vi.fn(),
  },
  isSupabaseConfigured: vi.fn(() => true),
}));

import { withFallback, mutateWithLocalSync, getPendingMutations, enqueuePendingMutation, dequeuePendingMutation } from '../db';
import { isSupabaseConfigured } from '@/lib/supabase';

describe('Database Layer Helpers (src/lib/db.ts)', () => {
  beforeEach(() => {
    localStore.clear();
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
  });

  describe('withFallback', () => {
    it('returns data from Supabase and caches it to localStorage when query succeeds', async () => {
      const mockDbData = [{ id: '1', name: 'Roti Cokelat' }];
      const fetchFn = vi.fn().mockResolvedValue({ data: mockDbData, error: null });

      const result = await withFallback(fetchFn, 'rotikita_menu');

      expect(result).toEqual(mockDbData);
      expect(JSON.parse(localStore.get('rotikita_menu') || '[]')).toEqual(mockDbData);
    });

    it('falls back to localStorage when Supabase throws an error', async () => {
      const cachedData = [{ id: '2', name: 'Roti Keju Offline' }];
      localStore.set('rotikita_menu', JSON.stringify(cachedData));

      const fetchFn = vi.fn().mockRejectedValue(new Error('Network error'));
      const result = await withFallback(fetchFn, 'rotikita_menu');

      expect(result).toEqual(cachedData);
    });

    it('returns localStorage data when Supabase is unconfigured', async () => {
      vi.mocked(isSupabaseConfigured).mockReturnValue(false);
      const cachedData = [{ id: '3', name: 'Roti Tawar' }];
      localStore.set('rotikita_menu', JSON.stringify(cachedData));

      const fetchFn = vi.fn();
      const result = await withFallback(fetchFn, 'rotikita_menu');

      expect(fetchFn).not.toHaveBeenCalled();
      expect(result).toEqual(cachedData);
    });

    it('returns fallbackDefault when both Supabase and localStorage are empty', async () => {
      const defaultItems = [{ id: 'def-1', name: 'Default Item' }];
      const fetchFn = vi.fn().mockResolvedValue({ data: [], error: null });

      const result = await withFallback(fetchFn, 'rotikita_menu', {
        fallbackDefault: defaultItems,
      });

      expect(result).toEqual(defaultItems);
    });
  });

  describe('mutateWithLocalSync', () => {
    it('optimistically writes to localStorage even in offline demo mode', async () => {
      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null });

      const items = [{ id: '10', name: 'New Item' }];
      const result = await mutateWithLocalSync('rotikita_menu', items);

      expect(result.ok).toBe(true);
      expect(JSON.parse(localStore.get('rotikita_menu') || '[]')).toEqual(items);
    });

    it('enqueues pending mutation when Supabase mutation fails', async () => {
      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { user: { id: 'usr-1' } } as any },
        error: null,
      });

      const mutationFn = vi.fn().mockRejectedValue(new Error('Connection dropped'));
      const items = [{ id: '20', name: 'Failed Remote Item' }];

      const result = await mutateWithLocalSync('rotikita_inventory', items, mutationFn);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Connection dropped');

      const pending = getPendingMutations();
      expect(pending.length).toBe(1);
      expect(pending[0].localKey).toBe('rotikita_inventory');
    });
  });

  describe('Pending Mutations Queue Management', () => {
    it('enqueues and dequeues pending mutations correctly', () => {
      enqueuePendingMutation({ localKey: 'rotikita_orders', payload: { test: true }, lastError: 'Timeout' });
      let pending = getPendingMutations();
      expect(pending.length).toBe(1);

      const id = pending[0].id;
      dequeuePendingMutation(id);
      pending = getPendingMutations();
      expect(pending.length).toBe(0);
    });
  });
});
