/**
 * Web Push, by hand, on WebCrypto.
 *
 * A push message is encrypted to one browser (RFC 8291, `aes128gcm`) and the
 * request is signed by us (RFC 8292, VAPID), so the browser vendor's push service
 * can deliver it without being able to read it and without taking our word for
 * who sent it.
 *
 * Written against WebCrypto only — no `node:crypto`, no Deno APIs — which is the
 * whole reason it is written here rather than imported: the same file runs in
 * the Edge Function and under Node in `scripts/check-web-push.ts`, where the
 * output is decrypted again and the signature verified.
 */

const encoder = new TextEncoder();

export type PushTarget = {
  id: string;
  endpoint: string;
  /** The browser's public key, base64url, uncompressed P-256 point. */
  p256dh: string;
  /** The browser's auth secret, base64url, 16 bytes. */
  auth: string;
};

export type VapidKeys = {
  /** base64url, 65 bytes: the uncompressed public point. */
  publicKey: string;
  /** base64url, 32 bytes: the private scalar. */
  privateKey: string;
  /** mailto: or https: — who push services contact if something is wrong. */
  subject: string;
};

export type PushResult = {
  ok: boolean;
  status: number;
  /** 404/410: the browser unsubscribed or the subscription expired. Delete it. */
  gone: boolean;
  error?: string;
};

/** One record, so the payload must leave room for the 16-byte tag and delimiter. */
const RECORD_SIZE = 4096;
export const MAX_PAYLOAD = 3000;

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
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

/** RFC 5869, extract-and-expand in one call — which is what WebCrypto's HKDF is. */
async function hkdf(
  salt: Uint8Array<ArrayBuffer>,
  ikm: Uint8Array<ArrayBuffer>,
  info: Uint8Array<ArrayBuffer>,
  length: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

/**
 * RFC 8291 §3 — encrypt one payload to one browser.
 *
 * `salt` and `localKeys` are parameters only so the tests can pin them; in use
 * both are fresh for every message, which is what makes two identical
 * notifications unlinkable on the wire.
 */
export async function encryptPayload(
  payload: Uint8Array<ArrayBuffer>,
  target: Pick<PushTarget, "p256dh" | "auth">,
  pinned: { salt?: Uint8Array<ArrayBuffer>; localKeys?: CryptoKeyPair } = {},
): Promise<Uint8Array<ArrayBuffer>> {
  if (payload.length > MAX_PAYLOAD) {
    throw new Error(`push payload is ${payload.length} bytes, the limit here is ${MAX_PAYLOAD}`);
  }

  const uaPublic = base64UrlDecode(target.p256dh);
  const authSecret = base64UrlDecode(target.auth);

  const local =
    pinned.localKeys ??
    ((await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
      "deriveBits",
    ])) as CryptoKeyPair);
  const localPublic = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));

  const uaKey = await crypto.subtle.importKey(
    "raw",
    uaPublic,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, local.privateKey, 256),
  );

  // key_info = "WebPush: info" || 0x00 || ua_public || as_public
  const ikm = await hkdf(
    authSecret,
    shared,
    concat(encoder.encode("WebPush: info\0"), uaPublic, localPublic),
    32,
  );

  const salt = pinned.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, encoder.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, encoder.encode("Content-Encoding: nonce\0"), 12);

  // One record, so the padding delimiter is 0x02 ("last record") and no padding.
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      key,
      concat(payload, new Uint8Array([2])),
    ),
  );

  // RFC 8188 header: salt(16) · rs(4, big endian) · idlen(1) · keyid(idlen)
  const header = new Uint8Array(21 + localPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, RECORD_SIZE);
  header[20] = localPublic.length;
  header.set(localPublic, 21);

  return concat(header, ciphertext);
}

/**
 * RFC 8292 — the `Authorization` header that proves the request is ours.
 *
 * A JWT for the push service's origin, signed with the private half of the key
 * pair the browser was given the public half of when it subscribed.
 */
export async function vapidAuthorization(
  endpoint: string,
  keys: VapidKeys,
  now: number = Date.now(),
): Promise<string> {
  const json = (value: unknown) => base64UrlEncode(encoder.encode(JSON.stringify(value)));

  const unsigned = `${json({ typ: "JWT", alg: "ES256" })}.${json({
    aud: new URL(endpoint).origin,
    // Twelve hours: well under the twenty-four the spec allows.
    exp: Math.floor(now / 1000) + 12 * 60 * 60,
    sub: keys.subject,
  })}`;

  const publicKey = base64UrlDecode(keys.publicKey);
  const signingKey = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      d: keys.privateKey,
      x: base64UrlEncode(publicKey.slice(1, 33)),
      y: base64UrlEncode(publicKey.slice(33, 65)),
      ext: true,
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  // WebCrypto signs ECDSA as r‖s, 64 bytes — exactly the JWS ES256 encoding,
  // with no DER to unwrap.
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      signingKey,
      encoder.encode(unsigned),
    ),
  );

  return `vapid t=${unsigned}.${base64UrlEncode(signature)}, k=${keys.publicKey}`;
}

export async function sendPush(
  target: PushTarget,
  message: unknown,
  keys: VapidKeys,
  fetcher: typeof fetch = fetch,
): Promise<PushResult> {
  try {
    const body = await encryptPayload(encoder.encode(JSON.stringify(message)), target);

    const response = await fetcher(target.endpoint, {
      method: "POST",
      headers: {
        authorization: await vapidAuthorization(target.endpoint, keys),
        "content-encoding": "aes128gcm",
        "content-type": "application/octet-stream",
        // A new order is urgent, and worth delivering to a phone that was off
        // for the afternoon — but not tomorrow.
        ttl: String(6 * 60 * 60),
        urgency: "high",
      },
      body,
    });

    const gone = response.status === 404 || response.status === 410;
    if (response.ok) return { ok: true, status: response.status, gone: false };

    const text = await response.text().catch(() => "");
    return {
      ok: false,
      status: response.status,
      gone,
      error: text.slice(0, 300) || `http ${response.status}`,
    };
  } catch (cause) {
    return {
      ok: false,
      status: 0,
      gone: false,
      error: cause instanceof Error ? cause.message : "push failed",
    };
  }
}
