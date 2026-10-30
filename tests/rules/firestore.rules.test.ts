// Testy reguł Firestore (firestore.rules) w emulatorze – wymagają Javy 21.
// Uruchomienie: `npm run test:reguly` (sam startuje emulator z fikcyjnym projektem demo-ogarnij-zycie,
// nic nie trafia do prawdziwej bazy). W zwykłym `npm test` te testy są pominięte.

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { mockEvents, mockTasks } from '../../src/data/mock.ts'
import type { Task } from '../../src/data/types.ts'
import {
  DEFAULT_USER,
  categoryToDoc,
  eventToDoc,
  eventTypeToDoc,
  joinHouseOps,
  newHouseDocs,
  newInviteDoc,
  paths,
  priorityToDoc,
  pushDoc,
  activityDoc,
  taskToDoc,
} from '../../src/firebase/model.ts'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-ogarnij-zycie',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})
afterAll(async () => {
  connections.clear()
  await env.cleanup()
})
beforeEach(() => env.clearFirestore())

/**
 * Baza widziana przez użytkownika (albo niezalogowanego) – jedno połączenie na użytkownika.
 * Każde `authenticatedContext().firestore()` to osobna instancja, a paczka zapisu (writeBatch)
 * przyjmuje tylko dokumenty z tej samej instancji.
 */
const connections = new Map<string, Firestore>()
const db = (uid?: string): Firestore => {
  const key = uid ?? ''
  let fs = connections.get(key)
  if (!fs) {
    fs = (uid
      ? env.authenticatedContext(uid)
      : env.unauthenticatedContext()
    ).firestore() as unknown as Firestore
    connections.set(key, fs)
  }
  return fs
}

/** „Załóż nowy dom” dokładnie tak jak aplikacja (newHouseDocs w jednej paczce). */
async function createHouse(uid: string, houseId: string, as = uid) {
  let n = 0
  const fs = db(as)
  const batch = writeBatch(fs)
  for (const d of newHouseDocs({
    houseId,
    houseName: `Dom ${uid}`,
    uid,
    userName: uid,
    newId: () => `${houseId}-k${++n}`,
  }))
    batch.set(doc(fs, d.path), d.data)
  return batch.commit()
}

const DAY = '2026-10-09'
const sampleTask = (over: Partial<Task> = {}): Task => ({
  ...mockTasks(DAY)[1], // „Baterie AA do pilota”
  id: 'z1',
  createdBy: 'hania',
  ...over,
})
const taskPath = (houseId: string, id = 'z1') => `${paths.tasks(houseId)}/${id}`

/** Dom Hani z jednym zadaniem; obcy ma własny dom. */
async function seed() {
  await createHouse('hania', 'dom1')
  await createHouse('obcy', 'dom2')
  await setDoc(doc(db('hania'), taskPath('dom1')), taskToDoc(sampleTask(), 'hania'))
}

describe('niezalogowany', () => {
  beforeEach(seed)

  test('nie czyta profilu', () => assertFails(getDoc(doc(db(), paths.user('hania')))))
  test('nie czyta domu ani zadań', async () => {
    await assertFails(getDoc(doc(db(), paths.house('dom1'))))
    await assertFails(getDocs(collection(db(), paths.tasks('dom1'))))
  })
  test('nie zapisuje zadania', () =>
    assertFails(
      setDoc(doc(db(), taskPath('dom1', 'z2')), taskToDoc(sampleTask({ id: 'z2' }), 'x')),
    ))
})

describe('profil', () => {
  beforeEach(seed)

  test('godziny podsumowań: do 5 godzin i poprawne kratki; więcej albo zła mapa – odrzucone', async () => {
    const me = doc(db('hania'), paths.user('hania'))
    await assertSucceeds(
      updateDoc(me, {
        summaryTimes: ['08:00', '10:00', '12:00', '14:00', '16:00'],
        summaryContent: { ...DEFAULT_USER.summaryContent, eventsSoon: false },
      }),
    )
    await assertFails(
      updateDoc(me, { summaryTimes: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'] }),
    )
    await assertFails(
      updateDoc(me, { summaryContent: { ...DEFAULT_USER.summaryContent, extra: true } }),
    )
    await assertFails(
      updateDoc(me, { summaryContent: { ...DEFAULT_USER.summaryContent, urgent: 'tak' } }),
    )
  })

  test('Hania czyta i zmienia swój profil', async () => {
    await assertSucceeds(getDoc(doc(db('hania'), paths.user('hania'))))
    await assertSucceeds(updateDoc(doc(db('hania'), paths.user('hania')), { name: 'Hanka' }))
  })
  test('obcy nie czyta i nie zmienia profilu Hani', async () => {
    await assertFails(getDoc(doc(db('obcy'), paths.user('hania'))))
    await assertFails(updateDoc(doc(db('obcy'), paths.user('hania')), { name: 'Ha!' }))
  })
  test('nie da się przypisać sobie cudzego domu', () =>
    assertFails(updateDoc(doc(db('obcy'), paths.user('obcy')), { houseId: 'dom1' })))
  test('złe ustawienia (sprzątanie, godzina) są odrzucane', async () => {
    await assertFails(updateDoc(doc(db('hania'), paths.user('hania')), { cleanupDays: 3 }))
    await assertFails(updateDoc(doc(db('hania'), paths.user('hania')), { taskReminderTime: '18' }))
  })
})

describe('zakładanie domu', () => {
  test('Hania zakłada dom dla siebie (dom, domownik, profil, kategorie, rodzaje)', async () => {
    await assertSucceeds(createHouse('hania', 'dom1'))
    const cats = await getDocs(collection(db('hania'), paths.categories('dom1')))
    expect(cats.size).toBe(6)
  })
  test('nie da się założyć domu „na kogoś innego”', () =>
    assertFails(createHouse('hania', 'dom1', 'obcy')))
  test('obcy nie dopisze się jako domownik do istniejącego domu', async () => {
    await createHouse('hania', 'dom1')
    await assertFails(
      setDoc(doc(db('obcy'), `${paths.members('dom1')}/obcy`), {
        name: 'Obcy',
        role: 'owner',
        scope: { all: true, categoryIds: [], calendar: true },
        joinedAt: new Date(),
      }),
    )
  })
  test('dom bez domownika (sam dokument domu) jest odrzucany', () =>
    assertFails(
      setDoc(doc(db('hania'), paths.house('dom1')), {
        name: 'Dom',
        ownerUid: 'hania',
        createdAt: new Date(),
      }),
    ))
})

describe('dane domu', () => {
  beforeEach(seed)

  test('domownik czyta listę zadań i dodaje zadanie', async () => {
    await assertSucceeds(getDocs(collection(db('hania'), paths.tasks('dom1'))))
    await assertSucceeds(
      setDoc(
        doc(db('hania'), taskPath('dom1', 'z2')),
        taskToDoc(sampleTask({ id: 'z2' }), 'hania'),
      ),
    )
  })
  test('obcy nie czyta listy ani pojedynczego zadania (nawet znając id)', async () => {
    await assertFails(getDocs(collection(db('obcy'), paths.tasks('dom1'))))
    await assertFails(getDoc(doc(db('obcy'), taskPath('dom1'))))
  })
  test('obcy nie dodaje, nie zmienia i nie usuwa zadań', async () => {
    await assertFails(
      setDoc(
        doc(db('obcy'), taskPath('dom1', 'z3')),
        taskToDoc(sampleTask({ id: 'z3', createdBy: 'obcy' }), 'obcy'),
      ),
    )
    await assertFails(
      setDoc(doc(db('obcy'), taskPath('dom1')), taskToDoc(sampleTask({ title: 'X' }), 'obcy')),
    )
    await assertFails(deleteDoc(doc(db('obcy'), taskPath('dom1'))))
  })
  test('obcy nie czyta domu, domowników, kategorii, wydarzeń', async () => {
    await assertFails(getDoc(doc(db('obcy'), paths.house('dom1'))))
    await assertFails(getDocs(collection(db('obcy'), paths.members('dom1'))))
    await assertFails(getDocs(collection(db('obcy'), paths.categories('dom1'))))
    await assertFails(getDocs(collection(db('obcy'), paths.events('dom1'))))
  })
  test('usunąć na zawsze: zadanie z kosza („Opróżnij kosz”) albo własne (przeniesienie do „Tylko ja”)', async () => {
    await invite()
    await join('ola')
    // cudzego, niewyrzuconego – nie
    await assertFails(deleteDoc(doc(db('ola'), taskPath('dom1'))))
    const trashed = sampleTask({ deleted: true, deletedAt: '2026-10-09T12:00', deletedBy: 'hania' })
    await setDoc(doc(db('hania'), taskPath('dom1')), taskToDoc(trashed, 'hania'))
    await assertSucceeds(deleteDoc(doc(db('hania'), taskPath('dom1'))))
  })
  test('domownik zmienia nazwę domu i swoje imię; nie zmieni właściciela', async () => {
    await assertSucceeds(
      updateDoc(doc(db('hania'), paths.house('dom1')), { name: 'Dom na Leśnej' }),
    )
    await assertSucceeds(
      updateDoc(doc(db('hania'), `${paths.members('dom1')}/hania`), { name: 'Hanka' }),
    )
    await assertFails(updateDoc(doc(db('hania'), paths.house('dom1')), { ownerUid: 'obcy' }))
  })
  test('wydarzenia i kategorie: domownik zapisuje, obcy nie', async () => {
    const ev = { ...mockEvents(DAY)[0], createdBy: 'hania' }
    await assertSucceeds(
      setDoc(doc(db('hania'), `${paths.events('dom1')}/${ev.id}`), eventToDoc(ev, 'hania')),
    )
    await assertFails(
      setDoc(
        doc(db('obcy'), `${paths.events('dom1')}/e9`),
        eventToDoc({ ...ev, id: 'e9', createdBy: 'obcy' }, 'obcy'),
      ),
    )
    const cat = { id: 'k9', name: 'Ogród', color: '#5E8C6A', order: 6 }
    await assertSucceeds(
      setDoc(doc(db('hania'), `${paths.categories('dom1')}/k9`), categoryToDoc(cat, 'hania')),
    )
    await assertFails(
      setDoc(doc(db('obcy'), `${paths.categories('dom1')}/k8`), categoryToDoc(cat, 'obcy')),
    )
  })
  test('własne priorytety: domownik zapisuje i usuwa, obcy nie; zły kształt odrzucony', async () => {
    const p = { id: 'p1', name: 'Na weekend', color: '#3F7A7A', order: 22.5 }
    const at = (as: string) => doc(db(as), `${paths.priorities('dom1')}/p1`)
    await assertFails(setDoc(at('obcy'), priorityToDoc(p, 'obcy')))
    await assertSucceeds(setDoc(at('hania'), priorityToDoc(p, 'hania')))
    await assertFails(setDoc(at('hania'), { ...priorityToDoc(p, 'hania'), name: '' }))
    await assertFails(setDoc(at('hania'), { ...priorityToDoc(p, 'hania'), extra: 1 }))
    await assertFails(getDoc(at('obcy')))
    await assertFails(deleteDoc(at('obcy')))
    await assertSucceeds(deleteDoc(at('hania')))
  })
  test('wbudowanego rodzaju „Termin zadania” nie da się usunąć ani dodać nowego systemowego', async () => {
    await assertFails(deleteDoc(doc(db('hania'), `${paths.eventTypes('dom1')}/task`)))
    const sys = {
      id: 'r1',
      name: 'X',
      dot: '#000',
      bg: '#111',
      fg: '#222',
      icon: 'custom' as const,
      system: true,
    }
    await assertFails(
      setDoc(doc(db('hania'), `${paths.eventTypes('dom1')}/r1`), eventTypeToDoc(sys, 'hania')),
    )
  })
})

describe('podpis zmian', () => {
  beforeEach(seed)

  test('„zmienione przez” musi być zalogowanym użytkownikiem', () =>
    assertFails(
      setDoc(doc(db('hania'), taskPath('dom1')), taskToDoc(sampleTask({ title: 'Inne' }), 'krzys')),
    ))
  test('„dodane przez” przy nowym zadaniu musi być zalogowanym użytkownikiem', () =>
    assertFails(
      setDoc(
        doc(db('hania'), taskPath('dom1', 'z4')),
        taskToDoc(sampleTask({ id: 'z4', createdBy: 'krzys' }), 'hania'),
      ),
    ))
  test('„dodane przez” nie zmienia się przy edycji', () =>
    assertFails(
      setDoc(
        doc(db('hania'), taskPath('dom1')),
        taskToDoc(sampleTask({ createdBy: 'obcy' }), 'hania'),
      ),
    ))
})

describe('poprawność danych', () => {
  beforeEach(seed)
  const put = (t: Task) =>
    setDoc(doc(db('hania'), taskPath('dom1', 'z5')), taskToDoc({ ...t, id: 'z5' }, 'hania'))

  test('priorytet: wbudowany albo id własnego – niepusty tekst do 100 znaków', async () => {
    await assertSucceeds(put(sampleTask({ priority: 'p1' })))
    await assertFails(put(sampleTask({ priority: '' })))
    await assertFails(put(sampleTask({ priority: 'x'.repeat(101) })))
    await assertFails(put(sampleTask({ priority: 7 as unknown as Task['priority'] })))
  })
  test('tytuł nie może być pusty ani dłuższy niż 200 znaków', async () => {
    await assertFails(put(sampleTask({ title: '' })))
    await assertFails(put(sampleTask({ title: 'x'.repeat(201) })))
    await assertSucceeds(put(sampleTask({ title: 'x'.repeat(200) })))
  })
  test('termin w formacie RRRR-MM-DD', async () => {
    await assertFails(put(sampleTask({ due: '9 października' })))
    await assertSucceeds(put(sampleTask({ due: '2026-10-16' })))
  })
  test('notatka do 500 znaków', async () => {
    await assertSucceeds(put(sampleTask({ note: 'Kod do domofonu 4821' })))
    await assertFails(put(sampleTask({ note: 'x'.repeat(501) })))
  })
  test('dodatkowe, nieznane pola są odrzucane', () =>
    assertFails(
      setDoc(doc(db('hania'), taskPath('dom1', 'z6')), {
        ...taskToDoc(sampleTask({ id: 'z6' }), 'hania'),
        admin: true,
      }),
    ))
})

// ── Zaproszenia i dołączanie (etap 4) ──────────────────────────────────────

const ALL = { all: true, categoryIds: [], calendar: true }
const CODE = '482913'

/** Hania (domownik dom1) tworzy zaproszenie – tak jak aplikacja. */
const invite = (code = CODE, as = 'hania', houseId = 'dom1') =>
  setDoc(
    doc(db(as), paths.invite(code)),
    newInviteDoc({ houseId, houseName: 'Dom na Leśnej', uid: as, name: as, scope: ALL }),
  )

/** „Dołącz jako …” – jedna paczka jak w aplikacji. */
function join(uid: string, code = CODE, houseId = 'dom1', scope = ALL) {
  const fs = db(uid)
  const batch = writeBatch(fs)
  for (const op of joinHouseOps({
    code,
    invite: { houseId, scope },
    uid,
    userName: uid,
    hasProfile: false,
  }))
    batch.set(doc(fs, op.path), op.data, { merge: !!op.merge })
  return batch.commit()
}

describe('zaproszenia', () => {
  beforeEach(seed)

  test('za długa lista imion domowników w zaproszeniu – odrzucona', () =>
    assertFails(
      setDoc(doc(db('hania'), paths.invite('444444')), {
        ...newInviteDoc({
          houseId: 'dom1',
          houseName: 'Dom',
          uid: 'hania',
          name: 'Hania',
          scope: ALL,
        }),
        memberNames: Array.from({ length: 21 }, (_, i) => `D${i}`),
      }),
    ))
  test('domownik tworzy zaproszenie do swojego domu; obcy – nie, do cudzego', async () => {
    await assertSucceeds(invite())
    await assertFails(invite('111111', 'obcy', 'dom1'))
  })
  test('kod tylko 6 cyfr; zaproszenie „od kogoś innego” – odrzucone', async () => {
    await assertFails(invite('48291', 'hania'))
    await assertFails(
      setDoc(doc(db('hania'), paths.invite('222222')), {
        ...newInviteDoc({ houseId: 'dom1', houseName: 'Dom', uid: 'krzys', name: 'K', scope: ALL }),
      }),
    )
  })
  test('znając kod, zalogowany czyta zaproszenie; listy nikt nie przegląda; bez logowania nic', async () => {
    await invite()
    await assertSucceeds(getDoc(doc(db('ola'), paths.invite(CODE))))
    await assertFails(getDocs(query(collection(db('ola'), 'invites'))))
    await assertFails(getDoc(doc(db(), paths.invite(CODE))))
  })
  test('zapraszający usuwa swoje zaproszenie („Nowy kod”); inny – nie', async () => {
    await invite()
    await assertFails(deleteDoc(doc(db('obcy'), paths.invite(CODE))))
    await assertSucceeds(deleteDoc(doc(db('hania'), paths.invite(CODE))))
  })
})

describe('dołączanie', () => {
  beforeEach(seed)

  test('z ważnym kodem: Ola dołącza i widzi zadania domu', async () => {
    await invite()
    await assertSucceeds(join('ola'))
    await assertSucceeds(getDocs(collection(db('ola'), paths.tasks('dom1'))))
    const me = await getDoc(doc(db('ola'), paths.user('ola')))
    expect(me.data()?.houseId).toBe('dom1')
  })
  test('kod działa raz – drugi raz (inna osoba) odrzucony', async () => {
    await invite()
    await join('ola')
    await assertFails(join('ewa'))
  })
  test('przeterminowany kod (ponad 10 min) nie działa', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const fs = ctx.firestore() as unknown as Firestore
      await setDoc(doc(fs, paths.invite(CODE)), {
        ...newInviteDoc({
          houseId: 'dom1',
          houseName: 'Dom',
          uid: 'hania',
          name: 'Hania',
          scope: ALL,
        }),
        createdAt: Timestamp.fromMillis(Date.now() - 11 * 60_000),
      })
    })
    await assertFails(join('ola'))
  })
  test('bez zaproszenia albo z kodem do innego domu – nie da się dopisać', async () => {
    await assertFails(join('ola', '999999'))
    await invite('333333', 'obcy', 'dom2')
    await assertFails(join('ola', '333333', 'dom1'))
  })
  test('zakres musi być taki jak w zaproszeniu; rola tylko „member”', async () => {
    await invite()
    await assertFails(join('ola', CODE, 'dom1', { all: true, categoryIds: [], calendar: false }))
    await join('ola')
    await assertFails(updateDoc(doc(db('ola'), `${paths.members('dom1')}/ola`), { role: 'owner' }))
  })
  test('domownik nie „zużyje” zaproszenia do własnego domu', async () => {
    await invite()
    await assertFails(
      updateDoc(doc(db('hania'), paths.invite(CODE)), { usedBy: 'hania', usedAt: new Date() }),
    )
  })
})

// ── „Tylko ja” (etap 4, decyzja Hani 2026-10-25) ───────────────────────────

describe('„Tylko ja”: prywatne zadania i wydarzenia', () => {
  beforeEach(async () => {
    await seed()
    await invite()
    await join('ola')
  })
  const own = (as: string, uid = as, id = 'p1') =>
    doc(db(as), `${paths.privateTasks('dom1', uid)}/${id}`)
  const ownEvent = (as: string, uid = as) => doc(db(as), `${paths.privateEvents('dom1', uid)}/w1`)
  const event = (by: string) => ({ ...mockEvents(DAY)[0], id: 'w1', createdBy: by, private: true })

  test('autor zapisuje i czyta swoje prywatne; inny domownik i obcy – nic', async () => {
    await assertSucceeds(setDoc(own('hania'), taskToDoc(sampleTask({ private: true }), 'hania')))
    await assertSucceeds(getDoc(own('hania')))
    await assertSucceeds(getDocs(collection(db('hania'), paths.privateTasks('dom1', 'hania'))))
    await assertFails(getDoc(own('ola', 'hania')))
    await assertFails(getDocs(collection(db('ola'), paths.privateTasks('dom1', 'hania'))))
    await assertFails(getDoc(own('obcy', 'hania')))
    await assertFails(deleteDoc(own('ola', 'hania')))
    await assertFails(
      setDoc(own('ola', 'hania'), taskToDoc(sampleTask({ title: 'X', createdBy: 'ola' }), 'ola')),
    )
  })
  test('prywatne tylko jako autor (createdBy = ja) i tylko w domu, do którego należę', async () => {
    await assertFails(
      setDoc(own('ola', 'ola'), taskToDoc(sampleTask({ createdBy: 'hania' }), 'ola')),
    )
    await assertFails(
      setDoc(
        doc(db('obcy'), `${paths.privateTasks('dom1', 'obcy')}/p1`),
        taskToDoc(sampleTask({ createdBy: 'obcy' }), 'obcy'),
      ),
    )
  })
  test('wspólne → „Tylko ja” (autor): usunięcie ze wspólnych + zapis w prywatnych jedną paczką', async () => {
    const fs = db('hania')
    const batch = writeBatch(fs)
    batch.delete(doc(fs, taskPath('dom1')))
    batch.set(
      doc(fs, `${paths.privateTasks('dom1', 'hania')}/z1`),
      taskToDoc(sampleTask(), 'hania'),
    )
    await assertSucceeds(batch.commit())
    // Ola już go nie widzi we wspólnych
    expect((await getDoc(doc(db('ola'), taskPath('dom1')))).exists()).toBe(false)
  })
  test('prywatne wydarzenia: autor tak, inny domownik nie', async () => {
    await assertSucceeds(setDoc(ownEvent('ola'), eventToDoc(event('ola'), 'ola')))
    await assertFails(getDoc(ownEvent('hania', 'ola')))
    await assertFails(getDocs(collection(db('hania'), paths.privateEvents('dom1', 'ola'))))
    await assertSucceeds(deleteDoc(ownEvent('ola')))
  })
})

// ── „Opuść dom” i „Usuń z domu” (etap 4, krok 5) ───────────────────────────

describe('wychodzenie i usuwanie domowników', () => {
  beforeEach(async () => {
    await seed()
    await invite()
    await join('ola')
    await invite('555555')
    await join('ewa', '555555')
  })
  const member = (as: string, uid: string) => doc(db(as), `${paths.members('dom1')}/${uid}`)

  test('„Opuść dom”: domownik wypisuje siebie i czyści dom w profilu jedną paczką', async () => {
    const fs = db('ola')
    const batch = writeBatch(fs)
    batch.delete(doc(fs, `${paths.members('dom1')}/ola`))
    batch.update(doc(fs, paths.user('ola')), { houseId: null })
    await assertSucceeds(batch.commit())
    await assertFails(getDocs(collection(db('ola'), paths.tasks('dom1'))))
  })
  test('„Usuń z domu”: założycielka usuwa domownika; ten traci dostęp', async () => {
    await assertSucceeds(deleteDoc(member('hania', 'ola')))
    await assertFails(getDocs(collection(db('ola'), paths.tasks('dom1'))))
  })
  test('zwykły domownik nie usuwa innych (ani założycielki); obcy – nikogo', async () => {
    await assertFails(deleteDoc(member('ola', 'ewa')))
    await assertFails(deleteDoc(member('ola', 'hania')))
    await assertFails(deleteDoc(member('obcy', 'ola')))
  })
  test('dołączenie do innego domu = wyjście z obecnego w tej samej paczce', async () => {
    await invite('666666', 'obcy', 'dom2')
    const fs = db('ola')
    const batch = writeBatch(fs)
    batch.delete(doc(fs, `${paths.members('dom1')}/ola`))
    for (const op of joinHouseOps({
      code: '666666',
      invite: { houseId: 'dom2', scope: ALL },
      uid: 'ola',
      userName: 'Ola',
      hasProfile: true,
    }))
      batch.set(doc(fs, op.path), op.data, { merge: !!op.merge })
    await assertSucceeds(batch.commit())
    await assertFails(getDocs(collection(db('ola'), paths.tasks('dom1'))))
    await assertSucceeds(getDocs(collection(db('ola'), paths.tasks('dom2'))))
  })
})

// ── Powiadomienia: subskrypcje telefonów (etap 6) ──────────────────────────

describe('subskrypcje powiadomień', () => {
  beforeEach(seed)
  const sub = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
    keys: { p256dh: 'BPx', auth: 'au' },
  }
  const at = (as: string, uid = as) => doc(db(as), paths.push(uid, 'tel1'))

  test('właściciel konta zapisuje, czyta i usuwa subskrypcję swojego telefonu', async () => {
    await assertSucceeds(setDoc(at('hania'), pushDoc(sub, 'Chrome na Androidzie')))
    await assertSucceeds(getDoc(at('hania')))
    await assertSucceeds(deleteDoc(at('hania')))
  })
  test('nikt inny jej nie widzi ani nie zapisuje (także domownik)', async () => {
    await setDoc(at('hania'), pushDoc(sub, 'x'))
    await assertFails(getDoc(at('obcy', 'hania')))
    await assertFails(setDoc(at('obcy', 'hania'), pushDoc(sub, 'x')))
    await assertFails(getDoc(doc(db(), paths.push('hania', 'tel1'))))
  })
  test('zły kształt odrzucony (adres nie https, dodatkowe pola)', async () => {
    await assertFails(setDoc(at('hania'), pushDoc({ ...sub, endpoint: 'http://zly' }, 'x')))
    await assertFails(setDoc(at('hania'), { ...pushDoc(sub, 'x'), extra: 1 }))
  })
})

// ── Wpisy „co się stało” dla powiadomień (etap 6) ───────────────────────────

describe('wpisy dla powiadomień o zmianach', () => {
  beforeEach(async () => {
    await seed()
    await invite()
    await join('ola')
  })
  const entry = { kind: 'task-added' as const, title: 'Mleko', detail: null, date: null }
  const add = (as: string, data: Record<string, unknown>) =>
    addDoc(collection(db(as), paths.activity('dom1')), data)

  test('domownik dopisuje wpis pod własnym kontem; inni domownicy go czytają', async () => {
    await assertSucceeds(add('ola', activityDoc(entry, 'ola')))
    await assertSucceeds(getDocs(collection(db('hania'), paths.activity('dom1'))))
  })
  test('nie pod cudzym kontem, nie obcy, nie zły rodzaj; nikt nie zmienia ani nie usuwa', async () => {
    await assertFails(add('ola', activityDoc(entry, 'hania')))
    await assertFails(add('obcy', activityDoc(entry, 'obcy')))
    await assertFails(add('ola', { ...activityDoc(entry, 'ola'), kind: 'cokolwiek' }))
    await assertFails(getDocs(collection(db('obcy'), paths.activity('dom1'))))
    const ref = await addDoc(
      collection(db('ola'), paths.activity('dom1')),
      activityDoc(entry, 'ola'),
    )
    await assertFails(deleteDoc(doc(db('ola'), ref.path)))
    await assertFails(updateDoc(doc(db('ola'), ref.path), { title: 'X' }))
  })
  test('wydarzenie z dniem i opisem', () =>
    assertSucceeds(
      add(
        'hania',
        activityDoc(
          {
            kind: 'event-moved',
            title: 'Dentysta',
            detail: 'pt 31 paź, 17:00',
            date: '2026-10-31',
          },
          'hania',
        ),
      ),
    ))
})

// ── Usuwanie konta (etap 7) ─────────────────────────────────────────────────

describe('usuwanie konta', () => {
  beforeEach(async () => {
    await seed()
    await invite()
    await join('ola')
  })
  const house = (as: string) => doc(db(as), paths.house('dom1'))
  const member = (as: string, uid: string) => doc(db(as), `${paths.members('dom1')}/${uid}`)

  test('każdy usuwa tylko swój profil', async () => {
    await assertFails(deleteDoc(doc(db('ola'), paths.user('hania'))))
    await assertSucceeds(deleteDoc(doc(db('ola'), paths.user('ola'))))
  })
  test('przekazanie domu: założycielka oddaje dom Oli i wychodzi jedną paczką', async () => {
    const fs = db('hania')
    const batch = writeBatch(fs)
    batch.update(doc(fs, paths.house('dom1')), { ownerUid: 'ola' })
    batch.update(doc(fs, `${paths.members('dom1')}/ola`), { role: 'owner' })
    batch.delete(doc(fs, `${paths.members('dom1')}/hania`))
    await assertSucceeds(batch.commit())
    expect((await getDoc(house('ola'))).data()?.ownerUid).toBe('ola')
  })
  test('nie: przejęcie domu przez domownika, przekazanie bez roli „owner”, obcemu', async () => {
    await assertFails(updateDoc(house('ola'), { ownerUid: 'ola' }))
    await assertFails(updateDoc(member('ola', 'ola'), { role: 'owner' }))
    await assertFails(updateDoc(house('hania'), { ownerUid: 'ola' }))
    await assertFails(updateDoc(house('hania'), { ownerUid: 'obcy' }))
  })
  test('usunięcie domu: założycielka usuwa wszystko (także cudze zadania i „Termin zadania”), domownik – nie', async () => {
    const olaTask = sampleTask({ id: 'z7', createdBy: 'ola' })
    await setDoc(doc(db('ola'), taskPath('dom1', 'z7')), taskToDoc(olaTask, 'ola'))
    await assertFails(deleteDoc(doc(db('ola'), taskPath('dom1'))))
    await assertFails(deleteDoc(house('ola')))
    await assertSucceeds(deleteDoc(doc(db('hania'), taskPath('dom1', 'z7'))))
    // „Termin zadania” – nie osobno, tylko razem z domem (jak w aplikacji)
    const taskType = (as: string) => doc(db(as), `${paths.eventTypes('dom1')}/task`)
    await assertFails(deleteDoc(taskType('hania')))
    const fs = db('hania')
    const batch = writeBatch(fs)
    batch.delete(doc(fs, `${paths.eventTypes('dom1')}/task`))
    batch.delete(doc(fs, `${paths.members('dom1')}/ola`))
    batch.delete(doc(fs, paths.house('dom1')))
    await assertSucceeds(batch.commit())
    await assertSucceeds(deleteDoc(member('hania', 'hania')))
  })
})
