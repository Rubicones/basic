"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, IconAlert, IconCheck } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { PushDeviceRow } from "@/lib/admin/types";
import { removeDevice, saveDevice } from "./actions";

/**
 * This device, and the others.
 *
 * Everything a browser can refuse is a state here rather than an error after
 * the fact: no push support at all, an iPhone that has not installed the
 * console, a permission already denied, a server with no key yet. Each gets
 * the one sentence that fixes it.
 */

type Support = "checking" | "unsupported" | "install-first" | "ready";
type Note = { tone: "ok" | "error"; text: string } | null;

const WORKER = "/admin-sw.js";
const SCOPE = "/admin";

export function PushPanel({
  publicKey,
  devices,
}: {
  publicKey: string | null;
  devices: PushDeviceRow[];
}) {
  const router = useRouter();
  const [support, setSupport] = useState<Support>("checking");
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);

  useEffect(() => {
    void (async () => {
      const apple =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const installed =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;

      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setSupport(apple && !installed ? "install-first" : "unsupported");
        return;
      }

      setPermission(Notification.permission);
      const registration = await navigator.serviceWorker.getRegistration(SCOPE);
      const subscription = await registration?.pushManager.getSubscription();
      setEndpoint(subscription?.endpoint ?? null);
      setSupport("ready");
    })();
  }, []);

  const thisDevice = devices.find((device) => device.endpoint === endpoint) ?? null;

  async function enable() {
    if (!publicKey) return;
    setBusy(true);
    setNote(null);

    try {
      const registration = await navigator.serviceWorker.register(WORKER, { scope: SCOPE });
      await navigator.serviceWorker.ready;

      // Asked on a tap, never on page load: a permission prompt nobody asked for
      // is the one people answer "Block" to, and a blocked site cannot ask again.
      const answer = await Notification.requestPermission();
      setPermission(answer);
      if (answer !== "granted") {
        setNote({ tone: "error", text: blockedText() });
        return;
      }

      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: fromBase64Url(publicKey),
        }));

      const keys = subscription.toJSON().keys ?? {};
      const result = await saveDevice({
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh ?? "",
        auth: keys.auth ?? "",
        label: describeDevice(),
      });

      if (!result.ok) {
        setNote({ tone: "error", text: result.error });
        return;
      }

      setEndpoint(subscription.endpoint);
      setNote({
        tone: "ok",
        text: "This device will be notified of new orders. Send a test to be sure.",
      });
      router.refresh();
    } catch (cause) {
      setNote({
        tone: "error",
        text: cause instanceof Error ? cause.message : "The browser would not subscribe.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setNote(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration(SCOPE);
      const subscription = await registration?.pushManager.getSubscription();
      await subscription?.unsubscribe();
      if (thisDevice) await removeDevice(thisDevice.id);
      setEndpoint(null);
      setNote({ tone: "ok", text: "This device will no longer be notified." });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setNote(null);
    try {
      const { data, error } = await createClient().functions.invoke<{
        sent: number;
        failed: number;
        removed: number;
        error?: string;
      }>("notify-order", { body: { type: "TEST_PUSH" } });

      if (error || !data) {
        setNote({ tone: "error", text: await functionError(error) });
      } else if (data.sent === 0) {
        setNote({
          tone: "error",
          text:
            data.removed > 0
              ? "The push service says this subscription has expired. Turn notifications off and on again."
              : "Nothing was delivered. Check the device list below for the reason.",
        });
      } else {
        setNote({
          tone: "ok",
          text: `Sent to ${data.sent} device(s). It should appear within a few seconds.`,
        });
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function forget(id: string) {
    setBusy(true);
    try {
      await removeDevice(id);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card padding="lg">
        <h2 className="text-title mb-4 font-extrabold">This device</h2>

        {!publicKey ? (
          <p className="text-body-sm text-content-secondary">
            Push is not set up on the server yet. Run <code>npm run vapid</code> and follow what it
            prints — docs/push-setup.md has the steps.
          </p>
        ) : support === "checking" ? (
          <p className="text-body-sm text-content-secondary">
            Checking what this browser supports…
          </p>
        ) : support === "install-first" ? (
          <p className="text-body-sm text-content-secondary">
            Add the console to the Home Screen first — see below — and turn notifications on from
            the installed app. Safari in a tab cannot receive them.
          </p>
        ) : support === "unsupported" ? (
          <p className="text-body-sm text-content-secondary">
            This browser cannot receive push notifications. Chrome, Edge, Firefox and Safari on
            macOS all can.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-body-sm text-content-secondary">
              {thisDevice
                ? "On. New orders arrive here as notifications."
                : permission === "denied"
                  ? blockedText()
                  : "Off. Turn it on to be notified of new orders on this device."}
            </p>

            <div className="flex flex-wrap gap-3">
              {thisDevice ? (
                <>
                  <Button onClick={test} loading={busy} loadingLabel="Sending…" size="sm">
                    Send a test
                  </Button>
                  <Button onClick={disable} disabled={busy} variant="outline" size="sm">
                    Turn off on this device
                  </Button>
                </>
              ) : (
                <Button
                  onClick={enable}
                  loading={busy}
                  loadingLabel="Turning on…"
                  disabled={permission === "denied"}
                  size="sm"
                >
                  Turn on for this device
                </Button>
              )}
            </div>
          </div>
        )}

        <div role="status" aria-live="polite" className="empty:hidden">
          {note && (
            <p
              className={
                note.tone === "ok"
                  ? "text-body-sm text-success mt-5 flex items-start gap-2 font-medium"
                  : "text-body-sm text-danger mt-5 flex items-start gap-2 font-medium"
              }
            >
              <span className="mt-0.5 shrink-0">
                {note.tone === "ok" ? <IconCheck size={16} /> : <IconAlert size={16} />}
              </span>
              {note.text}
            </p>
          )}
        </div>
      </Card>

      {devices.length > 0 && (
        <Card padding="none" clip>
          <h2 className="text-title px-6 pt-6 pb-2 font-extrabold">Your devices</h2>
          <ul className="divide-line divide-y">
            {devices.map((device) => (
              <li key={device.id} className="flex items-center gap-4 px-6 py-4">
                <span className="min-w-0 flex-1">
                  <span className="text-body-sm block font-bold">
                    {device.label || "A browser"}
                    {device.endpoint === endpoint && (
                      <span className="text-caption text-content-secondary ml-2 font-normal">
                        this device
                      </span>
                    )}
                  </span>
                  <span className="text-caption text-content-secondary block">
                    {device.last_error
                      ? `Last attempt failed: ${device.last_error}`
                      : device.last_success_at
                        ? `Last delivered ${new Date(device.last_success_at).toLocaleString("en-GB")}`
                        : `Added ${new Date(device.created_at).toLocaleDateString("en-GB")}`}
                  </span>
                </span>
                {device.endpoint !== endpoint && (
                  <Button
                    onClick={() => forget(device.id)}
                    disabled={busy}
                    variant="ghost"
                    size="sm"
                  >
                    Remove
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

function blockedText(): string {
  return (
    "Notifications are blocked for this site. Allow them in the browser's site settings " +
    "(the icon left of the address), then come back here."
  );
}

/** `applicationServerKey` wants bytes; the key is stored as base64url. */
function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** "Safari on iPhone" — enough to tell one's own devices apart in a list. */
function describeDevice(): string {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  const system = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Mac OS X/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "Windows"
            : /Linux/.test(ua)
              ? "Linux"
              : "";
  return system ? `${browser} on ${system}` : browser;
}

/** The function's own sentence when it sent one, rather than "non-2xx status". */
async function functionError(error: unknown): Promise<string> {
  const context = (error as { context?: Response } | null)?.context;
  if (context && typeof context.json === "function") {
    const body = (await context.json().catch(() => null)) as { error?: string } | null;
    if (body?.error) return `The server said: ${body.error}.`;
  }
  return error instanceof Error ? error.message : "The test could not be sent.";
}
