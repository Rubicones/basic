import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/**
 * Browser client. Anon key only, so every read and write is subject to RLS —
 * which is where the access rules belong, not in the component that calls this.
 */
export function createClient() {
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
