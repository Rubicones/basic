"use client";

import { useActionState, useState } from "react";
import { Button, Card, IconAlert, IconArrowRight, IconCheck } from "@/components/ui";
import { importProducts, type ImportState } from "./actions";

/**
 * A file, and what happened to it.
 *
 * The outcome is three different things and they are not interchangeable: the
 * file could not be read at all, or it was read and some rows are wrong — with
 * the row numbers, because the person is going to go and look at them — or it
 * worked, and the only question left is how many products there are now.
 */
export function ImportForm() {
  const [state, action, pending] = useActionState<ImportState, FormData>(importProducts, {});
  const [name, setName] = useState("");

  const done = (state.created ?? 0) + (state.updated ?? 0) > 0;

  return (
    <Card padding="lg">
      <h2 className="text-title mb-2 font-extrabold">The file</h2>
      <p className="text-body-sm text-content-secondary mb-6">
        Start from the template — it has the columns, an example row and the words the storage
        column accepts.{" "}
        <a href="/import-template.xlsx" download className="text-brand hover:underline">
          Download the template
        </a>
        .
      </p>

      {state.error && (
        <p
          role="alert"
          className="text-body-sm text-danger mb-6 flex items-start gap-2 font-medium"
        >
          <span className="mt-0.5 shrink-0">
            <IconAlert size={16} />
          </span>
          {state.error}
        </p>
      )}

      <form action={action} className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <label className="border-line bg-surface-sunken hover:border-brand flex h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-pill border px-4 transition-surface">
          <input
            type="file"
            name="file"
            accept=".xlsx,.csv,.tsv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
            onChange={(event) => setName(event.currentTarget.files?.[0]?.name ?? "")}
            className="sr-only"
          />
          <span className="text-body-sm text-content-secondary truncate">
            {name || "Choose a spreadsheet…"}
          </span>
        </label>

        <Button
          type="submit"
          loading={pending}
          loadingLabel="Reading…"
          iconEnd={<IconArrowRight size={16} />}
        >
          Import
        </Button>
      </form>

      {state.issues && state.issues.length > 0 && (
        <div role="alert" className="mt-6">
          <p className="text-body-sm text-danger flex items-start gap-2 font-medium">
            <span className="mt-0.5 shrink-0">
              <IconAlert size={16} />
            </span>
            Nothing was imported — these rows need a look first.
          </p>
          <ul className="divide-line border-line mt-4 divide-y rounded-inner border">
            {state.issues.map((issue, index) => (
              <li key={`${issue.line}-${index}`} className="flex gap-4 px-4 py-3">
                <span className="text-body-sm w-16 shrink-0 font-bold tabular-nums">
                  Row {issue.line}
                </span>
                <span className="text-body-sm text-content-secondary">{issue.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div role="status" aria-live="polite" className="empty:hidden">
        {(done || state.note) && (
          <p className="text-body-sm text-success mt-6 flex items-start gap-2 font-medium">
            <span className="mt-0.5 shrink-0">
              <IconCheck size={16} />
            </span>
            {done ? `${state.created ?? 0} added, ${state.updated ?? 0} updated.` : state.note}
          </p>
        )}
      </div>
    </Card>
  );
}
