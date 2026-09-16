import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

/**
 * The service-role client. It bypasses RLS, so it exists for exactly one job:
 * managing who may use the console.
 *
 * Creating an auth user is not something a policy can grant — there is no row to
 * write and no session that owns it — so it is the one operation that has to run
 * above RLS. Every caller checks `is_admin()` with the *requesting user's* own
 * client first; this client is never used to decide whether someone is allowed,
 * only to carry out what has already been allowed.
 *
 * `persistSession: false` because this client has no user and must never write a
 * session cookie into someone's browser.
 */
export function createAdminClient() {
  if (!serverEnv.supabaseServiceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set — inviting and revoking console access needs it.",
    );
  }

  return createSupabaseClient(env.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
