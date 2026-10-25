// @vitest-environment node
// Sprawdzamy tak, jak zrobi to telefon: odszyfrowujemy treść kluczem „telefonu” i weryfikujemy
// podpis VAPID kluczem publicznym.

import { describe, expect, test } from 'vitest'
import { b64url, encryptPayload, sendPush, unb64url, vapidHeader } from './webpush.ts'

const enc = new TextEncoder()

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, bytes: number) {
  const key = await crypto.subtle.importKey('raw', ikm as BufferSource, 'HKDF', false, [
    'deriveBits',
  ])
  return new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt: salt as BufferSource, info: info as BufferSource },
      key,
      bytes * 8,
    ),
  )
}

/** „Telefon”: klucze subskrypcji i odszyfrowanie wg RFC 8291. */
async function phone() {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ])) as CryptoKeyPair
  const uaPublic = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey))
  const auth = crypto.getRandomValues(new Uint8Array(16))
  const sub = {
    endpoint: 'https://push.example.com/abc',
    keys: { p256dh: b64url(uaPublic), auth: b64url(auth) },
  }
  const decrypt = async (body: Uint8Array) => {
    const salt = body.slice(0, 16)
    const idlen = body[20]
    const asPublic = body.slice(21, 21 + idlen)
    const cipher = body.slice(21 + idlen)
    const asKey = await crypto.subtle.importKey(
      'raw',
      asPublic,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      [],
    )
    const shared = new Uint8Array(
      await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, pair.privateKey, 256),
    )
    const info = new Uint8Array([...enc.encode('WebPush: info\0'), ...uaPublic, ...asPublic])
    const ikm = await hkdf(auth, shared, info, 32)
    const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16)
    const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12)
    const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt'])
    const plain = new Uint8Array(
      await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, cipher),
    )
    expect(plain.at(-1)).toBe(2)
    return new TextDecoder().decode(plain.slice(0, -1))
  }
  return { sub, decrypt }
}

async function vapidKeys() {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey)
  const publicKey = b64url(await crypto.subtle.exportKey('raw', pair.publicKey))
  return {
    vapid: { publicKey, privateKey: jwk.d!, subject: 'https://ogarnij-zycie.web.app' },
    verifyKey: pair.publicKey,
  }
}

describe('Web Push', () => {
  test('treść zaszyfrowana tak, że telefon ją odczyta (RFC 8291)', async () => {
    const { sub, decrypt } = await phone()
    const body = await encryptPayload(sub, '{"title":"Jutro termin","body":"Wymienić filtr"}')
    expect([...body.slice(16, 20)]).toEqual([0, 0, 16, 0])
    expect(body[20]).toBe(65)
    expect(await decrypt(body)).toBe('{"title":"Jutro termin","body":"Wymienić filtr"}')
  })

  test('podpis VAPID: adres usługi, ważność, kontakt; podpis się zgadza', async () => {
    const { vapid, verifyKey } = await vapidKeys()
    const header = await vapidHeader(
      'https://fcm.googleapis.com/fcm/send/xyz',
      vapid,
      1_000_000_000,
    )
    const [, jwt, k] = /^vapid t=([^,]+), k=(.+)$/.exec(header)!
    expect(k).toBe(vapid.publicKey)
    const [h, c, s] = jwt.split('.')
    expect(JSON.parse(new TextDecoder().decode(unb64url(c)))).toEqual({
      aud: 'https://fcm.googleapis.com',
      exp: 1_000_000 + 12 * 3600,
      sub: 'https://ogarnij-zycie.web.app',
    })
    const ok = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      verifyKey,
      unb64url(s),
      enc.encode(`${h}.${c}`),
    )
    expect(ok).toBe(true)
  })

  test('wysyłka: nagłówki; 410 – subskrypcja wygasła', async () => {
    const { sub } = await phone()
    const { vapid } = await vapidKeys()
    const calls: RequestInit[] = []
    const fake = (status: number) =>
      (async (_url: string, init: RequestInit) => {
        calls.push(init)
        return new Response(null, { status })
      }) as unknown as typeof fetch
    expect(await sendPush(sub, { title: 'T', body: 'B' }, vapid, fake(201))).toBe('sent')
    const h = calls[0].headers as Record<string, string>
    expect(h['Content-Encoding']).toBe('aes128gcm')
    expect(h.TTL).toBe('86400')
    expect(h.Authorization).toMatch(/^vapid t=/)
    expect(await sendPush(sub, { title: 'T', body: 'B' }, vapid, fake(410))).toBe('gone')
    expect(await sendPush(sub, { title: 'T', body: 'B' }, vapid, fake(500))).toBe('error')
  })
})
