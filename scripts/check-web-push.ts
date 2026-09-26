/**
 * Web Push, checked from the browser's side.
 *
 *   node --experimental-strip-types scripts/check-web-push.ts
 *
 * `push.ts` encrypts to a browser's key and signs with ours. The only proof
 * either is right is doing the other half: here a key pair plays the browser,
 * decrypts what we produced exactly as RFC 8291 says a browser must, and the
 * VAPID signature is verified against the public key a browser would have been
 * given. If this passes, a real push service has nothing left to object to but
 * the network.
 */

import {
  base64UrlDecode,
  base64UrlEncode,
  encryptPayload,
  vapidAuthorization,
} from "../supabase/functions/notify-order/push.ts";

let failures = 0;
function check(name: string, condition: boolean, detail = ""): void {
  if (condition) console.log(`  ok   ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function hkdf(salt: Uint8Array<ArrayBuffer>, ikm: Uint8Array<ArrayBuffer>, info: Uint8Array<ArrayBuffer>, length: number) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(
    await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, length * 8),
  );
}

function concat(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** The browser's half of RFC 8291 — written from the RFC, not from push.ts. */
async function decrypt(body: Uint8Array<ArrayBuffer>, browser: CryptoKeyPair, authSecret: Uint8Array<ArrayBuffer>) {
  const salt = body.slice(0, 16);
  const recordSize = new DataView(body.buffer, body.byteOffset).getUint32(16);
  const idLength = body[20]!;
  const serverPublic = body.slice(21, 21 + idLength);
  const ciphertext = body.slice(21 + idLength);

  const browserPublic = new Uint8Array(await crypto.subtle.exportKey("raw", browser.publicKey));
  const serverKey = await crypto.subtle.importKey("raw", serverPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: serverKey }, browser.privateKey, 256),
  );

  const ikm = await hkdf(authSecret, shared, concat(encoder.encode("WebPush: info\0"), browserPublic, serverPublic), 32);
  const cek = await hkdf(salt, ikm, encoder.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, encoder.encode("Content-Encoding: nonce\0"), 12);

  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]);
  const padded = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, key, ciphertext));

  // Strip padding: trailing zeros, then the delimiter, which must be 0x02 for
  // the last (here, only) record.
  let end = padded.length - 1;
  while (end >= 0 && padded[end] === 0) end -= 1;
  return { plaintext: padded.slice(0, end), delimiter: padded[end], recordSize, idLength };
}

async function browser() {
  const keys = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveBits",
  ])) as CryptoKeyPair;
  const auth = crypto.getRandomValues(new Uint8Array(16));
  return {
    keys,
    auth,
    subscription: {
      p256dh: base64UrlEncode(new Uint8Array(await crypto.subtle.exportKey("raw", keys.publicKey))),
      auth: base64UrlEncode(auth),
    },
  };
}

console.log("encryption (RFC 8291, aes128gcm)");
{
  const device = await browser();
  const message = { title: "Nova porudžbina #42", body: "Kafić «Kod Mike» · 12 kom. · 5.400 RSD", url: "/admin/orders/x" };
  const body = await encryptPayload(encoder.encode(JSON.stringify(message)), device.subscription);
  const opened = await decrypt(body, device.keys, device.auth);

  check("the browser can decrypt it", decoder.decode(opened.plaintext) === JSON.stringify(message));
  check("single-record delimiter 0x02", opened.delimiter === 2);
  check("record size 4096", opened.recordSize === 4096);
  check("key id is an uncompressed P-256 point", opened.idLength === 65);

  const again = await encryptPayload(encoder.encode(JSON.stringify(message)), device.subscription);
  check("two sends of the same message differ on the wire", base64UrlEncode(again) !== base64UrlEncode(body));

  const stranger = await browser();
  const wrongReader = await decrypt(body, stranger.keys, stranger.auth).then(
    () => "decrypted",
    () => "refused",
  );
  check("another browser cannot read it", wrongReader === "refused");

  const tooBig = await encryptPayload(new Uint8Array(3001), device.subscription).then(
    () => "sent",
    (error: Error) => error.message,
  );
  check("an oversized payload is refused before sending", /limit/.test(tooBig), tooBig);
}

console.log("\nVAPID (RFC 8292)");
{
  const pair = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const publicRaw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const keys = { publicKey: base64UrlEncode(publicRaw), privateKey: jwk.d!, subject: "mailto:orders@example.com" };

  const now = Date.UTC(2026, 8, 26, 12, 0, 0);
  const header = await vapidAuthorization("https://fcm.googleapis.com/fcm/send/abc123", keys, now);
  const match = /^vapid t=([^,]+), k=(.+)$/.exec(header);
  check("header has the vapid t=…, k=… shape", Boolean(match), header.slice(0, 40));

  const [encodedHeader, encodedClaims, encodedSignature] = (match?.[1] ?? "").split(".");
  const claims = JSON.parse(decoder.decode(base64UrlDecode(encodedClaims ?? "")));
  const jose = JSON.parse(decoder.decode(base64UrlDecode(encodedHeader ?? "")));

  check("ES256", jose.alg === "ES256");
  check("audience is the push service origin, not the full endpoint", claims.aud === "https://fcm.googleapis.com");
  check("expires within 24 hours", claims.exp - now / 1000 > 0 && claims.exp - now / 1000 <= 24 * 3600);
  check("carries the contact", claims.sub === "mailto:orders@example.com");
  check("k= is our public key", match?.[2] === keys.publicKey);

  const verified = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    pair.publicKey,
    base64UrlDecode(encodedSignature ?? ""),
    encoder.encode(`${encodedHeader}.${encodedClaims}`),
  );
  check("the signature verifies against the public key", verified);
}

console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
