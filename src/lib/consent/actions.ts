"use server";

import { hasDatabase, publicClient } from "@/lib/supabase/public";
import { isLocale } from "@/lib/i18n/config";
import type { ConsentRecord } from "./config";

/**
 * The server-side copy of each decision — the proof of consent if anyone asks.
 * Anonymous: the id is random per browser, no IP, no user agent. Insert-only
 * for the public role (migration 0012); best effort, never blocks the choice.
 */
export async function logConsent(record: ConsentRecord): Promise<void> {
  if (!hasDatabase()) return;
  if (!/^[0-9a-f-]{36}$/.test(record.id) || !isLocale(record.locale)) return;

  const { error } = await publicClient()
    .from("consent_records")
    .insert({
      consent_id: record.id,
      decided_at: record.at,
      analytics: record.analytics === true,
      marketing: record.marketing === true,
      policy_version: record.policy.slice(0, 32),
      ui_version: record.ui.slice(0, 16),
      locale: record.locale,
      schema: record.schema.slice(0, 500),
    });
  if (error) console.error("[consent] not logged:", error.message);
}
