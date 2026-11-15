// Usuwa wygasłe zaproszenia (kod ważny 10 minut – INVITE_MINUTES) przez konto zalogowane w Firebase CLI.
// Bez `--usun` tylko pokazuje, co by usunął. Ważnych (świeżych) zaproszeń nie rusza.
//   npm run baza:usun-zaproszenia [-- --usun] [--projekt=ogarnij-zycie]

// @ts-expect-error -- wewnętrzny moduł Firebase CLI, bez typów (logowanie konta Google z `npx firebase login`)
import { getAccessToken, getGlobalDefaultAccount } from 'firebase-tools/lib/auth.js'
// jak INVITE_MINUTES w src/firebase/model.ts (tam import aplikacji, nie do uruchomienia w Node)
const INVITE_MINUTES = 10
import { args, fail } from './common.ts'

const a = args()
const project = a.projekt ?? 'ogarnij-zycie'
const account = getGlobalDefaultAccount()
if (!account) fail('Firebase CLI nie jest zalogowane – uruchom: npx firebase login')

const token = async () =>
  (
    await getAccessToken(account.tokens.refresh_token, [
      'https://www.googleapis.com/auth/cloud-platform',
    ])
  ).access_token as string
const root = `projects/${project}/databases/(default)/documents`
const fs = 'https://firestore.googleapis.com/v1'

async function call<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) fail(`Firestore odpowiedział ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return (await res.json()) as T
}

type Invite = {
  name: string
  fields?: {
    houseName?: { stringValue?: string }
    inviterName?: { stringValue?: string }
    createdAt?: { timestampValue?: string }
    usedBy?: { stringValue?: string }
  }
}

const invites: Invite[] = []
let pageToken: string | undefined
do {
  const q = new URLSearchParams({ pageSize: '300' })
  if (pageToken) q.set('pageToken', pageToken)
  const r = await call<{ documents?: Invite[]; nextPageToken?: string }>(
    `${fs}/${root}/invites?${q}`,
  )
  invites.push(...(r.documents ?? []))
  pageToken = r.nextPageToken
} while (pageToken)

const expired: string[] = []
for (const inv of invites) {
  const f = inv.fields ?? {}
  const created = Date.parse(f.createdAt?.timestampValue ?? '')
  const fresh = created && Date.now() - created < INVITE_MINUTES * 60_000
  const used = !!f.usedBy?.stringValue
  const when = created ? new Date(created).toISOString().slice(0, 16).replace('T', ' ') : '?'
  const label = `„${f.houseName?.stringValue ?? '?'}” od ${f.inviterName?.stringValue ?? '?'}, ${when}, ${used ? 'użyte' : 'nieużyte'}`
  if (fresh && !used) console.log(`– ${label} – WAŻNE, zostaje`)
  else {
    console.log(`✔ ${label} – wygasłe`)
    expired.push(inv.name)
  }
}

if (!a.usun) {
  console.log(
    `\nPODGLĄD – nic nie usunięto. Wygasłych: ${expired.length} z ${invites.length}. Usunięcie: dodaj --usun`,
  )
  process.exit(0)
}
for (let i = 0; i < expired.length; i += 400)
  await call(`${fs}/${root}:commit`, {
    writes: expired.slice(i, i + 400).map((d) => ({ delete: d })),
  })
console.log(`\n✔ Usunięto ${expired.length} wygasłych zaproszeń.`)
