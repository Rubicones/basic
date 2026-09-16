"use client";

import { useActionState } from "react";
import { Button, Card, IconAlert, IconArrowRight, IconCheck, Input } from "@/components/ui";
import { inviteAdmin, type InviteState } from "./actions";

export function InviteForm() {
  const [state, action, pending] = useActionState<InviteState, FormData>(inviteAdmin, {});

  return (
    <Card padding="lg">
      <h2 className="text-title mb-2 font-extrabold">Invite someone</h2>
      <p className="text-body-sm text-content-secondary mb-6">
        They get an email with a link that both creates their account and signs them in. Access
        itself comes from this list, not from the invitation.
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

      <form action={action} className="flex flex-col gap-6 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <Input
            name="email"
            type="email"
            label="Email"
            placeholder="name@example.com"
            autoComplete="off"
            required
          />
        </div>
        <Button
          type="submit"
          loading={pending}
          loadingLabel="Inviting…"
          iconEnd={<IconArrowRight size={16} />}
        >
          Send invitation
        </Button>
      </form>

      <div role="status" aria-live="polite" className="empty:hidden">
        {(state.invited ?? state.note) && (
          <p className="text-body-sm text-success mt-5 flex items-start gap-2 font-medium">
            <span className="mt-0.5 shrink-0">
              <IconCheck size={16} />
            </span>
            {state.invited ? `${state.invited} can now use the console. ` : ""}
            {state.note}
          </p>
        )}
      </div>
    </Card>
  );
}
