"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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
 * The motion is driven by `data-state`, and the element stays open through its own
 * exit — the dialog closes itself once the transition has finished.
 *
 * The tidy way to write this is `[open]` plus `@starting-style` plus
 * `transition-behavior: allow-discrete`, and the entrance does animate that way
 * everywhere. The exit does not: it needs the `overlay` property to be
 * transitionable, and Firefox does not implement `overlay` at all, so the element
 * leaves the top layer on the frame `close()` is called and the panel disappears
 * mid-slide. Two attribute values and one ordinary transition work in every
 * browser, which is worth more here than the shorter stylesheet.
 */

const EXIT_MS = 400; // --duration-slow

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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [phase, setPhase] = useState<"closed" | "open">("closed");

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (timer.current) clearTimeout(timer.current);

    if (open) {
      if (!node.open) node.showModal();
      // Two frames: one for the browser to lay the element out in its closed
      // state, one for the change to be a transition rather than an initial value.
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setPhase("open")));
      return () => cancelAnimationFrame(raf);
    }

    setPhase("closed");
    if (node.open) {
      timer.current = setTimeout(() => node.close(), EXIT_MS);
    }
    return;
  }, [open]);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  /**
   * Esc and the backdrop ask the parent to close rather than closing the element,
   * so every way out runs the same exit. `cancel` is the event Esc fires first;
   * preventing it is what stops the platform from closing instantly underneath us.
   */
  const requestClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const cancel = (event: Event) => {
      event.preventDefault();
      requestClose();
    };
    node.addEventListener("cancel", cancel);
    return () => node.removeEventListener("cancel", cancel);
  }, [requestClose]);

  const isDrawer = variant === "drawer";

  return (
    <dialog
      ref={ref}
      data-state={phase}
      aria-label={hideTitle ? title : undefined}
      // Clicking the backdrop closes. The check is on the dialog itself because the
      // ::backdrop pseudo-element is not an event target — a click that lands on
      // the dialog element rather than its content is a backdrop click.
      onClick={(event) => {
        if (event.target === ref.current) requestClose();
      }}
      className={cx(
        /* No `m-0`: a <dialog> centres itself with the UA's `margin: auto`, and
           zeroing it pinned the dialog to the left edge. Each variant states the
           margins it actually wants instead. */
        "bg-surface-raised text-content-primary w-full p-0 shadow-overlay",
        "backdrop:bg-surface-inverse/55",
        "dialog-motion",
        isDrawer
          ? cx(
              "dialog-motion-drawer",
              "mx-auto mt-auto mb-0 max-h-dialog max-w-none rounded-t-panel",
              "sm:my-auto sm:mr-4 sm:ml-auto sm:h-auto sm:max-h-panel sm:w-drawer sm:max-w-none",
              "sm:rounded-panel",
            )
          : cx("dialog-motion-centre", "m-auto max-h-dialog max-w-form rounded-panel"),
      )}
    >
      {/* A grid with a scrolling middle row: the header and footer stay put while
          only the body scrolls, which is what stops a long form from pushing its
          own submit button off the screen. */}
      <div className="grid max-h-dialog grid-rows-dialog sm:max-h-panel">
        <header
          className={cx(
            "border-line flex items-start justify-between gap-4 p-6",
            /* On a phone the photograph begins immediately under the title and a
               rule between them only cuts the sheet in half. The side panel keeps
               it: there the header stays put while the body scrolls under it. */
            isDrawer ? "sm:border-b" : "border-b",
          )}
        >
          <h2 className={cx("text-display-sm", hideTitle && "sr-only")}>{title}</h2>
          <button
            type="button"
            onClick={requestClose}
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
