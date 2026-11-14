// Wspólne dla zrzutu i wgrania bazy: argumenty, połączenie z projektem przez klucz konta serwisowego.

import { readFileSync } from 'node:fs'
import { cert, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { DocumentReference, GeoPoint, getFirestore, Timestamp } from 'firebase-admin/firestore'
import type { SpecialTypes } from './format.ts'

/** `--klucz=plik.json` → { klucz: 'plik.json' }; `--nadpisz` → { nadpisz: 'tak' }. */
export function args(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const a of process.argv.slice(2)) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a)
    if (m) out[m[1]] = m[2] ?? 'tak'
  }
  return out
}

export function fail(message: string): never {
  console.error(`\n✖ ${message}\n`)
  process.exit(1)
}

/** Połączenie z projektem z pliku klucza konta serwisowego (projekt = ten z klucza). */
export function connect(keyPath: string | undefined) {
  if (!keyPath)
    fail('Podaj plik klucza konta serwisowego: --klucz="C:\\…\\…-firebase-adminsdk-….json"')
  let key: { project_id?: string }
  try {
    key = JSON.parse(readFileSync(keyPath, 'utf8'))
  } catch {
    fail(`Nie mogę odczytać klucza: ${keyPath}`)
  }
  if (!key.project_id) fail('To nie wygląda na klucz konta serwisowego Firebase (brak project_id).')
  const app = initializeApp({ credential: cert(keyPath), projectId: key.project_id })
  const db = getFirestore(app)
  const types: SpecialTypes = {
    isTimestamp: (v): v is Timestamp => v instanceof Timestamp,
    isGeoPoint: (v): v is GeoPoint => v instanceof GeoPoint,
    isReference: (v): v is DocumentReference => v instanceof DocumentReference,
    timestamp: (s, ns) => new Timestamp(s, ns),
    geoPoint: (lat, lng) => new GeoPoint(lat, lng),
    reference: (p) => db.doc(p),
  }
  return { project: key.project_id, db, auth: getAuth(app), types }
}
