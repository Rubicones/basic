# Push notifications for new orders

Each administrator can have new orders arrive as a notification on their phone
or computer, alongside the message in the staff chat. The staff chat is shared
and can be muted; this is the phone in one person's pocket.

```
new order ─▶ notify-order ─┬─▶ Telegram (retried until it lands)
                           └─▶ Web Push to every current administrator's devices
                               (sent once — a late or repeated push is worse
                                than none)
```

Nothing third-party: the notification goes from the `notify-order` function
through the browser vendor's own push service (Apple, Google, Mozilla) to the
device. The message is encrypted to each device (RFC 8291) and the request is
signed with our key (VAPID, RFC 8292) — `supabase/functions/notify-order/push.ts`,
tested by `npm run check:notify`.

## Setup, once

1. **Run `0010_push.sql`**, and `0009` before it if you have not.

2. **Make the key pair.** On your computer, in the project:

   ```bash
   npm run vapid
   ```

   It prints two things. Keep the private key out of chat, screenshots and the
   repository: whoever holds it can send notifications to every administrator.

3. **The public key goes into the database** — SQL Editor, the `update` the
   script printed:

   ```sql
   update public.settings set value = to_jsonb('B…'::text)
    where key = 'vapid_public_key';
   ```

4. **The private key goes into the function** — Edge Functions → Secrets:

   | name                | value                                                                               |
   | ------------------- | ----------------------------------------------------------------------------------- |
   | `VAPID_PRIVATE_KEY` | the private key the script printed                                                  |
   | `VAPID_SUBJECT`     | `mailto:` and an address you read — push services write there if something is wrong |

5. **Deploy the function again** — paste `supabase/dashboard/notify-order.ts`
   into the dashboard editor (or `supabase functions deploy notify-order
--no-verify-jwt`). The version from the Telegram setup does not send pushes.

Running `npm run vapid` a second time makes a _new_ pair. Every device already
subscribed would have to turn notifications off and on again, so do it once.

## Turning it on, per device

Console → **Notifications** → **Turn on for this device** → allow when the
browser asks → **Send a test**.

- **Chrome, Edge, Firefox, Safari on a Mac, Android**: works from a normal tab.
- **iPhone and iPad**: Safari delivers Web Push only to sites added to the Home
  Screen (iOS 16.4+). Open the console in Safari → Share → **Add to Home
  Screen** → open it from the new icon → sign in → Notifications → turn it on
  there.

Each administrator sees and manages only their own devices. Removing someone's
console access stops their notifications too: the function only sends to current
administrators.

## When a notification does not arrive

The **Notifications** page lists your devices with the last delivery or the last
error. The usual causes:

| what you see                                     | what it means                                                                                                                |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| "Push is not set up on the server yet"           | step 3 is missing — `settings.vapid_public_key` is empty                                                                     |
| test says "push is not configured on the server" | step 4 or 5 — the function has no `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`, or is the old version                               |
| "Notifications are blocked for this site"        | the browser was told "Block". Allow it in the site settings (the icon left of the address)                                   |
| a device disappears from the list                | the push service said the subscription is gone (the browser was reset, the app uninstalled). Turn it on again on that device |
| Apple says `BadJwtToken`                         | `VAPID_SUBJECT` is not a `mailto:` or `https:` address                                                                       |

Function logs carry a `push` line per order with `sent`, `failed` and `removed`
counts.
