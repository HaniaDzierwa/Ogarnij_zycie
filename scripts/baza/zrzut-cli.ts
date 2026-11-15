// Zrzut bazy bez klucza konta serwisowego – przez konto Google zalogowane w Firebase CLI
// (`npx firebase login`, właściciel projektu). Tylko odczyt. Ten sam wynik co `baza:zrzut`.
//   npm run baza:zrzut-cli [-- --projekt=ogarnij-zycie] [--folder=firebase-export-RRRR-MM-DD]

import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
// @ts-expect-error -- wewnętrzny moduł Firebase CLI, bez typów (logowanie konta Google z `npx firebase login`)
import { getAccessToken, getGlobalDefaultAccount } from 'firebase-tools/lib/auth.js'
import { args, fail } from './common.ts'
import {
  countByCollection,
  fromRestFields,
  type AuthDump,
  type FirestoreDump,
  type RestValue,
} from './format.ts'

const a = args()
const project = a.projekt ?? 'ogarnij-zycie'
const folder = a.folder ?? `firebase-export-${new Date().toISOString().slice(0, 10)}`

const account = getGlobalDefaultAccount()
if (!account) fail('Firebase CLI nie jest zalogowane – uruchom: npx firebase login')
console.log(`Zrzut projektu „${project}” (konto ${account.user.email}) → ${folder}\\`)

const scopes = ['https://www.googleapis.com/auth/cloud-platform']
const token = async () =>
  (await getAccessToken(account.tokens.refresh_token, scopes)).access_token as string

const root = `projects/${project}/databases/(default)/documents`
const api = 'https://firestore.googleapis.com/v1'

async function call<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) fail(`Firestore odpowiedział ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return (await res.json()) as T
}

/** Podkolekcje dokumentu (albo kolekcje główne dla `parent = root`). */
async function collectionIds(parent: string): Promise<string[]> {
  const ids: string[] = []
  let pageToken: string | undefined
  do {
    const r = await call<{ collectionIds?: string[]; nextPageToken?: string }>(
      `${api}/${parent}:listCollectionIds`,
      { pageSize: 300, pageToken },
    )
    ids.push(...(r.collectionIds ?? []))
    pageToken = r.nextPageToken
  } while (pageToken)
  return ids
}

const docs: FirestoreDump['dokumenty'] = []

/** Dokumenty kolekcji (także „puste” dokumenty-foldery, np. private/{uid}) i ich podkolekcje. */
async function walk(collectionPath: string) {
  let pageToken: string | undefined
  const names: string[] = []
  do {
    const q = new URLSearchParams({ pageSize: '300', showMissing: 'true' })
    if (pageToken) q.set('pageToken', pageToken)
    const r = await call<{
      documents?: { name: string; fields?: Record<string, RestValue>; createTime?: string }[]
      nextPageToken?: string
    }>(`${api}/${collectionPath}?${q}`)
    for (const d of r.documents ?? []) {
      names.push(d.name)
      // brak createTime – dokument nie istnieje, ma tylko podkolekcje
      if (d.createTime)
        docs.push({ sciezka: d.name.slice(root.length + 1), dane: fromRestFields(d.fields ?? {}) })
    }
    pageToken = r.nextPageToken
  } while (pageToken)
  for (const name of names) for (const id of await collectionIds(name)) await walk(`${name}/${id}`)
}

for (const id of await collectionIds(root)) await walk(`${root}/${id}`)

// konta logowania – eksport Firebase CLI (hasła zaszyfrowane przez Firebase)
mkdirSync(folder, { recursive: true })
const tmp = join(folder, 'konta-cli.json')
execSync(`npx firebase auth:export "${tmp}" --format=json --project ${project}`, {
  stdio: 'ignore',
})
type CliUser = {
  localId: string
  email?: string
  emailVerified?: boolean
  displayName?: string
  disabled?: boolean
  passwordHash?: string
  salt?: string
  createdAt?: string
  lastSignedInAt?: string
}
const cliUsers = (JSON.parse(readFileSync(tmp, 'utf8')) as { users: CliUser[] }).users
rmSync(tmp)
const when = (ms?: string) => (ms ? new Date(Number(ms)).toUTCString() : undefined)
const users: AuthDump['konta'] = cliUsers.map((u) => ({
  uid: u.localId,
  email: u.email,
  emailVerified: !!u.emailVerified,
  displayName: u.displayName,
  disabled: !!u.disabled,
  passwordHash: u.passwordHash,
  passwordSalt: u.salt,
  creationTime: when(u.createdAt),
  lastSignInTime: when(u.lastSignedInAt),
}))

const now = new Date().toISOString()
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
