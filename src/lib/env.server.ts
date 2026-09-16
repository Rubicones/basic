import "server-only";

/**
 * Server-only environment. Importing this from a client component is a build
 * error, which is the point — the service role key bypasses RLS.
 */
export const serverEnv = {
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
} as const;
