import { FinishSignIn } from "./finish";

/**
 * The implicit-flow tail of sign-in.
 *
 * `#access_token=…` is a fragment, and a fragment is never sent to the server.
 * This page exists only so that something running in the browser can read it,
 * hand the session to the Supabase client — which writes the same cookies the
 * server reads — and then continue into the console, where the usual guard
 * decides whether this person is an administrator.
 */
export default function FinishPage() {
  return <FinishSignIn />;
}
