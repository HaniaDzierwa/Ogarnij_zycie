// Web Push bez bibliotek – samo WebCrypto (działa w Cloudflare Workers i w Node):
// szyfrowanie treści RFC 8291 (aes128gcm) i podpis VAPID RFC 8292 (ES256).

export type Subscription = { endpoint: string; keys: { p256dh: string; auth: string } }
export type Vapid = { publicKey: string; privateKey: string; subject: string }

const enc = new TextEncoder()

export function b64url(bytes: Uint8Array | ArrayBuffer): string {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ''
  for (const x of b) s += String.fromCharCode(x)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function unb64url(s: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (s.length % 4)) % 4)
  const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

function concat(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let i = 0
  for (const p of parts) {
    out.set(p, i)
    i += p.length
  }
  return out
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, bytes: number) {
  const key = await crypto.subtle.importKey('raw', ikm as BufferSource, 'HKDF', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: salt as BufferSource, info: info as BufferSource },
    key,
    bytes * 8,
  )
  return new Uint8Array(bits)
}

/** Klucz prywatny VAPID (32 bajty d, base64url) + publiczny (65 bajtów 04|x|y) → klucz do podpisu. */
async function vapidSigningKey(v: Vapid): Promise<CryptoKey> {
  const pub = unb64url(v.publicKey)
  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    d: v.privateKey,
    x: b64url(pub.slice(1, 33)),
    y: b64url(pub.slice(33, 65)),
    ext: true,
  }
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, [
    'sign',
  ])
}

/** Nagłówek „Authorization: vapid t=…, k=…” dla adresu subskrypcji (ważny 12 h). */
export async function vapidHeader(endpoint: string, v: Vapid, now = Date.now()): Promise<string> {
  const aud = new URL(endpoint).origin
  const header = b64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const claims = b64url(
    enc.encode(JSON.stringify({ aud, exp: Math.floor(now / 1000) + 12 * 3600, sub: v.subject })),
  )
  const unsigned = `${header}.${claims}`
  // WebCrypto podpisuje w formacie r|s (64 bajty) – dokładnie tak, jak wymaga JWT ES256
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    await vapidSigningKey(v),
    enc.encode(unsigned),
  )
  return `vapid t=${unsigned}.${b64url(sig)}, k=${v.publicKey}`
}

/** Szyfrowanie treści dla jednej subskrypcji (RFC 8291, jeden rekord aes128gcm). */
export async function encryptPayload(
  sub: Subscription,
  payload: string,
  salt: Uint8Array = crypto.getRandomValues(new Uint8Array(16)),
): Promise<Uint8Array<ArrayBuffer>> {
  const uaPublic = unb64url(sub.keys.p256dh)
  const authSecret = unb64url(sub.keys.auth)
  const local = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ])) as CryptoKeyPair
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey))
  const uaKey = await crypto.subtle.importKey(
    'raw',
    uaPublic,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  )
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256),
  )
  const keyInfo = concat(enc.encode('WebPush: info\0'), uaPublic, asPublic)
  const ikm = await hkdf(authSecret, shared, keyInfo, 32)
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12)
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  // treść + 0x02 (ostatni rekord, bez dopełnienia)
  const plain = concat(enc.encode(payload), new Uint8Array([2]))
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, plain),
  )
  const rs = new Uint8Array([0, 0, 0x10, 0]) // 4096
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, cipher)
}

export type SendResult = 'sent' | 'gone' | 'error'

/** Wysyłka jednego powiadomienia; 404/410 – telefon zrezygnował (subskrypcję trzeba usunąć). */
export async function sendPush(
  sub: Subscription,
  message: { title: string; body: string; url?: string; tag?: string },
  vapid: Vapid,
  fetchFn: typeof fetch = fetch,
): Promise<SendResult> {
  const body = await encryptPayload(sub, JSON.stringify(message))
  const res = await fetchFn(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidHeader(sub.endpoint, vapid),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
      Urgency: 'normal',
    },
    body,
  })
  if (res.status === 404 || res.status === 410) return 'gone'
  return res.ok ? 'sent' : 'error'
}
