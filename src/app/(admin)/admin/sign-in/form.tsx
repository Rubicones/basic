"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  CodeInput,
  IconAlert,
  IconArrowRight,
  IconMail,
  Input,
} from "@/components/ui";
import { requestCode, verifyCode } from "./actions";
import {
  CODE_LENGTH,
  RESEND_AFTER,
  SIGN_IN_INITIAL,
  VERIFY_INITIAL,
  type SignInState,
} from "./state";

/**
 * Two steps on one card: the address, then the code sent to it.
 *
 * The second step is keyed by when the code was sent, so asking for a new one
 * starts it afresh — empty cells, no stale "that code is wrong" from the code
 * the new one just replaced.
 */
export function SignInForm({ notice }: { notice?: string }) {
  const [state, send, sending] = useActionState<SignInState, FormData>(
    requestCode,
    SIGN_IN_INITIAL,
  );

  return (
    <Card padding="lg">
      {state.sent ? (
        <CodeStep key={state.sentAt} state={state} send={send} sending={sending} />
      ) : (
        <EmailStep state={state} send={send} sending={sending} notice={notice} />
      )}
    </Card>
  );
}

type StepProps = {
  state: SignInState;
  send: (formData: FormData) => void;
  sending: boolean;
};

function EmailStep({ state, send, sending, notice }: StepProps & { notice?: string | undefined }) {
  const error = state.error ?? notice;

  return (
    <>
      <h1 className="text-display-sm mb-2">Sign in</h1>
      <p className="text-body-sm text-content-secondary mb-6">
        We email you a {CODE_LENGTH}-digit code. There is no password to lose.
      </p>

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

      <form action={send}>
        <Input
          name="email"
          type="email"
          label="Email"
          placeholder="you@example.com"
          autoComplete="email"
          defaultValue={state.email}
          required
        />

        <div className="mt-6">
          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={sending}
            loadingLabel="Sending…"
            iconEnd={<IconArrowRight size={20} />}
          >
            Send the code
          </Button>
        </div>
      </form>
    </>
  );
}

function CodeStep({ state, send, sending }: StepProps) {
  const [verified, verify, verifying] = useActionState(verifyCode, VERIFY_INITIAL);
  const [code, setCode] = useState("");
  const [seenRejections, setSeenRejections] = useState(0);
  const form = useRef<HTMLFormElement>(null);
  const wait = useSecondsUntil((state.sentAt ?? 0) + RESEND_AFTER * 1000);

  // A rejected code is cleared, so the next attempt starts from the first cell.
  // Adjusted during render rather than in an effect: the cleared cells and the
  // error arrive in the same paint instead of one frame apart.
  if (verified.rejected !== seenRejections) {
    setSeenRejections(verified.rejected);
    setCode("");
  }

  // The error stays until the first new digit — then it is about a code that is
  // no longer on screen.
  const error = code === "" ? verified.error : undefined;

  return (
    <>
      <span className="bg-surface-brand text-brand mb-5 grid size-12 place-items-center rounded-pill">
        <IconMail size={24} />
      </span>

      <h1 className="text-display-sm mb-2">Check your email</h1>
      <p className="text-body-sm text-content-secondary mb-6">
        We sent a {CODE_LENGTH}-digit code to{" "}
        <span className="text-content-primary font-bold break-all">{state.email}</span>. Enter it
        here — or tap it above the keyboard if your phone offers it.
      </p>

      <form ref={form} action={verify}>
        <input type="hidden" name="email" value={state.email} />

        <CodeInput
          name="code"
          label="Sign-in code"
          length={CODE_LENGTH}
          value={code}
          onChange={setCode}
          // The last digit is the submit. Next frame, so the form reads the
          // cleaned value React has just committed rather than what was pasted.
          onComplete={() => requestAnimationFrame(() => form.current?.requestSubmit())}
          help="Works once, for an hour. A new code replaces this one."
          {...(error ? { error } : {})}
          disabled={verifying}
          autoFocus
          shake={verified.rejected}
        />

        <div className="mt-6">
          <Button
            type="submit"
            size="lg"
            fullWidth
            disabled={code.length !== CODE_LENGTH}
            loading={verifying}
            loadingLabel="Checking…"
            iconEnd={<IconArrowRight size={20} />}
          >
            Sign in
          </Button>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <form action={send}>
          <input type="hidden" name="email" value={state.email} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            disabled={wait > 0 || verifying}
            loading={sending}
            loadingLabel="Sending…"
          >
            {wait > 0 ? `New code in ${clock(wait)}` : "Send a new code"}
          </Button>
        </form>

        <form action={send}>
          <input type="hidden" name="intent" value="restart" />
          <Button type="submit" variant="ghost" size="sm" disabled={verifying}>
            Different address
          </Button>
        </form>
      </div>

      {/* The two things that actually go wrong, said before they happen. The
          reply is the same for every address — whether a code was really sent is
          exactly what this form must not reveal — so this is advice, not a
          diagnosis. */}
      <p className="text-caption text-content-secondary mt-4">
        Nothing after a couple of minutes? Look in spam, then send a new code. Only a few sign-in
        emails can go out per hour.
      </p>
    </>
  );
}

/** Whole seconds left until `deadline` (epoch ms), ticking once a second. */
function useSecondsUntil(deadline: number): number {
  const [now, setNow] = useState(() => Date.now());
  const left = Math.max(0, Math.ceil((deadline - now) / 1000));
  const running = left > 0;

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);

  return left;
}

/** 42 → "0:42". */
function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
