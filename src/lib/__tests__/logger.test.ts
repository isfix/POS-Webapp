import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logger, createStructuredLog } from '../logger';

describe('Structured Logger (src/lib/logger.ts)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('creates structured log with required metadata fields', () => {
    const log = createStructuredLog('info', 'Pesanan kasir berhasil diproses', { orderId: 'ord-123', total: 50000 });

    expect(log).toBeDefined();
    expect(log.app).toBe('rotikita-pos-webapp');
    expect(log.level).toBe('info');
    expect(log.message).toBe('Pesanan kasir berhasil diproses');
    expect(typeof log.timestamp).toBe('string');
    expect(new Date(log.timestamp).toISOString()).toBe(log.timestamp);
    expect(log.context).toEqual({ orderId: 'ord-123', total: 50000 });
  });

  it('generates and persists sessionId across logs within the same session', () => {
    const log1 = createStructuredLog('debug', 'First event');
    const log2 = createStructuredLog('info', 'Second event');

    expect(log1.sessionId).toBeDefined();
    expect(log2.sessionId).toBeDefined();
    expect(log1.sessionId).toBe(log2.sessionId);
    expect(sessionStorage.getItem('rotikita_session_id')).toBe(log1.sessionId);
  });

  it('correctly structures Error objects including name, message, and stack trace', () => {
    const testError = new Error('Koneksi timeout saat sinkronisasi');
    const log = createStructuredLog('error', 'Gagal memproses data', { table: 'orders' }, testError);

    expect(log.level).toBe('error');
    expect(log.message).toBe('Gagal memproses data');
    expect(log.error).toBeDefined();
    expect(log.error?.name).toBe('Error');
    expect(log.error?.message).toBe('Koneksi timeout saat sinkronisasi');
    expect(log.error?.stack).toContain('Error: Koneksi timeout saat sinkronisasi');
    expect(log.context).toEqual({ table: 'orders' });
  });

  it('serializes cleanly to valid JSON', () => {
    const log = createStructuredLog('warn', 'Stok bahan baku menipis', { item: 'Tepung Terigu', stock: 2 });
    const jsonString = JSON.stringify(log);
    const parsed = JSON.parse(jsonString);

    expect(parsed.app).toBe('rotikita-pos-webapp');
    expect(parsed.level).toBe('warn');
    expect(parsed.context.item).toBe('Tepung Terigu');
    expect(parsed.context.stock).toBe(2);
  });

  it('invokes logger methods without throwing exceptions', () => {
    const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => logger.debug('Debug message', { debugKey: 1 })).not.toThrow();
    expect(() => logger.info('Info message', { infoKey: 2 })).not.toThrow();
    expect(() => logger.warn('Warn message', { warnKey: 3 }, new Error('warning'))).not.toThrow();
    expect(() => logger.error('Error message', { errorKey: 4 }, new Error('error'))).not.toThrow();
  });
});
