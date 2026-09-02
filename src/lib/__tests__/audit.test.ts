import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const localStore = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => localStore.get(key) || null,
  setItem: (key: string, val: string) => localStore.set(key, val),
  removeItem: (key: string) => localStore.delete(key),
  clear: () => localStore.clear(),
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

const mockInsert = vi.fn().mockResolvedValue({ error: null });
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
  },
  isSupabaseConfigured: vi.fn(() => true),
}));

import { recordAudit, clearAuditBufferForTesting } from '@/actions/audit';

describe('Audit Trail Logger & Batching (src/actions/audit.ts)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearAuditBufferForTesting();
    localStore.clear();
    mockInsert.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('optimistically writes audit logs to localStorage immediately', async () => {
    await recordAudit({
      action: 'Menambah menu Roti Abon',
      entityType: 'menu_item',
      entityId: 'menu-1',
      details: { price: 15000 },
      userName: 'Staf Kasir',
    });

    const saved = JSON.parse(localStore.get('rotikita_logs') || '[]');
    expect(saved.length).toBe(1);
    expect(saved[0].action).toBe('Menambah menu Roti Abon');
    expect(saved[0].entity_type).toBe('menu_item');
    expect(saved[0].user_name).toBe('Staf Kasir');
  });

  it('coalesces multiple rapid audit calls into a single batch insert after 1 second', async () => {
    await recordAudit({ action: 'Aktivitas 1', entityType: 'system' });
    await recordAudit({ action: 'Aktivitas 2', entityType: 'system' });
    await recordAudit({ action: 'Aktivitas 3', entityType: 'system' });

    // Has not flushed yet before timer
    expect(mockInsert).not.toHaveBeenCalled();

    // Fast-forward 1000ms
    await vi.advanceTimersByTimeAsync(1000);

    expect(mockInsert).toHaveBeenCalledTimes(1);
    const batchArg = mockInsert.mock.calls[0][0];
    expect(batchArg.length).toBe(3);
    expect(batchArg[0].action).toBe('Aktivitas 1');
    expect(batchArg[1].action).toBe('Aktivitas 2');
    expect(batchArg[2].action).toBe('Aktivitas 3');
  });

  it('gracefully catches Supabase errors without throwing or disrupting caller', async () => {
    mockInsert.mockRejectedValue(new Error('Koneksi database offline'));

    await expect(
      recordAudit({ action: 'Aktivitas Berisiko', entityType: 'system' })
    ).resolves.not.toThrow();

    await vi.advanceTimersByTimeAsync(1000);
    // Still recorded in localStorage
    expect(JSON.parse(localStore.get('rotikita_logs') || '[]').length).toBe(1);
  });
});
