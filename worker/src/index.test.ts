// @vitest-environment node
// Całe uruchomienie Workera na udawanej bazie (Firestore REST) i udawanych telefonach.

import { describe, expect, test } from 'vitest'
import { run, type Env } from './index.ts'
import { b64url } from './webpush.ts'

const PROJECT = 'demo'
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`

async function serviceAccount() {
  const pair = (await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair
  const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey))
  const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...der))}\n-----END PRIVATE KEY-----\n`
  return JSON.stringify({ client_email: 'worker@demo.iam', private_key: pem })
}

async function vapid() {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
  ])) as CryptoKeyPair
  return {
    publicKey: b64url(await crypto.subtle.exportKey('raw', pair.publicKey)),
    privateKey: (await crypto.subtle.exportKey('jwk', pair.privateKey)).d!,
  }
}

async function phoneKeys() {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ])) as CryptoKeyPair
  return {
    p256dh: { stringValue: b64url(await crypto.subtle.exportKey('raw', pair.publicKey)) },
    auth: { stringValue: b64url(crypto.getRandomValues(new Uint8Array(16))) },
  }
}

const doc = (
  path: string,
  fields: Record<string, unknown>,
  createTime = '2020-01-01T00:00:00Z',
) => ({
  name: `projects/${PROJECT}/databases/(default)/documents/${path}`,
  fields,
  createTime,
  updateTime: createTime,
})
const s = (v: string) => ({ stringValue: v })
const b = (v: boolean) => ({ booleanValue: v })
const nul = { nullValue: null }
const notif = (house: boolean) => ({
  mapValue: { fields: { tasks: b(true), events: b(true), morning: b(true), house: b(house) } },
})

describe('Worker – jedno uruchomienie', () => {
  test('18:00: Hania dostaje „Jutro termin”; Krzyś dodał zadanie – Hania dostaje zmianę', async () => {
    // 25 paź 2026 po zmianie czasu: Polska = UTC+1 → 18:00 w Polsce = 17:00 UTC
    const now = Date.parse('2026-10-25T17:00:20Z')
    const keys = await phoneKeys()
    const v = await vapid()
    const env: Env = {
      FIREBASE_PROJECT_ID: PROJECT,
      VAPID_PUBLIC_KEY: v.publicKey,
      VAPID_PRIVATE_KEY: v.privateKey,
      VAPID_SUBJECT: 'https://ogarnij-zycie.web.app',
      FIREBASE_SERVICE_ACCOUNT: await serviceAccount(),
    }
    const task = (title: string, due: string | null, createdBy: string) => ({
      title: s(title),
      priority: s('mid'),
      due: due ? s(due) : nul,
      done: b(false),
      deleted: b(false),
      createdBy: s(createdBy),
      updatedBy: s(createdBy),
      doneAt: nul,
      doneBy: nul,
      deletedAt: nul,
    })
    const db: Record<string, unknown[]> = {
      users: [
        doc('users/hania', {
          name: s('Hania'),
          houseId: s('dom1'),
          notif: notif(true),
          summaryTimes: { arrayValue: { values: [s('18:00')] } },
        }),
        doc('users/krzys', {
          name: s('Krzyś'),
          houseId: s('dom1'),
          notif: notif(false),
          summaryTimes: { arrayValue: { values: [s('08:00'), s('12:00'), s('16:00')] } },
        }),
      ],
      'houses/dom1/tasks': [
        doc('houses/dom1/tasks/t1', task('Rachunek za prąd', '2026-10-26', 'hania')),
      ],
      'houses/dom1/private/hania/tasks': [],
      'houses/dom1/events': [],
      'houses/dom1/private/hania/events': [],
      'users/hania/push': [
        doc('users/hania/push/tel', {
          endpoint: s('https://push.example.com/hania'),
          keys: { mapValue: { fields: keys } },
        }),
      ],
      'users/krzys/push': [],
    }
    const sent: string[] = []
    const fake = (async (input: string, init: RequestInit = {}) => {
      const url = String(input)
      if (url.startsWith('https://oauth2.googleapis.com/token'))
        return Response.json({ access_token: 'tok' })
      if (url.startsWith('https://push.example.com/')) {
        sent.push(url)
        return new Response(null, { status: 201 })
      }
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
      if (url === `${BASE}:runQuery`) {
        expect(JSON.parse(String(init.body)).structuredQuery.from).toEqual([
          { collectionId: 'activity', allDescendants: true },
        ])
        // Krzyś dodał zadanie 20 s przed pełną minutą 18:00 (w poprzedniej minucie)
        const at = { timestampValue: '2026-10-25T16:59:40Z' }
        return Response.json([
          {
            document: doc('houses/dom1/activity/a1', {
              kind: s('task-added'),
              title: s('Kupić mleko'),
              detail: nul,
              date: nul,
              actor: s('krzys'),
              at,
            }),
          },
          // wpis sprzed okna (już wysłany minutę wcześniej) – pomijany
          {
            document: doc('houses/dom1/activity/a0', {
              kind: s('task-done'),
              title: s('Stare'),
              detail: nul,
              date: nul,
              actor: s('krzys'),
              at: { timestampValue: '2026-10-25T16:58:59Z' },
            }),
          },
        ])
      }
      const path = url.slice(BASE.length + 1).split('?')[0]
      if (path in db) return Response.json({ documents: db[path] })
      throw new Error(`nieoczekiwany adres: ${url}`)
    }) as unknown as typeof fetch

    const result = await run(now, env, fake)
    expect(result.sent).toBe(2)
    expect(sent).toEqual(['https://push.example.com/hania', 'https://push.example.com/hania'])
  })
})
