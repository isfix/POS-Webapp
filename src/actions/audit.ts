import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export interface AuditEntry {
  id?: string;
  action: string;
  entityType?: 'menu_item' | 'inventory' | 'expense' | 'asset' | 'order' | 'reconciliation' | 'system';
  entityId?: string;
  details?: Record<string, any>;
  userName?: string;
  timestamp?: string;
}

const AUDIT_BUFFER: Array<{
  user_name: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: Record<string, any>;
}> = [];

let batchTimer: NodeJS.Timeout | null = null;
const BATCH_INTERVAL_MS = 1000;

/**
 * Flushes buffered audit logs to Supabase
 */
export async function flushAuditBuffer(): Promise<void> {
  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }

  if (AUDIT_BUFFER.length === 0 || !isSupabaseConfigured()) {
    return;
  }

  const batch = [...AUDIT_BUFFER];
  AUDIT_BUFFER.length = 0;

  try {
    const { error } = await supabase.from('activity_logs').insert(batch);
    if (error) {
      logger.warn('Gagal mencatat batch audit log ke Supabase', { count: batch.length }, error);
    }
  } catch (err: any) {
    logger.warn('Koneksi offline saat mengirim batch audit log', { count: batch.length }, err);
  }
}

export function clearAuditBufferForTesting(): void {
  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }
  AUDIT_BUFFER.length = 0;
}

/**
 * Records an audit log entry.
 * Instantly updates localStorage and flushes to Supabase via 1-second micro-batching.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  const userName = entry.userName || 'Staf Kasir';
  const timestamp = entry.timestamp || new Date().toISOString();
  const id = entry.id || `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const fullEntry = {
    id,
    user: userName,
    user_name: userName,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    details: entry.details || {},
    timestamp,
    created_at: timestamp,
  };

  // 1. Optimistic write to localStorage for instant UI display
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('rotikita_logs');
      const logs = saved ? JSON.parse(saved) : [];
      const updated = [fullEntry, ...logs].slice(0, 150);
      localStorage.setItem('rotikita_logs', JSON.stringify(updated));
    } catch (err) {
      logger.warn('Gagal menyimpan audit log ke localStorage', { id }, err);
    }
  }

  // 2. Log structured event
  logger.info(`[AUDIT] ${entry.action}`, {
    user: userName,
    entityType: entry.entityType,
    entityId: entry.entityId,
    details: entry.details,
  });

  // 3. Queue for Supabase micro-batching
  if (isSupabaseConfigured()) {
    AUDIT_BUFFER.push({
      user_name: userName,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      details: entry.details || {},
    });

    if (batchTimer) {
      clearTimeout(batchTimer);
    }

    batchTimer = setTimeout(() => {
      flushAuditBuffer();
    }, BATCH_INTERVAL_MS);
  }
}
