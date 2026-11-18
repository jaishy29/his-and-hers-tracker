import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** True when .env.local (or Vercel) has the Supabase address and public key. */
export const supabaseConfigured = Boolean(url && key && !url.includes("your-project-id"));

let client: SupabaseClient | null = null;

/** The browser's connection to Supabase (created once). */
export function supabase() {
  if (!supabaseConfigured) throw new Error("Supabase is not set up. Add the keys to .env.local.");
  client ??= createClient(url!, key!, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: "hh-auth" },
  });
  return client;
}
