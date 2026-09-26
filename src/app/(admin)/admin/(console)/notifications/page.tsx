import { Card } from "@/components/ui";
import { listMyDevices, vapidPublicKey } from "@/lib/admin/queries";
import { env } from "@/lib/env";
import { PushPanel } from "./push-panel";

/**
 * Push notifications for new orders, per device.
 *
 * The staff chat is shared and can be muted; this is the phone in one person's
 * pocket. Each administrator turns it on for themselves, on each device they
 * want to hear from — the list below is theirs alone.
 */
export default async function NotificationsPage() {
  const [devices, publicKey] = await Promise.all([listMyDevices(), vapidPublicKey()]);

  return (
    <>
      <h1 className="text-display-md">Notifications</h1>
      <p className="text-body-sm text-content-secondary mt-2 mb-8 max-w-measure">
        A notification on this device for every new order, alongside the message in the staff chat.
        Turn it on separately on each phone or computer you want to hear from.
      </p>

      <div className="flex flex-col gap-6">
        {env.consoleDemo ? (
          <Card padding="lg">
            <p className="text-body-sm text-content-secondary">
              Demo mode: there is no server to send notifications from.
            </p>
          </Card>
        ) : (
          <PushPanel publicKey={publicKey} devices={devices} />
        )}

        <Card padding="lg">
          <h2 className="text-title mb-4 font-extrabold">On an iPhone or iPad</h2>
          <p className="text-body-sm text-content-secondary">
            Safari only delivers notifications to sites added to the Home Screen. Open the console
            in Safari, tap Share → <b>Add to Home Screen</b>, open it from the new icon, sign in,
            and turn notifications on from there. iOS 16.4 or later.
          </p>
        </Card>
      </div>
    </>
  );
}
