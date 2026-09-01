import { createClient } from "@supabase/supabase-js";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

const isPlaceholder = (val: string): boolean => {
  if (!val) return true;
  const lower = val.toLowerCase();
  return (
    lower.includes("your_") ||
    lower.includes("dummy") ||
    lower.includes("placeholder") ||
    lower.includes("example") ||
    val.length < 10
  );
};

const hasValidConfig = Boolean(rawUrl && rawAnonKey && !isPlaceholder(rawUrl) && !isPlaceholder(rawAnonKey));

// Safe fallback URL and Anon Key so createClient never throws on boot
const supabaseUrl = hasValidConfig ? rawUrl : "https://offline-fallback.supabase.co";
const supabaseAnonKey = hasValidConfig ? rawAnonKey : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.offline_mock_token";

export const supabaseBucketName = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME || "assets";

if (!hasValidConfig) {
  console.warn("⚠️ Supabase credentials tidak ditemukan atau belum dikonfigurasi. Menggunakan mode fallback offline.");
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

/**
 * Checks if real Supabase credentials are configured in environment
 */
export const isSupabaseConfigured = (): boolean => {
  return hasValidConfig;
};

/**
 * Checks live database connection status safely
 */
export const checkDatabaseHealth = async (): Promise<{ ok: boolean; message: string; latencyMs?: number }> => {
  if (!hasValidConfig) {
    return {
      ok: false,
      message: 'Supabase belum dikonfigurasi. Mode fallback offline aktif.',
      latencyMs: 0,
    };
  }

  const start = Date.now();
  try {
    const { error } = await supabase.from('menu_items').select('id').limit(1);
    const latency = Date.now() - start;
    if (error) {
      return { ok: false, message: error.message, latencyMs: latency };
    }
    return { ok: true, message: 'Database Supabase terhubung dengan baik.', latencyMs: latency };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Koneksi database offline / fallback aktif.', latencyMs: Date.now() - start };
  }
};
