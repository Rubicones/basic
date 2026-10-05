"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import NextLink from "next/link";
import { Button, IconClose } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import { COOKIES, OPTIONAL_CATEGORIES, type ConsentCategory } from "@/lib/consent/config";
import { applyAnalytics, readConsent, writeConsent } from "@/lib/consent/client";
import { logConsent } from "@/lib/consent/actions";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/dictionaries";

/**
 * The cookie banner and the settings dialog.
 *
 * Rendered on the server like any other markup, and shown or hidden by CSS: the
 * pre-paint script in the layout marks <html data-consent="decided"> before the
 * first frame when a current decision exists, and `.consent-banner` is
 * `display: none` under it. So the banner never flashes for someone who already
 * chose, never shifts layout (it is fixed), and costs the LCP nothing.
 *
 * Accept all and Reject all are the same component, size and colour — on
 * purpose. "Customize" is the third, quieter control.
 */

export const OPEN_CONSENT_EVENT = "basic:consent-open";

type Choice = { analytics: boolean; marketing: boolean };

export function Consent({ locale, t }: { locale: Locale; t: Messages }) {
  const c = t.consent;
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<Choice>({ analytics: false, marketing: false });
  const [decided, setDecided] = useState(false);
  const trigger = useRef<HTMLElement | null>(null);

  // A stored decision is applied on every page load: GA only ever starts here.
  useEffect(() => {
    const record = readConsent();
    if (record) {
      setDecided(true);
      setChoice({ analytics: record.analytics, marketing: record.marketing });
      applyAnalytics(record.analytics);
    }
  }, []);

  const decide = useCallback(
    (next: Choice) => {
      const record = writeConsent(next, locale);
      setChoice(next);
      setDecided(true);
      setOpen(false);
      applyAnalytics(next.analytics);
      void logConsent(record);
    },
    [locale],
  );

  const openSettings = useCallback(() => {
    trigger.current = document.activeElement as HTMLElement | null;
    const record = readConsent();
    setChoice(
      record
        ? { analytics: record.analytics, marketing: record.marketing }
        : { analytics: false, marketing: false },
    );
    setOpen(true);
  }, []);

  // The footer's "Cookie settings" link, on every page.
  useEffect(() => {
    window.addEventListener(OPEN_CONSENT_EVENT, openSettings);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, openSettings);
  }, [openSettings]);

  const acceptAll = () => decide({ analytics: true, marketing: true });
  const rejectAll = () => decide({ analytics: false, marketing: false });

  /** Closing without a decision on record counts as Reject all — and says so. */
  const close = useCallback(() => {
    if (!decided) {
      decide({ analytics: false, marketing: false });
    } else {
      setOpen(false);
    }
  }, [decided, decide]);

  return (
    <>
      <section
        aria-label={c.region}
        className={cx(
          "consent-banner pb-consent fixed inset-x-0 bottom-0 z-60",
          "border-line bg-surface-raised shadow-overlay border-t",
        )}
      >
        <div className="mx-auto w-full max-w-content px-4 pt-3 sm:px-6 sm:pt-5">
          {/* Phone: one line of text and the Settings link, then two equal buttons. */}
          <div className="sm:hidden">
            <p className="text-caption text-content-secondary">
              {c.textShort}{" "}
              <button
                type="button"
                onClick={openSettings}
                className="text-brand font-bold underline underline-offset-2"
              >
                {c.settings}
              </button>
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button size="sm" variant="inverse" onClick={acceptAll} fullWidth>
                {c.accept}
              </Button>
              <Button size="sm" variant="inverse" onClick={rejectAll} fullWidth>
                {c.reject}
              </Button>
            </div>
          </div>

          {/* Wider screens: the sentence with both policies, three controls. */}
          <div className="hidden items-center gap-6 sm:flex">
            <p className="text-body-sm text-content-secondary min-w-0 flex-1">
              {c.text}{" "}
              <NextLink
                href={`/${locale}/privacy-policy`}
                className="text-brand underline underline-offset-4"
              >
                {c.privacy}
              </NextLink>
              {" · "}
              <NextLink
                href={`/${locale}/cookie-policy`}
                className="text-brand underline underline-offset-4"
              >
                {c.cookies}
              </NextLink>
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="inverse" onClick={acceptAll}>
                {c.accept}
              </Button>
              <Button variant="inverse" onClick={rejectAll}>
                {c.reject}
              </Button>
              <Button variant="outline" onClick={openSettings}>
                {c.customize}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <SettingsDialog
        open={open}
        decided={decided}
        choice={choice}
        onChange={setChoice}
        onSave={() => decide(choice)}
        onAcceptAll={acceptAll}
        onRejectAll={rejectAll}
        onClose={close}
        returnFocus={trigger}
        locale={locale}
        t={t}
      />
    </>
  );
}

function SettingsDialog({
  open,
  decided,
  choice,
  onChange,
  onSave,
  onAcceptAll,
  onRejectAll,
  onClose,
  returnFocus,
  locale,
  t,
}: {
  open: boolean;
  decided: boolean;
  choice: Choice;
  onChange: (next: Choice) => void;
  onSave: () => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onClose: () => void;
  returnFocus: React.RefObject<HTMLElement | null>;
  locale: Locale;
  t: Messages;
}) {
  const c = t.consent;
  const ref = useRef<HTMLDialogElement>(null);

  // Native modal: the browser traps focus, makes the page inert and maps Escape
  // to `cancel`. Focus goes back to whatever opened it.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) {
      node.close();
      returnFocus.current?.focus();
    }
  }, [open, returnFocus]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="consent-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="bg-surface-raised text-content-primary max-h-dialog m-auto w-full max-w-measure rounded-panel p-0 shadow-overlay backdrop:bg-surface-inverse/50"
    >
      <div className="flex items-start justify-between gap-4 p-6 pb-0">
        <h2 id="consent-title" className="text-display-sm">
          {c.dialogTitle}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={decided ? c.close : c.closeReject}
          title={decided ? c.close : c.closeReject}
          className="hover:bg-surface-brand hover:text-brand grid size-9 shrink-0 place-items-center rounded-pill transition-surface"
        >
          <IconClose size={16} />
        </button>
      </div>

      <div className="space-y-4 p-6">
        <p className="text-body-sm text-content-secondary">{c.dialogIntro}</p>

        {(["necessary", ...OPTIONAL_CATEGORIES] as ConsentCategory[]).map((category) => (
          <CategoryBlock
            key={category}
            category={category}
            checked={category === "necessary" ? true : choice[category]}
            disabled={category === "necessary"}
            onToggle={(value) =>
              category !== "necessary" && onChange({ ...choice, [category]: value })
            }
            locale={locale}
            t={t}
          />
        ))}
      </div>

      <div className="border-line bg-surface-raised sticky bottom-0 grid gap-2 border-t p-4 sm:grid-cols-3">
        <Button variant="inverse" onClick={onAcceptAll} fullWidth>
          {c.accept}
        </Button>
        <Button variant="inverse" onClick={onRejectAll} fullWidth>
          {c.reject}
        </Button>
        <Button variant="outline" onClick={onSave} fullWidth>
          {c.save}
        </Button>
      </div>
    </dialog>
  );
}

function CategoryBlock({
  category,
  checked,
  disabled,
  onToggle,
  locale,
  t,
}: {
  category: ConsentCategory;
  checked: boolean;
  disabled: boolean;
  onToggle: (value: boolean) => void;
  locale: Locale;
  t: Messages;
}) {
  const c = t.consent;
  const copy = c.categories[category];
  const cookies = COOKIES[category];
  const id = `consent-${category}`;

  return (
    <div className="border-line rounded-inner border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <label htmlFor={id} className="text-body font-bold">
            {copy.title}
          </label>
          <p id={`${id}-desc`} className="text-body-sm text-content-secondary mt-1">
            {copy.body}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-2">
          {disabled && <span className="text-caption text-content-secondary">{c.alwaysOn}</span>}
          <input
            id={id}
            type="checkbox"
            role="switch"
            aria-describedby={`${id}-desc`}
            checked={checked}
            disabled={disabled}
            onChange={(event) => onToggle(event.target.checked)}
            className="accent-brand size-5 disabled:opacity-60"
          />
        </span>
      </div>

      {cookies.length > 0 ? (
        <div className="mt-3 overflow-x-auto">
          <table className="text-caption w-full text-left">
            <thead className="text-content-secondary">
              <tr>
                <th scope="col" className="py-1 pr-3 font-medium">
                  {c.columns.name}
                </th>
                <th scope="col" className="py-1 pr-3 font-medium">
                  {c.columns.provider}
                </th>
                <th scope="col" className="py-1 pr-3 font-medium">
                  {c.columns.purpose}
                </th>
                <th scope="col" className="py-1 font-medium">
                  {c.columns.duration}
                </th>
              </tr>
            </thead>
            <tbody>
              {cookies.map((cookie) => (
                <tr key={cookie.name} className="border-line border-t align-top">
                  <td className="py-1.5 pr-3 font-bold break-all">{cookie.name}</td>
                  <td className="py-1.5 pr-3">{cookie.provider}</td>
                  <td className="py-1.5 pr-3">{cookie.purpose[locale]}</td>
                  <td className="py-1.5 whitespace-nowrap">{cookie.duration[locale]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-caption text-content-secondary mt-3">{c.none}</p>
      )}
    </div>
  );
}

/** "Cookie settings" — the footer link that reopens the dialog from any page. */
export function CookieSettingsButton({ label, className }: { label: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}
      className={className}
    >
      {label}
    </button>
  );
}
