/**
 * A Web Push key pair, generated once.
 *
 *   npm run vapid
 *
 * The public half goes into `settings.vapid_public_key` — browsers need it to
 * subscribe, and it is public by design. The private half goes into the
 * notify-order function's secrets and nowhere else: whoever holds it can send
 * notifications to every administrator's phone.
 *
 * WebCrypto, so no dependency and nothing to install. Run it once; running it
 * again makes a new pair, and every device already subscribed would have to
 * subscribe again.
 */
const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
  "sign",
  "verify",
]);

const raw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
const { d } = await crypto.subtle.exportKey("jwk", pair.privateKey);
const publicKey = Buffer.from(raw).toString("base64url");

console.log(`
1) SQL Editor — the public key, readable by the console:

   update public.settings set value = to_jsonb('${publicKey}'::text)
    where key = 'vapid_public_key';

2) Edge Functions → Secrets — the private key, and who push services should
   contact if something goes wrong (any address you read):

   VAPID_PRIVATE_KEY = ${d}
   VAPID_SUBJECT     = mailto:you@example.com

Keep the private key out of chat, screenshots and the repository.
`);
