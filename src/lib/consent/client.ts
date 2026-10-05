"use client";

import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_DAYS,
  CONSENT_POLICY_VERSION,
  CONSENT_SCHEMA,
  CONSENT_UI_VERSION,
  GA_ID,
  type ConsentRecord,
} from "./config";
import type { Locale } from "@/lib/i18n/config";

/**
 * The consent record in the browser, and the one third-party script it governs.
 *
 * Full blocking: `gtag.js` is not requested until analytics is granted — no
 * Consent Mode, no "denied" ping. Withdrawing stops it at once (Google's
 * documented `ga-disable-<id>` switch) and deletes its cookies on this domain.
 */

export function readConsent(): ConsentRecord | null {
  const raw = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${CONSENT_COOKIE}=`))
    ?.slice(CONSENT_COOKIE.length + 1);
  if (!raw) return null;
  try {
    const record = JSON.parse(decodeURIComponent(raw)) as ConsentRecord;
    return isCurrent(record) ? record : null;
  } catch {
    return null;
  }
}

/** Same rules as the pre-paint script in ./prepaint.ts — keep them in step. */
export function isCurrent(record: ConsentRecord): boolean {
  const age = Date.now() - Date.parse(record.at);
  return (
    record.schema === CONSENT_SCHEMA &&
    record.ui === CONSENT_UI_VERSION &&
    record.policy === CONSENT_POLICY_VERSION &&
    age >= 0 &&
    age < CONSENT_MAX_AGE_DAYS * 86_400_000
  );
}

export function writeConsent(
  choice: { analytics: boolean; marketing: boolean },
  locale: Locale,
): ConsentRecord {
  const previous = readRaw();
  const record: ConsentRecord = {
    id: previous?.id ?? crypto.randomUUID(),
    at: new Date().toISOString(),
    analytics: choice.analytics,
    marketing: choice.marketing,
    policy: CONSENT_POLICY_VERSION,
    ui: CONSENT_UI_VERSION,
    locale,
    schema: CONSENT_SCHEMA,
  };
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(record))}; Path=/; ` +
    `Max-Age=${CONSENT_MAX_AGE_DAYS * 86_400}; SameSite=Lax${secure}`;
  document.documentElement.dataset.consent = "decided";
  return record;
}

/** The stored record even if expired — only to keep the same anonymous id. */
function readRaw(): ConsentRecord | null {
  const raw = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${CONSENT_COOKIE}=`))
    ?.slice(CONSENT_COOKIE.length + 1);
  try {
    return raw ? (JSON.parse(decodeURIComponent(raw)) as ConsentRecord) : null;
  } catch {
    return null;
  }
}

// ── Google Analytics 4 ──────────────────────────────────────────────────────

type GtagWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
} & Record<string, unknown>;

const SCRIPT_ID = "ga4-gtag";

export function applyAnalytics(granted: boolean): void {
  if (!GA_ID) return;
  const w = window as unknown as GtagWindow;

  if (!granted) {
    w[`ga-disable-${GA_ID}`] = true;
    document.getElementById(SCRIPT_ID)?.remove();
    deleteGaCookies();
    return;
  }

  w[`ga-disable-${GA_ID}`] = false;
  if (document.getElementById(SCRIPT_ID)) return;

  w.dataLayer = w.dataLayer ?? [];
  w.gtag = function gtag() {
    // gtag.js reads the `arguments` object itself, not an array copy.
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer?.push(arguments);
  };
  w.gtag("js", new Date());
  w.gtag("config", GA_ID, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(script);
}

/**
 * An analytics event. Parameters are ids only — never a name, phone, e-mail or
 * anything typed into the form. Does nothing without consent.
 */
export function track(event: string, params: { order_id?: string } = {}): void {
  const w = window as unknown as GtagWindow;
  if (!GA_ID || !readConsent()?.analytics || !w.gtag) return;
  w.gtag("event", event, params);
}

/** `_ga` and `_ga_*`, on this host and every parent domain it could be set on. */
function deleteGaCookies(): void {
  const names = document.cookie
    .split("; ")
    .map((part) => part.split("=")[0] ?? "")
    .filter((name) => name === "_ga" || name.startsWith("_ga_"));

  const labels = location.hostname.split(".");
  const domains = [""];
  for (let i = 0; i < labels.length - 1; i += 1) {
    domains.push(`; Domain=.${labels.slice(i).join(".")}`);
  }

  for (const name of names) {
    for (const domain of domains) {
      document.cookie = `${name}=; Path=/; Max-Age=0${domain}`;
    }
  }
}
