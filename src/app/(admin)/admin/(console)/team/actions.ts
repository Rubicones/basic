"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export type InviteState = { error?: string; invited?: string; note?: string };

const DEMO_RESULT = "Demo mode: nothing was saved.";

/**
 * Inviting is two steps in two different clients, and the split is the point.
 *
 * The *caller's* client answers "may you do this" — `is_admin()`, under RLS, as
 * them. Only then does the service-role client carry it out, because creating an
 * auth user is not something a policy can grant: there is no row to write and no
 * session that owns it. The privileged client never decides anything.
 *
 * An address that already has an account is not an error: the invite fails, and
 * the row in `admins` is what actually grants access, so it is written anyway and
 * the person signs in the ordinary way.
 */
export async function inviteAdmin(
  _previous: InviteState,
  formData: FormData,
): Promise<InviteState> {
  if (env.consoleDemo) return { note: DEMO_RESULT };

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email.includes("@")) {
    return { error: "That does not look like an email address." };
  }

  const guard = await requireAdmin();
  if (guard) return guard;

  let admin;
  try {
    admin = createAdminClient();
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : "Invites are not configured." };
  }

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${await currentOrigin()}/admin/auth/callback`,
  });

  let userId = invited?.user?.id ?? null;

  if (!userId) {
    // Already has an account — find it rather than treating it as a failure.
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    userId = list?.users.find((user) => user.email?.toLowerCase() === email)?.id ?? null;
  }

  if (!userId) {
    return {
      error:
        inviteError?.message ??
        "The invitation could not be sent and no existing account matches that address.",
    };
  }

  const { error: rowError } = await admin
    .from("admins")
    .upsert({ user_id: userId, email }, { onConflict: "user_id" });

  if (rowError) return { error: rowError.message };

  revalidatePath("/admin/team");
  return {
    invited: email,
    ...(inviteError
      ? { note: "That address already had an account, so no invitation was sent." }
      : {}),
  };
}

/**
 * Revoking is a delete from `admins`, not from `auth.users`.
 *
 * The row is what grants access, so removing it is enough — and it leaves the
 * person's own account, and anything attributed to it, intact.
 */
export async function revokeAdmin(formData: FormData): Promise<void> {
  if (env.consoleDemo) return;

  const userId = String(formData.get("user_id") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: allowed } = await supabase.rpc("is_admin");
  if (!allowed) return;

  // Locking yourself out of the console is not a thing a button should do.
  if (user.id === userId) return;

  const admin = createAdminClient();
  await admin.from("admins").delete().eq("user_id", userId);

  revalidatePath("/admin/team");
}

async function requireAdmin(): Promise<InviteState | null> {
  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("is_admin");
  return allowed ? null : { error: "Only an administrator can invite another one." };
}

async function currentOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) return env.siteUrl;
  const protocol =
    headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}
