"use client";

import { useActionState } from "react";
import { Button, Card, IconAlert, IconArrowRight, IconCheck, Input } from "@/components/ui";
import { requestLink } from "./actions";
import { SIGN_IN_INITIAL, type SignInState } from "./state";

export function SignInForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(
    requestLink,
    SIGN_IN_INITIAL,
  );

  const error = state.error ?? notice;

  return (
    <Card padding="lg">
      {error && (
        <p
          role="alert"
          className="text-body-sm text-danger mb-6 flex items-start gap-2 font-medium"
        >
          <span className="mt-0.5 shrink-0">
            <IconAlert size={16} />
          </span>
          {error}
        </p>
      )}

      {state.sent ? (
        <>
          <p className="text-body-sm text-success flex items-start gap-2 font-medium">
            <span className="mt-0.5 shrink-0">
              <IconCheck size={16} />
            </span>
            If {state.email} can sign in, a link is on its way. It works once, for an hour.
          </p>

          {/* The two things that actually go wrong, said before they happen. The
              reply stays the same for every address — whether a link was really
              sent is exactly what this form must not reveal — so the advice is
              general rather than a diagnosis. */}
          <p className="text-caption text-content-secondary mt-3">
            Open it in this browser — it will not work anywhere else. Nothing after a couple of
            minutes? Only a few sign-in emails can go out per hour, and asking again replaces the
            previous link, so wait before you do.
          </p>

          <form action={action} className="mt-6">
            <input type="hidden" name="intent" value="restart" />
            <Button type="submit" variant="ghost" size="sm" fullWidth>
              Use a different address
            </Button>
          </form>
        </>
      ) : (
        <form action={action}>
          <Input
            name="email"
            type="email"
            label="Email"
            placeholder="you@example.com"
            autoComplete="email"
            defaultValue={state.email}
            required
            help="We send a one-time link. There is no password to lose."
          />

          <div className="mt-6">
            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={pending}
              loadingLabel="Sending…"
              iconEnd={<IconArrowRight size={20} />}
            >
              Send the link
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
