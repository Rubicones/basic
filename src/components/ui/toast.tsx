"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cx } from "./cx";
import { IconAlert, IconCheck, IconClose } from "./icon";

/**
 * Transient confirmations, announced.
 *
 * The region is a live region, so a screen reader hears the message without focus
 * moving. Status messages are polite; errors are assertive, because an error the
 * user does not hear is an error they will hit again.
 *
 * Toasts never carry the only copy of important information — an error that must
 * be acted on belongs next to the field that caused it.
 */

type Tone = "success" | "error" | "info";

type Toast = { id: number; tone: Tone; message: string };

type ToastContextValue = { show: (message: string, tone?: Tone) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside <ToastProvider>");
  return value;
}

const DISMISS_AFTER = 6000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (message: string, tone: Tone = "info") => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { id, tone, message }]);
      window.setTimeout(() => dismiss(id), DISMISS_AFTER);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastRegion toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

const tones: Record<Tone, { classes: string; icon: ReactNode }> = {
  success: {
    classes: "border-success text-success",
    icon: <IconCheck size={16} />,
  },
  error: {
    classes: "border-danger text-danger",
    icon: <IconAlert size={16} />,
  },
  info: {
    classes: "border-line-control text-content-primary",
    icon: null,
  },
};

function ToastRegion({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div
      // Bottom on phones so it sits above the thumb rather than under the notch.
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:top-0 sm:bottom-auto sm:items-end"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.tone === "error" ? "alert" : "status"}
          aria-live={toast.tone === "error" ? "assertive" : "polite"}
          className={cx(
            "pointer-events-auto flex w-full max-w-sm items-start gap-3",
            "bg-surface-raised rounded-panel border p-4 shadow-lift",
            "text-body-sm",
            tones[toast.tone].classes,
          )}
        >
          {tones[toast.tone].icon && <span className="mt-0.5 shrink-0">{tones[toast.tone].icon}</span>}
          <p className="text-content-primary min-w-0 flex-1">{toast.message}</p>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss"
            className="text-content-secondary hover:text-content-primary transition-ink shrink-0"
          >
            <IconClose size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
