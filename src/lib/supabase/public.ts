import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * The reader the public site uses.
 *
 * Not the SSR client: that one exists to carry a session cookie, and reading a
 * cookie makes a page dynamic. Nothing on the site is per-visitor — the catalogue
 * is the same for everyone — so this is a plain anon client with no session at
 * all, and the pages built on it can be cached and revalidated.
 *
 * Still the anon key, so RLS is what decides what comes back: unpublished
 * products are invisible here for the same reason they are invisible in a browser.
 */
export function publicClient() {
  return createSupabaseClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/**
 * Whether there is a database to talk to at all.
 *
 * Written out literally rather than through `env`, because `env` throws on a
 * missing variable by design — that is what makes a misconfiguration loud. This
 * is the one place that wants to ask rather than insist: with no Supabase
 * configured the site falls back to the shipped fixture, which is what keeps
 * `npm run dev` working on a fresh clone and the design reviewable without a
 * database behind it.
 */
export function hasDatabase(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
