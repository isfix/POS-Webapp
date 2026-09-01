import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qdrjunkvjtfiugzjbddl.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy";
export const supabaseBucketName = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME || "assets";

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
  return (
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
    !supabaseAnonKey.includes("dummy")
  );
};

/**
 * Checks live database connection status safely
 */
export const checkDatabaseHealth = async (): Promise<{ ok: boolean; message: string; latencyMs?: number }> => {
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
