import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";

/**
 * How a dessert keeps, as a glyph in the storage colours the chips used.
 *
 * The chip said "Chilled" in words on every card; the icon says it in a 24px
 * circle in the card's top-left corner, and the words move to where there is
 * room: a legend under the catalogue, a note beside it on hover, and full badges inside the product sheet.
 * The label is always the accessible name, so nothing is lost to a screen reader.
 */

export type StorageFormat = "frozen" | "chilled" | "ambient";

const tones: Record<StorageFormat, string> = {
  frozen: "bg-storage-frozen text-storage-frozen-ink",
  chilled: "bg-storage-chilled text-storage-chilled-ink",
  ambient: "bg-storage-ambient text-storage-ambient-ink",
};

const glyphs: Record<StorageFormat, ReactNode> = {
  // A snowflake.
  frozen: (
    <>
      <path d="M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17" />
      <path d="m9 4 3 3 3-3M9 20l3-3 3 3" />
    </>
  ),
  // A display fridge: the cabinet, its shelf, the handle.
  chilled: (
    <>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M5 10h14M9 5v2M9 13v3" />
    </>
  ),
  // Room temperature: the sun.
  ambient: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
};

export function StorageIcon({
  format,
  label,
  note = false,
  compact = false,
}: {
  format: StorageFormat;
  label: string;
  /** Shows the label above the icon on hover, on devices that can hover. */
  note?: boolean;
  /** Smaller below sm (the phone card); full size from sm up. */
  compact?: boolean;
}) {
  return (
    <span className="group/storage relative inline-flex">
      <span
        role="img"
        aria-label={label}
        title={note ? undefined : label}
        className={cx(
          "grid place-items-center rounded-pill",
          compact ? "size-6 sm:size-8" : "size-8",
          tones[format],
        )}
      >
        <svg
          width={16}
          height={16}
          className={compact ? "size-3 sm:size-4" : undefined}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          {glyphs[format]}
        </svg>
      </span>
      {note && (
        <span
          aria-hidden="true"
          className={cx(
            "pointer-events-none absolute top-1/2 left-full z-30 ml-2 -translate-y-1/2",
            "bg-surface-inverse text-content-on-photo text-caption rounded-pill px-2.5 py-1 whitespace-nowrap",
            "opacity-0 transition-surface",
            "group-hover/storage:opacity-100",
          )}
        >
          {label}
        </span>
      )}
    </span>
  );
}

export function isStorageFormat(value: string): value is StorageFormat {
  return value === "frozen" || value === "chilled" || value === "ambient";
}
