"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cx } from "./cx";
import { IconClose } from "./icon";

/**
 * Built on the native `<dialog>` element.
 *
 * `showModal()` gives focus trapping, Esc-to-close, inertness of the page behind,
 * and the top layer — all of it, correctly, for free. A hand-rolled modal or a
 * library reimplements those, usually incompletely; the reference used a `fixed`
 * div with no focus trap at all.
 *
 * Motion is opacity and transform only, with `allow-discrete` so the element can
 * animate in and out of `display: none`. Where that is unsupported it snaps, which
 * is a perfectly good modal.
 */

type Variant = "dialog" | "drawer";

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /**
   * "drawer" enters from the bottom on narrow screens and from the right on wide
   * ones, where it keeps a gap on all four sides — a panel the page slid out,
   * not a wall welded to the edge of the window.
   */
  variant?: Variant;
  /** Hides the visible heading but keeps it for screen readers. */
  hideTitle?: boolean;
};

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  variant = "dialog",
  hideTitle = false,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  // Esc and the close button both go through the element's own `close` event, so
  // there is one path out and the parent's state cannot drift from the DOM.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const handle = () => onClose();
    node.addEventListener("close", handle);
    return () => node.removeEventListener("close", handle);
  }, [onClose]);

  const isDrawer = variant === "drawer";

  return (
    <dialog
      ref={ref}
      aria-label={hideTitle ? title : undefined}
      // Clicking the backdrop closes. The check is on the dialog itself because the
      // ::backdrop pseudo-element is not an event target — a click that lands on
      // the dialog element rather than its content is a backdrop click.
      onClick={(event) => {
        if (event.target === ref.current) ref.current?.close();
      }}
      className={cx(
        /* No `m-0`: a <dialog> centres itself with the UA's `margin: auto`, and
           zeroing it pinned the dialog to the left edge. Each variant states the
           margins it actually wants instead. */
        "bg-surface-raised text-content-primary w-full p-0 shadow-overlay",
        "backdrop:bg-surface-inverse/55",
        "transition-reveal transition-discrete",
        "opacity-0 open:opacity-100 starting:open:opacity-0",
        isDrawer
          ? cx(
              "mx-auto mt-auto mb-0 max-h-dialog max-w-none rounded-t-panel",
              "translate-y-4 open:translate-y-0 starting:open:translate-y-4",
              "sm:my-auto sm:mr-4 sm:ml-auto sm:h-auto sm:max-h-panel sm:w-drawer sm:max-w-none",
              "sm:rounded-panel",
              "sm:translate-y-0 sm:translate-x-4 sm:open:translate-x-0 sm:starting:open:translate-x-4",
            )
          : cx(
              "m-auto max-h-dialog max-w-form rounded-panel",
              "translate-y-2 scale-98 open:translate-y-0 open:scale-100",
              "starting:open:translate-y-2 starting:open:scale-98",
            ),
      )}
    >
      {/* A grid with a scrolling middle row: the header and footer stay put while
          only the body scrolls, which is what stops a long form from pushing its
          own submit button off the screen. */}
      <div className="grid max-h-dialog grid-rows-dialog sm:max-h-panel">
        <header className="border-line flex items-start justify-between gap-4 border-b p-6">
          <h2 className={cx("text-display-sm", hideTitle && "sr-only")}>{title}</h2>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Close"
            className={cx(
              "border-line-control text-content-secondary grid size-9 shrink-0 place-items-center",
              "rounded-pill border transition-surface hover:border-brand hover:text-brand",
            )}
          >
            <IconClose size={16} />
          </button>
        </header>

        <div className="overflow-y-auto p-6">{children}</div>

        {footer && <footer className="border-line border-t p-6">{footer}</footer>}
      </div>
    </dialog>
  );
}

export type DrawerProps = Omit<DialogProps, "variant">;

/** A Dialog anchored to an edge. Same mechanics, different entrance. */
export function Drawer(props: DrawerProps) {
  return <Dialog {...props} variant="drawer" />;
}
