// Zapis wartości Firestore do zwykłego JSON-a i z powrotem (zrzut bazy – `npm run baza:zrzut`).
// Typy specjalne Firestore dostają znacznik `__typ`, żeby wróciły jako te same typy.

/** Jak rozpoznać i odtworzyć typy specjalne – podaje skrypt (klasy z firebase-admin). */
export type SpecialTypes = {
  isTimestamp: (v: unknown) => v is { seconds: number; nanoseconds: number }
  isGeoPoint: (v: unknown) => v is { latitude: number; longitude: number }
  isReference: (v: unknown) => v is { path: string }
  timestamp: (seconds: number, nanoseconds: number) => unknown
  geoPoint: (latitude: number, longitude: number) => unknown
  reference: (path: string) => unknown
}

type Json = null | boolean | number | string | Json[] | { [k: string]: Json }

/** Wartość z Firestore → JSON. */
export function encode(v: unknown, t: SpecialTypes): Json {
  if (v === null || typeof v === 'boolean' || typeof v === 'string') return v
  if (typeof v === 'number') {
    // NaN / nieskończoność nie mieszczą się w JSON-ie
    return Number.isFinite(v) ? v : { __typ: 'liczba', wartosc: String(v) }
  }
  if (t.isTimestamp(v)) return { __typ: 'czas', s: v.seconds, ns: v.nanoseconds }
  if (t.isGeoPoint(v)) return { __typ: 'miejsce', lat: v.latitude, lng: v.longitude }
  if (t.isReference(v)) return { __typ: 'odnosnik', sciezka: v.path }
  if (v instanceof Uint8Array) return { __typ: 'bajty', base64: Buffer.from(v).toString('base64') }
  if (Array.isArray(v)) return v.map((x) => encode(x, t))
  if (typeof v === 'object') {
    const out: { [k: string]: Json } = {}
    for (const [k, x] of Object.entries(v)) out[k] = encode(x, t)
    return out
  }
  throw new Error(`Nieznany typ wartości: ${typeof v}`)
}

/** JSON → wartość do zapisu w Firestore. */
export function decode(v: Json, t: SpecialTypes): unknown {
  if (Array.isArray(v)) return v.map((x) => decode(x, t))
  if (v === null || typeof v !== 'object') return v
  switch (v.__typ) {
    case 'czas':
      return t.timestamp(v.s as number, v.ns as number)
    case 'miejsce':
      return t.geoPoint(v.lat as number, v.lng as number)
    case 'odnosnik':
      return t.reference(v.sciezka as string)
    case 'bajty':
      return new Uint8Array(Buffer.from(v.base64 as string, 'base64'))
    case 'liczba':
      return Number(v.wartosc)
  }
  const out: Record<string, unknown> = {}
  for (const [k, x] of Object.entries(v)) out[k] = decode(x, t)
  return out
}

/** Wartość z REST API Firestore (zrzut przez logowanie Firebase CLI). */
export type RestValue = {
  nullValue?: null
  booleanValue?: boolean
  integerValue?: string
  doubleValue?: number | string
  timestampValue?: string
  stringValue?: string
  bytesValue?: string
  referenceValue?: string
  geoPointValue?: { latitude?: number; longitude?: number }
  arrayValue?: { values?: RestValue[] }
  mapValue?: { fields?: Record<string, RestValue> }
}

/** Wartość z REST API → ten sam JSON co `encode` (wspólny format zrzutu). */
export function fromRest(v: RestValue): Json {
  if ('nullValue' in v) return null
  if (v.booleanValue !== undefined) return v.booleanValue
  if (v.integerValue !== undefined) return Number(v.integerValue)
  if (v.doubleValue !== undefined) {
    const n = Number(v.doubleValue)
    return Number.isFinite(n) ? n : { __typ: 'liczba', wartosc: String(v.doubleValue) }
  }
  if (v.timestampValue !== undefined) {
    // „2026-10-25T14:38:29.123456Z” – ułamek sekundy do nanosekund
    const m = /^(.*?)(?:\.(\d+))?Z$/.exec(v.timestampValue)
    if (!m) throw new Error(`Zła data: ${v.timestampValue}`)
    return {
      __typ: 'czas',
      s: Date.parse(`${m[1]}Z`) / 1000,
      ns: Number((m[2] ?? '').padEnd(9, '0').slice(0, 9)),
    }
  }
  if (v.stringValue !== undefined) return v.stringValue
  if (v.bytesValue !== undefined) return { __typ: 'bajty', base64: v.bytesValue }
  if (v.referenceValue !== undefined)
    return { __typ: 'odnosnik', sciezka: v.referenceValue.replace(/^.*?\/documents\//, '') }
  if (v.geoPointValue)
    return {
      __typ: 'miejsce',
      lat: v.geoPointValue.latitude ?? 0,
      lng: v.geoPointValue.longitude ?? 0,
    }
  if (v.arrayValue) return (v.arrayValue.values ?? []).map(fromRest)
  if (v.mapValue) return fromRestFields(v.mapValue.fields ?? {})
  throw new Error(`Nieznana wartość: ${JSON.stringify(v)}`)
}

export function fromRestFields(fields: Record<string, RestValue>): { [k: string]: Json } {
  const out: { [k: string]: Json } = {}
  for (const [k, x] of Object.entries(fields)) out[k] = fromRest(x)
  return out
}

/** Plik zrzutu bazy. */
export type FirestoreDump = {
  projekt: string
  utworzono: string
  dokumenty: { sciezka: string; dane: { [k: string]: Json } }[]
}

/** Konto z Authentication (z hasłem zaszyfrowanym przez Firebase – bez jawnych haseł). */
export type AuthUserDump = {
  uid: string
  email?: string
  emailVerified: boolean
  displayName?: string
  disabled: boolean
  passwordHash?: string
  passwordSalt?: string
  creationTime?: string
  lastSignInTime?: string
}

export type AuthDump = { projekt: string; utworzono: string; konta: AuthUserDump[] }

/** Podsumowanie zrzutu: ile dokumentów w każdej kolekcji głównej. */
export function countByCollection(paths: string[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const p of paths) {
    const top = p.split('/')[0]
    out[top] = (out[top] ?? 0) + 1
  }
  return out
}
