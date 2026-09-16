"use client";

import { useEffect } from "react";
// The only place a dictionary reaches the client bundle: an error boundary has to
// be a client component, and by definition it cannot rely on the locale segment
// having resolved. English, directly imported, keeps it small and honest.
import { en } from "@/lib/i18n/messages/en";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const t = en;

  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-5 text-center">
      <div>
        <h1 className="text-display-md">{t.error.genericTitle}</h1>
        <p className="text-content-secondary mt-3 text-body-sm">{t.error.genericBody}</p>
        <button
          type="button"
          onClick={reset}
          className="bg-brand text-content-on-brand hover:bg-brand-hover mt-8 inline-flex h-11 items-center rounded-pill px-6 text-body-sm font-bold transition-colors"
        >
          {t.error.retry}
        </button>
      </div>
    </main>
  );
}
