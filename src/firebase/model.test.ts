import { Timestamp } from 'firebase/firestore'
import { describe, expect, test } from 'vitest'
import { mockEvents, mockTasks } from '../data/mock.ts'
import {
  eventFromDoc,
  eventToDoc,
  newHouseDocs,
  paths,
  stampToTimestamp,
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
    expect(taskFromDoc('x', { priority: 'bardzo' as never })).toMatchObject({
      id: 'x',
      title: '',
      priority: 'mid',
      subtasks: [],
      done: false,
      deleted: false,
    })
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
