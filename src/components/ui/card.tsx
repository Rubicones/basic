import type { ReactNode } from "react";
import { cx } from "./cx";

/**
 * Three surfaces, not eleven.
 *
 * The reference had eleven card treatments across four radii and two backgrounds
 * for what turned out to be three roles: something you look at, something you fill
 * in, and something nested inside one of those.
 */

export type CardProps = {
  children: ReactNode;
  /** Adds the hover lift. Only for a card that is genuinely a link or a control. */
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  /** Clips children to the radius — for a card whose photo runs to the edge. */
  clip?: boolean;
};

const paddings = { none: "", sm: "p-4", md: "p-6", lg: "p-6 sm:p-9" } as const;

export function Card({ children, interactive = false, padding = "md", clip = false }: CardProps) {
  return (
    <div
      className={cx(
        "border-line bg-surface-raised rounded-card border shadow-soft",
        clip && "overflow-hidden",
        paddings[padding],
        interactive && "transition-control hover:-translate-y-0.5 hover:shadow-lift",
      )}
    >
      {children}
    </div>
  );
}

export type PanelProps = {
  children: ReactNode;
  padding?: "sm" | "md" | "lg";
  /** A quieter surface, for a panel that sits on the raised one. */
  tone?: "raised" | "sunken";
};

export function Panel({ children, padding = "md", tone = "raised" }: PanelProps) {
  const paddingClass = padding === "sm" ? "p-5" : padding === "lg" ? "p-8" : "p-6";
  return (
    <div
      className={cx(
        "border-line rounded-panel border",
        tone === "sunken" ? "bg-surface-sunken" : "bg-surface-raised shadow-soft",
        paddingClass,
      )}
    >
      {children}
    </div>
  );
}

export type TileProps = { children: ReactNode };

/** Nested inside a Card or Panel — no shadow, sunken, small radius. */
export function Tile({ children }: TileProps) {
  return (
    <div className="border-line bg-surface-page/65 rounded-inner border p-4">{children}</div>
  );
}
