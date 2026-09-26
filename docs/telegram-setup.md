# Telegram order notifications

Every request placed on the site lands in a staff group within seconds. This is
how it is wired, how to set it up by hand the first time, and where to look when a
message does not arrive.

```
site  ──▶ submit_order()          the row is committed; the customer is told
           (security definer)      immediately, and nothing waits on Telegram
             │
             ▼  insert on orders
   trigger → pg_net (0008) ──▶  Edge Function notify-order  ──▶  Bot API
             ▲                        │
             │                        └─▶ orders.telegram_message_id, notified_at
        pg_cron sweep, every 2 min ──┘     (or notify_attempts, notify_error)
```

The Telegram call is never inside the customer's request, and never in a browser:
the token exists only as an Edge Function secret.

---

## 1. Create the bot

1. Open [@BotFather](https://t.me/BotFather) → `/newbot`.
2. Name it something the staff will recognise in a group — "basic porudžbine".
3. BotFather replies with a token like `8012345678:AAH...`. **That is the whole
   password.** It goes into the Edge Function's secrets in step 4 and nowhere
   else — not into `.env.local`, not into anything starting with `NEXT_PUBLIC_`,
   not into this repository.
4. `/setjoingroups` → **Enable**, so the bot can be added to a group.
5. `/setprivacy` → **Enable** (the default). The bot only needs to write.

## 2. Create the group and get its id

1. Make the group, add the staff, add the bot.
2. In the group, send **`/start@your_bot_name`** — a command addressed to the bot
   by name. Not "hello": with privacy mode on (step 1.5, and the right setting),
   the bot is delivered only commands aimed at it, replies to it and mentions of
   it. An ordinary message in the group never reaches the API at all, which is
   why `getUpdates` looks empty.
3. Ask Telegram what it saw — the whole answer, unfiltered:

   ```bash
   curl -s "https://api.telegram.org/bot<TOKEN>/getUpdates" | jq .
   ```

   Then pull the chat out of whichever kind of update arrived. Adding a bot to a
   group produces `my_chat_member`, not `message`, so a filter that only looks at
   `.message` prints nothing and looks like an empty response:

   ```bash
   curl -s "https://api.telegram.org/bot<TOKEN>/getUpdates" \
     | jq '[.result[] | .message.chat // .my_chat_member.chat // .channel_post.chat]
            | unique_by(.id) | .[] | {id, type, title}'
   ```

   The `id` is negative and, for a supergroup, starts with `-100`.

   Still nothing back?

   | what you see                        | what it means                                                                                                                                                   |
   | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `{"ok":true,"result":[]}`           | nothing was addressed to the bot since it joined. Send `/start@your_bot_name` again — bots are never shown a group's history, only what happens after they join |
   | `{"ok":false,"error_code":409,...}` | a webhook is set on this token; `getUpdates` and webhooks are exclusive. `curl -s ".../deleteWebhook"`, then retry                                              |
   | `{"ok":false,"error_code":401,...}` | the token is wrong — no `bot` prefix in the URL, or a stray space                                                                                               |
   | updates from yesterday only         | updates expire after 24 hours, and a previous `getUpdates` consumed the newer ones. Post the command again                                                      |

   Making the bot an **administrator** of the group also works and is worth doing
   anyway: an admin bot receives everything regardless of privacy mode.

4. Put it in `settings`, as a JSON number:

   ```sql
   update public.settings
      set value = to_jsonb(-1001234567890::bigint)
    where key = 'telegram_chat_id';
   ```

5. Confirm it before wiring anything else up — if this message does not arrive,
   nothing further will either:

   ```bash
   curl -s -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" \
     -H 'content-type: application/json' \
     -d '{"chat_id":-1001234567890,"text":"basic: <b>veza radi</b>","parse_mode":"HTML"}'
   ```

The id is in the database rather than in an environment variable on purpose:
Telegram issues a **new** id the moment a group is upgraded to a supergroup, and
that happens on its own. The function handles the upgrade itself — Telegram hands
the new id back in the error, and `notify-order` writes it here and re-sends — but
if you ever have to change the group by hand, this is one `update`, not a deploy.

## 3. Choose a shared secret

One value, in three places — nothing else authenticates the function:

```bash
openssl rand -hex 32
```

## 4. Deploy the function and its secrets

Two routes to the same function. Pick one.

### From the dashboard, no CLI

1. `npm run bundle:notify` — joins the function's three modules into one file,
   `supabase/dashboard/notify-order.ts`, because the browser editor takes one
   file. (It is already generated in the repository; rerun only after changing
   the function.)
2. **Edge Functions** → **Deploy a new function** → **Via Editor**.
3. Name it exactly `notify-order` — the name is the URL.
4. Replace everything in the editor with the contents of
   `supabase/dashboard/notify-order.ts` → **Deploy function**.
5. On the function's page → **Details** → turn **Verify JWT** off → **Save**.
   The caller is a database webhook, not a signed-in user; left on, the gateway
   answers 401 before the function's own code ever runs.
6. **Edge Functions** → **Secrets** → add two:

   | name                    | value                 |
   | ----------------------- | --------------------- |
   | `TELEGRAM_BOT_TOKEN`    | the bot token         |
   | `NOTIFY_WEBHOOK_SECRET` | the value from step 3 |

### With the CLI

```bash
supabase functions deploy notify-order --no-verify-jwt
supabase secrets set TELEGRAM_BOT_TOKEN='8012345678:AAH...'
supabase secrets set NOTIFY_WEBHOOK_SECRET='<the value from step 3>'
```

### Either way

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided by the platform —
do not add them.

Check that it is up and refusing strangers:

```bash
curl -i -X POST https://<project>.supabase.co/functions/v1/notify-order
```

| answer                                                     | meaning                                                                                        |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `401` with body `unauthorised`                             | right: the function is running and wants the secret                                            |
| `401` mentioning JWT or an authorization header            | **Verify JWT** is still on (5 above)                                                           |
| `404`                                                      | not deployed, or deployed under a different name                                               |
| `401` `unauthorised` even with the right `x-notify-secret` | `NOTIFY_WEBHOOK_SECRET` is missing or differs — with no secret set, the function trusts nobody |

## 5. Tell the database where the function is

The webhook and the retry sweep both read the function's address from `settings`
and the shared secret from Vault — one copy of each, so the two can never
disagree. The secret goes to Vault rather than `settings` because every
administrator can read `settings`, and this is the one value that decides whether
a request is genuinely from us.

```sql
update public.settings
   set value = to_jsonb('https://<project>.supabase.co/functions/v1/notify-order'::text)
 where key = 'notify_endpoint';

select vault.create_secret('<the value from step 3>', 'notify_webhook_secret');
```

## 6. The webhook

`0008_notify_trigger.sql`. Run it after step 5 — that is all.

It is the same thing the dashboard's _Database Webhooks_ screen makes (a trigger
that calls `pg_net`), written as a migration: reviewable, repeatable on a second
project, and reading the same endpoint and secret as the sweep. It never fails
the insert — if something is missing it logs, lets the order through, and leaves
it for the sweep.

Do **not** also create one in the dashboard. Nothing would be sent twice — the
claim prevents it — but every order would wake the function twice.

Check both are in place:

```sql
select tgname from pg_trigger where tgname = 'orders_notify';
select jobname, schedule, active from cron.job;
```

`orders_notify`, and `sweep-order-notifications` · `*/2 * * * *` · `true`.

If `pg_cron` or `pg_net` could not be enabled by `0007`, turn them on under
**Database → Extensions** and run `0007` again.

---

## 7. Status changes

`0009_status_sync.sql`. When a status changes in the console, the order's message
in the chat is **edited** to show it — `🆕 Nova`, `⏳ U obradi`, `✅ Završena`,
`❌ Otkazana` next to the order number. An edit rather than a new message: the
chat is a column of order cards and each one should be true, not a feed of
"order 42 is now completed" burying the next order.

The same path as a new order: a trigger on the status column asks `notify-order`
(type `STATUS`), the function edits the message, and `orders.telegram_status`
records what the message now says. The sweep re-sends any edit that did not land,
for a day after the change. A message somebody deleted by hand is recorded as
settled — there is nothing left to edit.

The console's order page says where the chat stands, under the status buttons.

After running `0009`, **deploy the function again** (paste the regenerated
`supabase/dashboard/notify-order.ts`): the old version does not know about edits.

The statuses were renamed to the shop's words in the same migration:
`confirmed → processing`, `done → completed`, `cancelled → canceled`. Existing
orders keep their status under its new name.

## Testing it without touching production

The point is a real message from the real bot into the real group, with no row in
the production database. The local stack is the way: it runs the same migrations
and the same function, and only the Bot API is shared.

```bash
supabase start
supabase db reset                       # migrations + seed, locally

# The real token and the real group, but a local database.
printf 'TELEGRAM_BOT_TOKEN=%s\nNOTIFY_WEBHOOK_SECRET=local-test\n' '<token>' \
  > supabase/.env.local                 # git-ignored
supabase functions serve notify-order --no-verify-jwt --env-file supabase/.env.local
```

In a second terminal, point the local `settings` at the real group and make an
order to announce:

```sql
update public.settings set value = to_jsonb(-1001234567890::bigint)
 where key = 'telegram_chat_id';

with o as (
  insert into public.orders (locale, total_rsd) values ('sr', 3420) returning id
), i as (
  insert into public.order_items (order_id, variant, qty, unit_price_rsd, name_snapshot)
  select o.id, 'piece', 2, 570, 'Čizkejk Njujork <test> & co' from o
)
insert into public.order_answers (order_id, field_key, label_snapshot, value, position)
select o.id, 'phone', 'Telefon', '+381 64 123 4567', 0 from o;

select id from public.orders order by created_at desc limit 1;
```

Then invoke the function exactly as the webhook would:

```bash
curl -i -X POST http://127.0.0.1:54321/functions/v1/notify-order \
  -H 'content-type: application/json' \
  -H 'x-notify-secret: local-test' \
  -d '{"type":"INSERT","table":"orders","record":{"id":"<the id>"}}'
```

Run it twice. The second call must answer `{"skipped":"already_sent"}` and the
group must not show a second message.

### The message itself

Two suites run without any of that, because they need no runtime:

```bash
npm run check:notify
```

`scripts/check-notify-message.ts` covers the escaping and the 4096-character
limit; `scripts/check-notify-delivery.ts` drives `deliver.ts` against fixed
Telegram responses — a revoked token, a wrong chat id, a flood wait, a group
upgraded to a supergroup, a duplicate webhook. What they cannot cover is whether
the real API still answers the way it is documented to, which is what the manual
pass above is for.

---

## When a message does not arrive

Every order that has not been announced, worst first:

```sql
select * from public.orders_awaiting_notification;
```

`gave_up` marks the ones past ten attempts, which the sweep no longer picks up.
`notify_error` holds what Telegram said. The usual three:

| `notify_error`                | what happened                                                                |
| ----------------------------- | ---------------------------------------------------------------------------- |
| `Unauthorized`                | the token was revoked or mistyped — set it again with `supabase secrets set` |
| `Bad Request: chat not found` | the chat id is wrong, or the bot was removed from the group                  |
| `429, retry after Ns`         | a flood wait longer than five seconds; the sweep is already handling it      |

To push one order through by hand once the cause is fixed, clear the attempt
count and wait for the sweep — or call the function with its id, as in the test
above:

```sql
update public.orders set notify_attempts = 0 where id = '<uuid>';
```

Function logs are structured, one JSON object per line, and carry the order id on
every path (`sent`, `send_failed`, `already_sent`, `rate_limited`,
`chat_migrated`, `unauthorised`). The token appears in none of them.

## Not built, on purpose

Inline buttons and anything incoming: no `setWebhook`, no callback endpoint, no
updates consumed. Status changes come from the console and flow one way, into the
chat. The send is one injected function and the outcome is recorded
through one more, so a "confirm" button becomes an addition rather than a rewrite.
