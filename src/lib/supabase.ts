import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabaseBucketName = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME;

if (!supabaseUrl || !supabaseAnonKey || !supabaseBucketName) {
  throw new Error('Supabase URL, Anon Key, and Bucket Name must be provided in environment variables.');
}

export const supabase = createBrowserClient(
    supabaseUrl!,
    supabaseAnonKey!
);
