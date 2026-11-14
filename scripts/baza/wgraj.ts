// Wgranie zrzutu (firebase-export-…/) do INNEGO, nowego projektu Firebase.
// Uruchomienie (instrukcja: docs/FIREBASE.md → „Zrzut bazy i przeniesienie”):
//   npm run baza:wgraj -- --klucz="C:\…\NOWY-projekt-firebase-adminsdk-….json" --folder=firebase-export-RRRR-MM-DD
//     [--hasla=parametry-hasel.txt]  parametry haseł ze STAREGO projektu – loginy i hasła działają dalej
//     [--bez-kont]                   tylko baza, bez kont logowania
//     [--nadpisz]                    wgraj mimo danych w nowym projekcie

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { UserImportOptions, UserImportRecord } from 'firebase-admin/auth'
import { args, connect, fail } from './common.ts'
import { countByCollection, decode, type AuthDump, type FirestoreDump } from './format.ts'

const a = args()
const folder = a.folder ?? fail('Podaj folder zrzutu: --folder=firebase-export-RRRR-MM-DD')
const read = <T>(file: string): T => {
  try {
    return JSON.parse(readFileSync(join(folder, file), 'utf8')) as T
  } catch {
    return fail(`Nie mogę odczytać ${join(folder, file)}`)
  }
}
const dump = read<FirestoreDump>('firestore.json')
const { project, db, auth, types } = connect(a.klucz)

// bezpieczniki: nigdy z powrotem do projektu, z którego pochodzi zrzut; nie mieszamy z cudzymi danymi
if (project === dump.projekt)
  fail(
    `Klucz jest do projektu „${project}” – tego samego, z którego jest zrzut. Użyj klucza NOWEGO projektu.`,
  )
if (!a.nadpisz) {
  for (const col of ['houses', 'users']) {
    const some = await db.collection(col).limit(1).get()
    if (!some.empty)
      fail(
        `W projekcie „${project}” są już dane (${col}). Wgrywam tylko do pustej bazy (albo dodaj --nadpisz).`,
      )
  }
}

// zaproszenia (ważne 10 minut) i subskrypcje powiadomień (związane ze starym adresem strony) – bez sensu
// w nowym projekcie; powiadomienia włącza się na telefonie od nowa
const skip = (p: string) => p.startsWith('invites/') || /^users\/[^/]+\/push\//.test(p)
const docs = dump.dokumenty.filter((d) => !skip(d.sciezka))

console.log(`Wgrywam zrzut z „${dump.projekt}” (${dump.utworzono}) do „${project}”…`)
const writer = db.bulkWriter()
let errors = 0
writer.onWriteError((e) => {
  if (e.failedAttempts < 5) return true
  errors++
  console.error(`  ✖ ${e.documentRef.path}: ${e.message}`)
  return false
})
for (const d of docs) void writer.set(db.doc(d.sciezka), decode(d.dane, types) as never)
await writer.close()

console.log('Dokumenty w kolekcjach głównych:')
for (const [k, n] of Object.entries(countByCollection(docs.map((d) => d.sciezka))))
  console.log(`  ${k}: ${n}`)
console.log(
  `Razem: ${docs.length - errors} wgranych, ${errors} błędów (pominięte zaproszenia i subskrypcje powiadomień: ${dump.dokumenty.length - docs.length})`,
)

if (!a['bez-kont']) {
  const { konta } = read<AuthDump>('konta.json')
  const hash = a.hasla ? hashOptions(a.hasla) : undefined
  if (!hash)
    console.log(
      '\nBez parametrów haseł (--hasla) – konta bez haseł; każdy ustawi nowe przez „Nie pamiętam hasła”.',
    )
  let ok = 0
  for (let i = 0; i < konta.length; i += 1000) {
    const records: UserImportRecord[] = konta.slice(i, i + 1000).map((u) => ({
      uid: u.uid,
      email: u.email,
      emailVerified: u.emailVerified,
      displayName: u.displayName,
      disabled: u.disabled,
      metadata: { creationTime: u.creationTime, lastSignInTime: u.lastSignInTime },
      ...(hash && u.passwordHash
        ? {
            passwordHash: Buffer.from(u.passwordHash, 'base64'),
            passwordSalt: u.passwordSalt ? Buffer.from(u.passwordSalt, 'base64') : undefined,
          }
        : {}),
    }))
    const res = await auth.importUsers(records, hash)
    ok += res.successCount
    for (const e of res.errors)
      console.error(`  ✖ konto ${records[e.index].email}: ${e.error.message}`)
  }
  console.log(`Konta logowania: ${ok} z ${konta.length}`)
}

console.log(
  `\n✔ Gotowe. Sprawdź w konsoli nowego projektu: Firestore Database i Authentication → Users.`,
)
process.exit(errors ? 1 : 0)

/**
 * Parametry haseł skopiowane z konsoli STAREGO projektu (Authentication → Users → ⋮ → „Password hash
 * parameters”), wklejone do pliku tekstowego tak jak są:
 *   hash_config { algorithm: SCRYPT, base64_signer_key: …, base64_salt_separator: Bw==, rounds: 8, mem_cost: 14 }
 */
function hashOptions(file: string): UserImportOptions {
  let text: string
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    return fail(`Nie mogę odczytać parametrów haseł: ${file}`)
  }
  const get = (k: string) => new RegExp(`${k}\\s*:\\s*([^,\\s}]+)`).exec(text)?.[1]
  const key = get('base64_signer_key')
  const sep = get('base64_salt_separator')
  const rounds = Number(get('rounds'))
  const mem = Number(get('mem_cost'))
  if (get('algorithm') !== 'SCRYPT' || !key || !sep || !rounds || !mem)
    fail(
      'Plik parametrów haseł niekompletny – skopiuj cały blok hash_config z konsoli starego projektu.',
    )
  return {
    hash: {
      algorithm: 'SCRYPT',
      key: Buffer.from(key, 'base64'),
      saltSeparator: Buffer.from(sep, 'base64'),
      rounds,
      memoryCost: mem,
    },
  }
}
