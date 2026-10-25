// @vitest-environment node

import { describe, expect, test } from 'vitest'
import {
  changeMessage,
  cleanupPlan,
  daysSince,
  houseChanges,
  localNow,
  morningFor,
  remindersFor,
  type Event,
  type Task,
  type User,
} from './plan.ts'

const DAY = '2026-10-25'
const user: User = {
  uid: 'hania',
  name: 'Hania',
  houseId: 'dom1',
  notif: { tasks: true, events: true, morning: true, house: true },
  taskReminderTime: '18:00',
  cleanupDays: 30,
}
const task = (over: Partial<Task>): Task => ({
  id: 't',
  title: 'Zadanie',
  priority: 'mid',
  due: null,
  done: false,
  doneAt: null,
  doneBy: null,
  deleted: false,
  deletedAt: null,
  createdBy: 'hania',
  updatedBy: 'hania',
  ...over,
})
const event = (over: Partial<Event>): Event => ({
  id: 'e',
  title: 'Wydarzenie',
  date: DAY,
  allDay: true,
  from: null,
  remind: 'none',
  deleted: false,
  deletedAt: null,
  ...over,
})

describe('czas polski', () => {
  test('letni i zimowy (UTC+2 / UTC+1)', () => {
    expect(localNow(Date.parse('2026-07-01T06:00:00Z'))).toEqual({
      day: '2026-07-01',
      time: '08:00',
    })
    expect(localNow(Date.parse('2026-12-01T07:00:00Z'))).toEqual({
      day: '2026-12-01',
      time: '08:00',
    })
    expect(localNow(Date.parse('2026-12-31T23:30:00Z'))).toEqual({
      day: '2027-01-01',
      time: '00:30',
    })
  })
  test('dni od chwili do dnia', () => {
    expect(daysSince(Date.parse('2026-10-24T22:30:00Z'), DAY)).toBe(0) // 00:30 w Polsce
    expect(daysSince(Date.parse('2026-09-20T10:00:00Z'), DAY)).toBe(35)
  })
})

describe('przypomnienia o godzinie z Ustawień', () => {
  test('terminy jutro – jedno albo kilka; ogarnięte i w koszu pomijane', () => {
    const tasks = [
      task({ id: '1', title: 'Rachunek', due: '2026-10-26' }),
      task({ id: '2', title: 'Ogarnięte', due: '2026-10-26', done: true }),
      task({ id: '3', title: 'W koszu', due: '2026-10-26', deleted: true }),
      task({ id: '4', title: 'Pojutrze', due: '2026-10-27' }),
    ]
    expect(remindersFor(user, tasks, [], DAY)).toEqual([
      { title: 'Jutro termin', body: 'Rachunek', url: '/zadania', tag: 'terminy' },
    ])
    const many = ['A', 'B', 'C', 'D', 'E'].map((t, i) =>
      task({ id: t, title: t, due: '2026-10-26', priority: String(i) }),
    )
    expect(remindersFor(user, many, [], DAY)[0]).toMatchObject({
      title: 'Jutro terminy: 5',
      body: 'A, B, C i 2 więcej',
    })
  })
  test('wydarzenia: „dzień wcześniej” jutro, „tydzień wcześniej” za 7 dni; bez przypomnienia – nic', () => {
    const events = [
      event({ id: 'a', title: 'Urodziny Oli', date: '2026-10-26', remind: 'day' }),
      event({
        id: 'b',
        title: 'Dentysta',
        date: '2026-11-01',
        remind: 'week',
        allDay: false,
        from: '17:00',
      }),
      event({ id: 'c', title: 'Bez', date: '2026-10-26', remind: 'none' }),
    ]
    expect(remindersFor(user, [], events, DAY)).toEqual([
      {
        title: 'Jutro: Urodziny Oli',
        body: 'Jutro – cały dzień',
        url: '/kalendarz?dzien=2026-10-26',
        tag: 'wydarzenie-a',
      },
      {
        title: 'Za tydzień: Dentysta',
        body: 'Za tydzień 17:00',
        url: '/kalendarz?dzien=2026-11-01',
        tag: 'wydarzenie-b',
      },
    ])
  })
  test('wyłączone w Ustawieniach – nie wysyłamy', () => {
    const off = { ...user, notif: { ...user.notif, tasks: false, events: false } }
    expect(
      remindersFor(
        off,
        [task({ due: '2026-10-26' })],
        [event({ date: '2026-10-26', remind: 'day' })],
        DAY,
      ),
    ).toEqual([])
  })
})

describe('poranne podsumowanie', () => {
  test('tylko gdy jest coś pilnego, termin na dziś (albo po terminie) lub wydarzenie dziś', () => {
    expect(morningFor(user, [task({ due: '2026-10-30' })], [], DAY)).toBeNull()
    expect(
      morningFor(
        user,
        [task({ priority: 'high' }), task({ id: 'x', title: 'Rachunek', due: '2026-10-24' })],
        [event({ title: 'Kino', allDay: false, from: '19:00' })],
        DAY,
      ),
    ).toEqual({
      title: 'Na dziś',
      body: 'Pilne: 1 · Termin dziś: Rachunek · Dziś: Kino 19:00',
      url: '/',
      tag: 'poranek',
    })
  })
  test('wyłączone – nic', () => {
    expect(
      morningFor(
        { ...user, notif: { ...user.notif, morning: false } },
        [task({ priority: 'high' })],
        [],
        DAY,
      ),
    ).toBeNull()
  })
})

describe('zmiany domowników', () => {
  const from = Date.parse('2026-10-25T10:00:00Z')
  const to = from + 60_000
  test('nowe zadanie i ogarnięte w tej minucie; zwykła edycja i kosz – nic', () => {
    const changes = houseChanges(
      [
        {
          houseId: 'dom1',
          task: task({ title: 'Mleko', createdBy: 'krzys' }),
          createTime: from + 5000,
        },
        {
          houseId: 'dom1',
          task: task({ title: 'Filtr', done: true, doneAt: from + 10, doneBy: 'krzys' }),
          createTime: 0,
        },
        { houseId: 'dom1', task: task({ title: 'Edycja' }), createTime: 0 },
        { houseId: 'dom1', task: task({ title: 'Kosz', deleted: true }), createTime: from + 1 },
      ],
      from,
      to,
    )
    expect(changes).toEqual([
      { houseId: 'dom1', actor: 'krzys', kind: 'added', title: 'Mleko' },
      { houseId: 'dom1', actor: 'krzys', kind: 'done', title: 'Filtr' },
    ])
    expect(changeMessage('Krzyś', 'done', 'Filtr')).toMatchObject({
      title: 'Krzyś · ogarnięte',
      body: 'Filtr',
    })
  })
})

describe('codzienne sprzątanie', () => {
  test('ogarnięte starsze niż ustawienie → Kosz; Kosz po 30 dniach → na zawsze; „Nigdy” – zostają', () => {
    const old = Date.parse('2026-09-01T10:00:00Z')
    const recent = Date.parse('2026-10-20T10:00:00Z')
    const tasks = [
      { ...task({ done: true, doneAt: old }), path: 'h/t/stare' },
      { ...task({ done: true, doneAt: recent }), path: 'h/t/nowe' },
      { ...task({ deleted: true, deletedAt: old }), path: 'h/t/kosz-stary' },
      { ...task({ deleted: true, deletedAt: recent }), path: 'h/t/kosz-nowy' },
    ]
    const events = [{ ...event({ deleted: true, deletedAt: old }), path: 'h/e/stare' }]
    expect(cleanupPlan(tasks, events, DAY, 30)).toEqual({
      toTrash: ['h/t/stare'],
      toDelete: ['h/t/kosz-stary', 'h/e/stare'],
    })
    expect(cleanupPlan(tasks, events, DAY, 7).toTrash).toEqual(['h/t/stare'])
    expect(cleanupPlan(tasks, events, DAY, 3).toTrash).toEqual(['h/t/stare', 'h/t/nowe'])
    expect(cleanupPlan(tasks, events, DAY, null).toTrash).toEqual([])
  })
})
