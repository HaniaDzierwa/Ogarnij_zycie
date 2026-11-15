// Usuwa wskazane konta BEZ DOMU (np. testowe): konto logowania, profil users/{uid} i jego subskrypcje
// powiadomień – przez konto zalogowane w Firebase CLI. Bez `--usun` tylko pokazuje, co by usunął.
//   npm run baza:usun-konta -- --emaile=a@b.pl,c@d.pl [--usun] [--projekt=ogarnij-zycie]
// Konto jest usuwane tylko, gdy na żywej bazie: profil nie ma domu i konto nie jest domownikiem
// żadnego domu.

// @ts-expect-error -- wewnętrzny moduł Firebase CLI, bez typów (logowanie konta Google z `npx firebase login`)
import { getAccessToken, getGlobalDefaultAccount } from 'firebase-tools/lib/auth.js'
import { args, fail } from './common.ts'

const a = args()
const project = a.projekt ?? 'ogarnij-zycie'
const emails = (a.emaile ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)
if (!emails.length) fail('Podaj konta: --emaile=a@b.pl,c@d.pl')
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
const idt = `https://identitytoolkit.googleapis.com/v1/projects/${project}`

async function call<T>(url: string, body?: unknown, allow404 = false): Promise<T | null> {
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${await token()}`,
      'Content-Type': 'application/json',
      'x-goog-user-project': project,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (allow404 && res.status === 404) return null
  if (!res.ok) fail(`Odpowiedź ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return (await res.json()) as T
}

type RestDoc = { name: string; fields?: Record<string, { stringValue?: string }> }

// wszystkie domy – żeby sprawdzić, czy konto nie jest gdzieś domownikiem
const houses: RestDoc[] = []
let pageToken: string | undefined
do {
  const q = new URLSearchParams({ pageSize: '300' })
  if (pageToken) q.set('pageToken', pageToken)
  const r = await call<{ documents?: RestDoc[]; nextPageToken?: string }>(
    `${fs}/${root}/houses?${q}`,
  )
  houses.push(...(r?.documents ?? []))
  pageToken = r?.nextPageToken
} while (pageToken)

const found = await call<{ users?: { localId: string; email?: string }[] }>(
  `${idt}/accounts:lookup`,
  { email: emails },
)
const plan: { uid: string; email: string; docs: string[] }[] = []
let blocked = 0

for (const email of emails) {
  const user = found?.users?.find((u) => u.email?.toLowerCase() === email)
  if (!user) {
    console.log(`– ${email}: nie ma takiego konta – pomijam`)
    continue
  }
  const uid = user.localId
  const why: string[] = []
  const profile = await call<RestDoc>(`${fs}/${root}/users/${uid}`, undefined, true)
  const houseId = profile?.fields?.houseId?.stringValue
  if (houseId) why.push(`profil ma dom (${houseId})`)
  for (const h of houses) {
    const m = await call<RestDoc>(`${fs}/${h.name}/members/${uid}`, undefined, true)
    if (m) why.push(`jest domownikiem „${h.fields?.name?.stringValue ?? '?'}”`)
  }
  if (why.length) {
    blocked++
    console.log(`✖ ${email} – NIE usuwam: ${why.join('; ')}`)
    continue
  }
  const pushDocs =
    (
      await call<{ documents?: RestDoc[] }>(`${fs}/${root}/users/${uid}/push?pageSize=300`)
    )?.documents?.map((d) => d.name) ?? []
  const docs = [...pushDocs, ...(profile ? [profile.name] : [])]
  console.log(
    `✔ ${email} (uid ${uid.slice(0, 6)}…) – bez domu: konto logowania + profil${profile ? ` „${profile.fields?.name?.stringValue ?? ''}”` : ' (brak)'} + powiadomienia ${pushDocs.length}`,
  )
  plan.push({ uid, email, docs })
}

if (!a.usun) {
  console.log(
    `\nPODGLĄD – nic nie usunięto. Do usunięcia: ${plan.length} kont; zablokowanych: ${blocked}. Usunięcie: dodaj --usun`,
  )
  process.exit(0)
}

for (const p of plan) {
  if (p.docs.length)
    await call(`${fs}/${root}:commit`, { writes: p.docs.map((d) => ({ delete: d })) })
  await call(`${idt}/accounts:delete`, { localId: p.uid })
  console.log(`  usunięto ${p.email}`)
}
console.log(`\n✔ Usunięto ${plan.length} kont. Zablokowanych (zostały): ${blocked}.`)
