// Firestore przez REST z kontem serwisowym (Worker nie ma Firebase SDK). Konto serwisowe omija
// reguły – Worker czyta wszystko, ale zapisuje tylko sprzątanie (etap 6).

import { b64url } from './webpush.ts'

export type ServiceAccount = { client_email: string; private_key: string; token_uri?: string }

const SCOPE = 'https://www.googleapis.com/auth/datastore'
const enc = new TextEncoder()

/** Klucz RSA z pliku konta serwisowego (PEM „BEGIN PRIVATE KEY”) do podpisu RS256. */
async function rsaKey(pem: string): Promise<CryptoKey> {
  const body = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0))
  return crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

let cached: { token: string; until: number } | null = null

/** Token dostępu Google (ważny godzinę; trzymamy go w pamięci Workera do 55 min). */
export async function accessToken(sa: ServiceAccount, fetchFn: typeof fetch = fetch) {
  const now = Math.floor(Date.now() / 1000)
  if (cached && cached.until > now) return cached.token
  const tokenUri = sa.token_uri ?? 'https://oauth2.googleapis.com/token'
  const header = b64url(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })))
  const claims = b64url(
    enc.encode(
      JSON.stringify({
        iss: sa.client_email,
        scope: SCOPE,
        aud: tokenUri,
        iat: now,
        exp: now + 3600,
      }),
    ),
  )
  const unsigned = `${header}.${claims}`
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    await rsaKey(sa.private_key),
    enc.encode(unsigned),
  )
  const res = await fetchFn(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${unsigned}.${b64url(sig)}`,
  })
  if (!res.ok) throw new Error(`Token Google: ${res.status} ${await res.text()}`)
  const json = (await res.json()) as { access_token: string }
  cached = { token: json.access_token, until: now + 55 * 60 }
  return json.access_token
}

// ── Wartości Firestore REST ↔ zwykłe obiekty ───────────────────────────────

type FsValue = {
  nullValue?: null
  booleanValue?: boolean
  integerValue?: string
  doubleValue?: number
  stringValue?: string
  timestampValue?: string
  mapValue?: { fields?: Record<string, FsValue> }
  arrayValue?: { values?: FsValue[] }
}

export function fromValue(v: FsValue): unknown {
  if ('nullValue' in v) return null
  if ('booleanValue' in v) return v.booleanValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('stringValue' in v) return v.stringValue
  // znacznik czasu – jako liczba ms
  if ('timestampValue' in v) return Date.parse(v.timestampValue!)
  if ('mapValue' in v) return fromFields(v.mapValue?.fields ?? {})
  if ('arrayValue' in v) return (v.arrayValue?.values ?? []).map(fromValue)
  return null
}

export function fromFields(fields: Record<string, FsValue>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, fromValue(v)]))
}

export function toValue(x: unknown): FsValue {
  if (x === null || x === undefined) return { nullValue: null }
  if (typeof x === 'boolean') return { booleanValue: x }
  if (typeof x === 'number')
    return Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x }
  if (typeof x === 'string') return { stringValue: x }
  if (x instanceof Date) return { timestampValue: x.toISOString() }
  if (Array.isArray(x)) return { arrayValue: { values: x.map(toValue) } }
  return {
    mapValue: {
      fields: Object.fromEntries(Object.entries(x as object).map(([k, v]) => [k, toValue(v)])),
    },
  }
}

/** Dokument z bazy: pełna ścieżka (np. „houses/dom1/tasks/t1”), id, pola, czas utworzenia (ms). */
export type Doc = {
  path: string
  id: string
  data: Record<string, unknown>
  createTime: number
  updateTime: number
}

type RawDoc = {
  name: string
  fields?: Record<string, FsValue>
  createTime: string
  updateTime: string
}

function toDoc(raw: RawDoc): Doc {
  const path = raw.name.replace(/^projects\/[^/]+\/databases\/\(default\)\/documents\//, '')
  return {
    path,
    id: path.split('/').pop()!,
    data: fromFields(raw.fields ?? {}),
    createTime: Date.parse(raw.createTime),
    updateTime: Date.parse(raw.updateTime),
  }
}

/** Klient REST dla jednego projektu. */
export function firestore(
  projectId: string,
  token: () => Promise<string>,
  fetchFn: typeof fetch = fetch,
) {
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`
  const call = async (url: string, init: RequestInit = {}) => {
    const res = await fetchFn(url, {
      ...init,
      headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
    })
    if (!res.ok)
      throw new Error(`Firestore ${init.method ?? 'GET'} ${url}: ${res.status} ${await res.text()}`)
    return res.status === 204 ? null : res.json()
  }

  return {
    /** Wszystkie dokumenty kolekcji (stronami po 300). */
    async list(collectionPath: string): Promise<Doc[]> {
      const out: Doc[] = []
      let pageToken = ''
      do {
        const url = `${base}/${collectionPath}?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`
        const json = (await call(url)) as { documents?: RawDoc[]; nextPageToken?: string }
        out.push(...(json.documents ?? []).map(toDoc))
        pageToken = json.nextPageToken ?? ''
      } while (pageToken)
      return out
    },

    /** Zapytanie po wszystkich kolekcjach o tej nazwie (np. „tasks”): pole >= wartość. */
    async changedSince(collectionId: string, field: string, sinceMs: number): Promise<Doc[]> {
      const json = (await call(`${base}:runQuery`, {
        method: 'POST',
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId, allDescendants: true }],
            where: {
              fieldFilter: {
                field: { fieldPath: field },
                op: 'GREATER_THAN_OR_EQUAL',
                value: { timestampValue: new Date(sinceMs).toISOString() },
              },
            },
          },
        }),
      })) as { document?: RawDoc }[]
      return json.filter((r) => r.document).map((r) => toDoc(r.document!))
    },

    /** Zmiana wybranych pól dokumentu. */
    async update(path: string, fields: Record<string, unknown>) {
      const mask = Object.keys(fields)
        .map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`)
        .join('&')
      await call(`${base}/${path}?${mask}`, {
        method: 'PATCH',
        body: JSON.stringify({ fields: toValue(fields).mapValue!.fields }),
      })
    },

    async remove(path: string) {
      await call(`${base}/${path}`, { method: 'DELETE' })
    },
  }
}

export type Firestore = ReturnType<typeof firestore>
