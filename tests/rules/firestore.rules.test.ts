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
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { mockEvents, mockTasks } from '../../src/data/mock.ts'
import type { Task } from '../../src/data/types.ts'
import {
  categoryToDoc,
  eventToDoc,
  eventTypeToDoc,
  newHouseDocs,
  paths,
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
  test('na zawsze można usunąć tylko zadanie z kosza („Opróżnij kosz”)', async () => {
    await assertFails(deleteDoc(doc(db('hania'), taskPath('dom1'))))
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

  test('priorytet tylko Pilne / Ważne / Przy okazji', () =>
    assertFails(put(sampleTask({ priority: 'bardzo' as Task['priority'] }))))
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
