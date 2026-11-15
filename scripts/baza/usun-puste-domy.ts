// Usuwa wskazane PUSTE domy (pozostałości po błędzie zakładania domu z 2026-11-14) przez konto
// zalogowane w Firebase CLI. Bez `--usun` tylko pokazuje, co by usunął.
//   npm run baza:usun-puste-domy -- --domy=ID1,ID2,… [--usun] [--wypisz-domownikow] [--projekt=…]
// --wypisz-domownikow: domownicy, którzy mają ten dom jako swój, dostają „bez domu” (wrócą do „Witaj”)
//   zamiast blokować usunięcie – tylko dla domu bez zadań i wydarzeń.
// Dom jest usuwany tylko, gdy na żywej bazie: nie ma w nim zadań, wydarzeń ani „Tylko ja”
// i żaden profil nie wskazuje go jako swojego domu.

// @ts-expect-error -- wewnętrzny moduł Firebase CLI, bez typów (logowanie konta Google z `npx firebase login`)
import { getAccessToken, getGlobalDefaultAccount } from 'firebase-tools/lib/auth.js'
import { args, fail } from './common.ts'

const a = args()
const project = a.projekt ?? 'ogarnij-zycie'
const ids = (a.domy ?? '').split(',').filter(Boolean)
if (!ids.length) fail('Podaj domy: --domy=ID1,ID2,…')
const account = getGlobalDefaultAccount()
if (!account) fail('Firebase CLI nie jest zalogowane – uruchom: npx firebase login')

const token = async () =>
  (
    await getAccessToken(account.tokens.refresh_token, [
      'https://www.googleapis.com/auth/cloud-platform',
    ])
  ).access_token as string
const root = `projects/${project}/databases/(default)/documents`
const api = 'https://firestore.googleapis.com/v1'

async function call<T>(url: string, body?: unknown, allow404 = false): Promise<T | null> {
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (allow404 && res.status === 404) return null
  if (!res.ok) fail(`Firestore odpowiedział ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return (await res.json()) as T
}

type RestDoc = {
  name: string
  fields?: Record<string, { stringValue?: string }>
  createTime?: string
}

async function collectionIds(parent: string): Promise<string[]> {
  const r = await call<{ collectionIds?: string[] }>(`${api}/${parent}:listCollectionIds`, {
    pageSize: 300,
  })
  return r?.collectionIds ?? []
}

/** Wszystkie dokumenty pod ścieżką (rekurencyjnie, także „puste” dokumenty-foldery). */
async function allDocs(parent: string): Promise<string[]> {
  const out: string[] = []
  for (const id of await collectionIds(parent)) {
    let pageToken: string | undefined
    do {
      const q = new URLSearchParams({ pageSize: '300', showMissing: 'true' })
      if (pageToken) q.set('pageToken', pageToken)
      const r = await call<{ documents?: RestDoc[]; nextPageToken?: string }>(
        `${api}/${parent}/${id}?${q}`,
      )
      for (const d of r?.documents ?? []) {
        if (d.createTime) out.push(d.name)
        out.push(...(await allDocs(d.name)))
      }
      pageToken = r?.nextPageToken
    } while (pageToken)
  }
  return out
}

const ALLOWED = ['members', 'categories', 'eventTypes', 'priorities', 'activity']
let blocked = 0
const plan: { id: string; name: string; docs: string[]; unassign: string[] }[] = []

for (const id of ids) {
  const house = `${root}/houses/${id}`
  const doc = await call<RestDoc>(`${api}/${house}`, undefined, true)
  if (!doc) {
    console.log(`– ${id}: nie ma takiego domu (już usunięty?) – pomijam`)
    continue
  }
  const name = doc.fields?.name?.stringValue ?? '?'
  const why: string[] = []
  const unassign: string[] = []
  const docs = await allDocs(house)
  const rel = docs.map((d) => d.slice(house.length + 1))
  const content = rel.filter((p) => !ALLOWED.includes(p.split('/')[0]))
  if (content.length)
    why.push(`ma dane: ${content.slice(0, 3).join(', ')}${content.length > 3 ? '…' : ''}`)
  for (const m of rel.filter((p) => /^members\/[^/]+$/.test(p))) {
    const uid = m.split('/')[1]
    const user = await call<RestDoc>(`${api}/${root}/users/${uid}`, undefined, true)
    if (user?.fields?.houseId?.stringValue === id) {
      if (a['wypisz-domownikow']) unassign.push(user.name)
      else why.push(`domownik ${uid.slice(0, 6)}… ma go jako swój dom`)
    }
  }
  if (why.length) {
    blocked++
    console.log(`✖ „${name}” (${id}) – NIE usuwam: ${why.join('; ')}`)
    continue
  }
  const count = (c: string) => rel.filter((p) => p.startsWith(`${c}/`)).length
  console.log(
    `✔ „${name}” (${id}) – pusty: ${ALLOWED.map((c) => `${c} ${count(c)}`).join(', ')} → ${docs.length + 1} dokumentów do usunięcia${unassign.length ? `; ${unassign.length} domowników dostanie „bez domu”` : ''}`,
  )
  plan.push({ id, name, docs: [...docs, house], unassign })
}

if (!a.usun) {
  console.log(
    `\nPODGLĄD – nic nie usunięto. Do usunięcia: ${plan.length} domów; zablokowanych: ${blocked}. Usunięcie: dodaj --usun`,
  )
  process.exit(0)
}

for (const h of plan) {
  // domownicy z tym domem jako swoim – „bez domu” (aplikacja pokaże im „Witaj”)
  if (h.unassign.length)
    await call(`${api}/${root}:commit`, {
      writes: h.unassign.map((name) => ({
        update: { name, fields: { houseId: { nullValue: null } } },
        updateMask: { fieldPaths: ['houseId'] },
        currentDocument: { exists: true },
      })),
    })
  // najpierw dokumenty w środku, na końcu sam dom; paczki po 400 zapisów
  for (let i = 0; i < h.docs.length; i += 400)
    await call(`${api}/${root}:commit`, {
      writes: h.docs.slice(i, i + 400).map((d) => ({ delete: d })),
    })
  console.log(`  usunięto „${h.name}” (${h.id})`)
}
console.log(`\n✔ Usunięto ${plan.length} domów. Zablokowanych (zostały): ${blocked}.`)
