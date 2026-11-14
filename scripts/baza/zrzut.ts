// Zrzut całej bazy Firestore i kont logowania do folderu firebase-export-RRRR-MM-DD/ (tylko odczyt).
// Uruchomienie (instrukcja: docs/FIREBASE.md → „Zrzut bazy i przeniesienie”):
//   npm run baza:zrzut -- --klucz="C:\…\ogarnij-zycie-firebase-adminsdk-….json"

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CollectionReference, DocumentReference } from 'firebase-admin/firestore'
import { args, connect } from './common.ts'
import { countByCollection, encode, type AuthDump, type FirestoreDump } from './format.ts'

const a = args()
const { project, db, auth, types } = connect(a.klucz)
const folder = a.folder ?? `firebase-export-${new Date().toISOString().slice(0, 10)}`
console.log(`Zrzut projektu „${project}” → ${folder}\\`)

const docs: FirestoreDump['dokumenty'] = []

/** Wszystkie dokumenty kolekcji i ich podkolekcje (także „puste” dokumenty-foldery, np. private/{uid}). */
async function walk(col: CollectionReference) {
  const refs = await col.listDocuments()
  for (let i = 0; i < refs.length; i += 300) {
    const part = refs.slice(i, i + 300)
    const snaps = await db.getAll(...part)
    for (const s of snaps)
      if (s.exists) docs.push({ sciezka: s.ref.path, dane: encode(s.data(), types) as never })
  }
  for (const ref of refs) await walkDoc(ref)
}

async function walkDoc(ref: DocumentReference) {
  for (const sub of await ref.listCollections()) await walk(sub)
}

for (const col of await db.listCollections()) await walk(col)

const users: AuthDump['konta'] = []
let page: string | undefined
do {
  const res = await auth.listUsers(1000, page)
  for (const u of res.users)
    users.push({
      uid: u.uid,
      email: u.email,
      emailVerified: u.emailVerified,
      displayName: u.displayName,
      disabled: u.disabled,
      passwordHash: u.passwordHash,
      passwordSalt: u.passwordSalt,
      creationTime: u.metadata.creationTime,
      lastSignInTime: u.metadata.lastSignInTime,
    })
  page = res.pageToken
} while (page)

const now = new Date().toISOString()
mkdirSync(folder, { recursive: true })
writeFileSync(
  join(folder, 'firestore.json'),
  JSON.stringify(
    { projekt: project, utworzono: now, dokumenty: docs } satisfies FirestoreDump,
    null,
    1,
  ),
)
writeFileSync(
  join(folder, 'konta.json'),
  JSON.stringify({ projekt: project, utworzono: now, konta: users } satisfies AuthDump, null, 1),
)

console.log('\nDokumenty w kolekcjach głównych:')
for (const [k, n] of Object.entries(countByCollection(docs.map((d) => d.sciezka))))
  console.log(`  ${k}: ${n}`)
console.log(`Razem dokumentów: ${docs.length}`)
console.log(
  `Kont logowania: ${users.length} (z hasłami: ${users.filter((u) => u.passwordHash).length})`,
)
console.log(`\n✔ Gotowe: ${folder}\\firestore.json i konta.json`)
console.log(
  '  Ten folder to prywatne dane domu – nie wysyłaj go nikomu i nie dodawaj do repozytorium.',
)
process.exit(0)
