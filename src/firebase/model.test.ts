import { Timestamp } from 'firebase/firestore'
import { describe, expect, test } from 'vitest'
import { mockEvents, mockTasks } from '../data/mock.ts'
import {
  INVITE_MINUTES,
  eventFromDoc,
  inviteLeftMs,
  joinHouseOps,
  newInviteCode,
  eventToDoc,
  newHouseDocs,
  DEFAULT_USER,
  normalizeTimes,
  paths,
  priorityFromDoc,
  priorityToDoc,
  stampToTimestamp,
  summaryContentOf,
  summaryTimesOf,
  taskFromDoc,
  taskToDoc,
  timestampToStamp,
} from './model.ts'

const DAY = '2026-10-09'

describe('czas', () => {
  test('„RRRR-MM-DDTHH:MM” (czas lokalny) ↔ Timestamp bez zmian', () => {
    const t = stampToTimestamp('2026-10-09T09:10')
    expect(t).toBeInstanceOf(Timestamp)
    expect(t.toDate().getHours()).toBe(9)
    expect(timestampToStamp(t)).toBe('2026-10-09T09:10')
  })
})

describe('zadania', () => {
  test('każde przykładowe zadanie przechodzi do bazy i z powrotem bez zmian', () => {
    for (const task of mockTasks(DAY)) {
      const doc = taskToDoc(task, 'hania')
      expect(doc.updatedBy).toBe('hania')
      expect(taskFromDoc(task.id, { ...doc })).toEqual(task)
    }
  })

  test('ogarnięte i w koszu: doneAt / deletedAt jako Timestamp', () => {
    const done = mockTasks(DAY).find((t) => t.done)!
    const doc = taskToDoc(done, 'hania')
    expect(doc.doneAt).toBeInstanceOf(Timestamp)
    expect(doc.deletedAt).toBeNull()
  })

  test('uszkodzony dokument nie wywraca aplikacji (bezpieczne wartości domyślne)', () => {
    expect(taskFromDoc('x', { priority: 7 as never })).toMatchObject({
      id: 'x',
      title: '',
      priority: 'mid',
      subtasks: [],
      done: false,
      deleted: false,
    })
  })
})

describe('podsumowania (godziny i co przychodzi)', () => {
  test('stare konto bez pól – jak dotąd: 8:00 i dawna godzina przypomnienia; treść wg przełączników', () => {
    expect(summaryTimesOf({})).toEqual(['08:00', '18:00'])
    expect(summaryTimesOf({ taskReminderTime: '20:15' })).toEqual(['08:00', '20:15'])
    expect(summaryTimesOf({ taskReminderTime: '08:00' })).toEqual(['08:00'])
    expect(
      summaryContentOf({ notif: { tasks: true, events: false, morning: true, house: true } }),
    ).toEqual({
      urgent: true,
      dueToday: true,
      dueTomorrow: true,
      eventsToday: false,
      eventsSoon: false,
    })
  })
  test('nowe pola: poprawne godziny, bez powtórzeń, rosnąco, najwyżej 5', () => {
    expect(summaryTimesOf({ summaryTimes: ['16:00', '08:00', '12:00', '08:00', 'zle'] })).toEqual([
      '08:00',
      '12:00',
      '16:00',
    ])
    expect(normalizeTimes(['01:00', '02:00', '03:00', '04:00', '05:00', '06:00'])).toHaveLength(5)
    expect(
      summaryContentOf({ summaryContent: { ...DEFAULT_USER.summaryContent, dueTomorrow: false } })
        .dueTomorrow,
    ).toBe(false)
  })
})

describe('„Tylko ja”', () => {
  test('prywatność wynika z miejsca w bazie – nie jest polem dokumentu', () => {
    const task = { ...mockTasks(DAY)[0], private: true }
    const doc = taskToDoc(task, 'hania')
    expect('private' in doc).toBe(false)
    expect(taskFromDoc(task.id, { ...doc }, true)).toEqual(task)
    expect(taskFromDoc(task.id, { ...doc }).private).toBe(false)
    expect(paths.privateTasks('dom1', 'hania')).toBe('houses/dom1/private/hania/tasks')
    const ev = { ...mockEvents(DAY)[0], private: true }
    expect(eventFromDoc(ev.id, { ...eventToDoc(ev, 'hania') }, true)).toEqual(ev)
  })
})

describe('priorytety', () => {
  test('własny priorytet i zadanie z nim przechodzą do bazy i z powrotem', () => {
    const p = { id: 'p1', name: 'Na weekend', color: '#3F7A7A', order: 25 }
    expect(priorityFromDoc('p1', { ...priorityToDoc(p, 'hania') })).toEqual(p)
    const task = { ...mockTasks(DAY)[0], priority: 'p1' }
    expect(taskFromDoc(task.id, { ...taskToDoc(task, 'hania') }).priority).toBe('p1')
  })
})

describe('wydarzenia', () => {
  test('przykładowe wydarzenia (też usunięte) przechodzą bez zmian', () => {
    for (const ev of mockEvents(DAY)) {
      expect(eventFromDoc(ev.id, { ...eventToDoc(ev, 'hania') })).toEqual(ev)
    }
  })

  test('cały dzień – bez godzin w bazie', () => {
    const ev = { ...mockEvents(DAY)[0], allDay: true, from: '19:30', to: '21:00' }
    const doc = eventToDoc(ev, 'hania')
    expect([doc.from, doc.to]).toEqual([null, null])
  })
})

describe('nowy dom', () => {
  let n = 0
  const docs = newHouseDocs({
    houseId: 'dom1',
    houseName: 'Dom na Leśnej',
    uid: 'hania',
    userName: 'Hania',
    newId: () => `k${++n}`,
  })
  const at = (path: string) => docs.find((d) => d.path === path)?.data

  test('dom z nazwą, założyciel jako domownik z pełnym zakresem, profil z houseId', () => {
    expect(at(paths.house('dom1'))).toMatchObject({ name: 'Dom na Leśnej', ownerUid: 'hania' })
    expect(at('houses/dom1/members/hania')).toMatchObject({
      name: 'Hania',
      role: 'owner',
      scope: { all: true, categoryIds: [], calendar: true },
    })
    expect(at(paths.user('hania'))).toMatchObject({
      name: 'Hania',
      houseId: 'dom1',
      cleanupDays: 30,
      taskReminderTime: '18:00',
    })
  })

  test('6 domyślnych kategorii i 5 wbudowanych rodzajów wydarzeń', () => {
    const cats = docs.filter((d) => d.path.startsWith('houses/dom1/categories/'))
    expect(cats.map((d) => d.data.name)).toEqual([
      'Zakupy',
      'Dom',
      'Zdrowie',
      'Urzędy',
      'Auto',
      'Rodzina',
    ])
    const types = docs.filter((d) => d.path.startsWith('houses/dom1/eventTypes/'))
    expect(types.map((d) => d.path.split('/').pop())).toEqual([
      'task',
      'birthday',
      'party',
      'event',
      'doctor',
    ])
    expect(types[0].data).toMatchObject({ name: 'Termin zadania', system: true, icon: 'deadline' })
  })
})

describe('zaproszenia', () => {
  test('kod: zawsze 6 cyfr', () => {
    for (const r of [0, 0.5, 0.999999]) expect(newInviteCode(() => r)).toMatch(/^[0-9]{6}$/)
  })
  test('ważne 10 minut od utworzenia', () => {
    const t = Timestamp.fromMillis(1_000_000)
    expect(inviteLeftMs(t, 1_000_000)).toBe(INVITE_MINUTES * 60_000)
    expect(inviteLeftMs(t, 1_000_000 + 11 * 60_000)).toBe(0)
  })
  test('„Dołącz”: zaproszenie użyte, domownik z zakresem z zaproszenia, profil z domem', () => {
    const scope = { all: false, categoryIds: ['shop'], calendar: true }
    const ops = joinHouseOps({
      code: '482913',
      invite: { houseId: 'dom1', scope },
      uid: 'ola',
      userName: 'Ola',
      hasProfile: false,
    })
    expect(ops.map((o) => o.path)).toEqual([
      'invites/482913',
      'houses/dom1/members/ola',
      'users/ola',
    ])
    expect(ops[0]).toMatchObject({ data: { usedBy: 'ola' }, merge: true })
    expect(ops[1].data).toMatchObject({ name: 'Ola', role: 'member', scope, invite: '482913' })
    expect(ops[2].data).toMatchObject({ name: 'Ola', houseId: 'dom1', cleanupDays: 30 })
    // konto z profilem – tylko imię i dom
    const again = joinHouseOps({
      code: '1',
      invite: { houseId: 'dom1', scope },
      uid: 'ola',
      userName: 'Ola',
      hasProfile: true,
    })
    expect(again[2]).toEqual({
      path: 'users/ola',
      data: { name: 'Ola', houseId: 'dom1' },
      merge: true,
    })
  })
})
