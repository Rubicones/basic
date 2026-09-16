import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";

/**
 * The horizontal gutter lives here and nowhere else.
 *
 * The reference had three — `px-5 lg:px-10` on the public page, `px-4 lg:px-8` in
 * admin, and `px-5 sm:px-8 lg:px-10` in the hero — so nothing on the page shared a
 * left edge with anything else.
 *
 * The phone step is narrower than the rest: with two columns of photographs, every
 * pixel of gutter is a pixel off both pictures.
 */

export type ContainerProps = {
  children: ReactNode;
  /** content = the page. measure = something you read. form = a single column of fields. */
  width?: "content" | "measure" | "form";
  /** For an element that supplies its own gutter, such as a full-bleed carousel. */
  flush?: boolean;
};

const widths = {
  content: "max-w-content",
  measure: "max-w-measure",
  form: "max-w-form",
} as const;

export function Container({ children, width = "content", flush = false }: ContainerProps) {
  return (
    <div className={cx("mx-auto w-full", widths[width], !flush && "px-4 sm:px-5 lg:px-10")}>{children}</div>
  );
}
