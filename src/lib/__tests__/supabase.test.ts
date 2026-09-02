import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Supabase Client Configuration (src/lib/supabase.ts)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  it('identifies placeholder / dummy credentials and defaults to fallback mode', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';

    const { isSupabaseConfigured, supabase } = await import('../supabase');

    expect(isSupabaseConfigured()).toBe(false);
    expect(supabase).toBeDefined();
    expect(typeof supabase.from).toBe('function');
  });

  it('identifies valid production credentials correctly', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://qdrjunkvjtfiugzjbddl.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcmp1bmt2anRmaXVnempiZGRsIn0.valid_long_anon_token_secret_1234567890';

    const { isSupabaseConfigured } = await import('../supabase');

    expect(isSupabaseConfigured()).toBe(true);
  });

  it('constructs without throwing even if environment variables are completely empty', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let importedModule: any = null;
    expect(() => {
      importedModule = import('../supabase');
    }).not.toThrow();

    const { isSupabaseConfigured, supabase } = await importedModule;
    expect(isSupabaseConfigured()).toBe(false);
    expect(supabase).toBeDefined();
  });
});
