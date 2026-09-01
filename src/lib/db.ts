import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Executes a Supabase fetch query with automatic localStorage fallback and synchronization.
 * If Supabase is online and returns valid data:
 *   - Updates localStorage with the fresh data
 *   - Returns the parsed data
 * If Supabase is offline, unconfigured, or errors:
 *   - Reads cached data from localStorage
 *   - Returns cached data or fallbackDefault
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
            console.warn(`Gagal memperbarui cache lokal untuk ${localKey}:`, storageErr);
          }
        }
        return parsed;
      }
    } catch (err) {
      console.warn(`Koneksi database offline untuk ${localKey}, menggunakan cache lokal:`, err);
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
      console.warn(`Gagal membaca ${localKey} dari penyimpanan lokal:`, cacheErr);
    }
  }

  return fallbackDefault;
}

/**
 * Optimistically updates localStorage with the new state, and executes a database mutation in the background.
 * If the mutation fails or Supabase is offline, the local state remains safely persisted.
 */
export async function mutateWithLocalSync<T>(
  localKey: string,
  updatedItems: T[],
  mutationFn?: () => PromiseLike<any> | Promise<any> | any
): Promise<void> {
  // 1. Optimistic write to localStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(localKey, JSON.stringify(updatedItems));
    } catch (e) {
      console.warn(`Gagal memperbarui cache lokal untuk ${localKey}:`, e);
    }
  }

  // 2. Execute DB mutation if Supabase is configured and mutation function provided
  if (mutationFn && isSupabaseConfigured()) {
    try {
      const res = await mutationFn();
      if (res && typeof res === 'object' && 'error' in res && res.error) {
        console.warn(`Database mutation error untuk ${localKey}:`, res.error);
      }
    } catch (e) {
      console.warn(`Database mutation offline / tertunda untuk ${localKey}:`, e);
    }
  }
}

export const saveWithLocalSync = mutateWithLocalSync;

