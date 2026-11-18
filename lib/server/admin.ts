import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Who } from "../constants";

let admin: SupabaseClient | null = null;

/** Server-only connection with full access (uses the SECRET key). Never sent to the browser. */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key || key.includes("your-key")) throw new Error("SUPABASE_SECRET_KEY is missing from the settings");
  admin ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

/** Works out which side (his/hers) sent this request, from its login token. */
export async function sideFromRequest(req: Request): Promise<Who | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const db = supabaseAdmin();
  const { data: user } = await db.auth.getUser(token);
  if (!user.user) return null;
  const { data } = await db.from("people").select("side").eq("user_id", user.user.id).maybeSingle();
  return (data?.side as Who | undefined) ?? null;
}
