import { describe, expect, test } from 'vitest'
import { eventActivity, eventWhen, taskActivity } from './activity.ts'
import { mockEvents, mockTasks } from './mock.ts'

const DAY = '2026-10-09' // piątek
const base = mockTasks(DAY)[1] // otwarte, wspólne
const t = {
  ...base,
  id: 'x',
  title: 'Rachunek',
  due: null,
  priority: 'mid',
  done: false,
  deleted: false,
}
const ev = {
  ...mockEvents(DAY)[0],
  id: 'e',
  title: 'Kino',
  date: '2026-10-10',
  allDay: false,
  from: '19:00',
  deleted: false,
  private: false,
}

describe('zadania – co daje powiadomienie (docs/POWIADOMIENIA.md)', () => {
  test('T1 nowe; T11 „Tylko ja” → „Wspólne”; nowe „Tylko ja” – nic (Z2)', () => {
    expect(taskActivity([], [t], DAY)).toEqual([
      { kind: 'task-added', title: 'Rachunek', detail: null, date: null },
    ])
    expect(taskActivity([{ ...t, private: true }], [t], DAY).map((a) => a.kind)).toEqual([
      'task-added',
    ])
    expect(taskActivity([], [{ ...t, private: true }], DAY)).toEqual([])
  })
  test('T2 ogarnięte; T3 przywrócone – nic', () => {
    const done = { ...t, done: true }
    expect(taskActivity([t], [done], DAY).map((a) => a.kind)).toEqual(['task-done'])
    expect(taskActivity([done], [t], DAY)).toEqual([])
  })
  test('T4 termin na dziś / jutro – tak; T5 później lub bez terminu – nie', () => {
    expect(taskActivity([t], [{ ...t, due: '2026-10-10' }], DAY)).toEqual([
      { kind: 'task-due-soon', title: 'Rachunek', detail: 'JUTRO', date: null },
    ])
    expect(taskActivity([t], [{ ...t, due: DAY }], DAY)[0].detail).toBe('DZIŚ')
    expect(taskActivity([t], [{ ...t, due: '2026-10-20' }], DAY)).toEqual([])
    expect(taskActivity([{ ...t, due: DAY }], [t], DAY)).toEqual([])
  })
  test('T6 oznaczone jako Pilne; T7 inne edycje – nic; T8 kroki – nic', () => {
    expect(taskActivity([t], [{ ...t, priority: 'high' }], DAY).map((a) => a.kind)).toEqual([
      'task-urgent',
    ])
    expect(taskActivity([{ ...t, priority: 'high' }], [{ ...t, priority: 'low' }], DAY)).toEqual([])
    expect(
      taskActivity([t], [{ ...t, title: 'Nowa nazwa', note: 'x', categoryId: null }], DAY),
    ).toEqual([])
    expect(
      taskActivity([t], [{ ...t, subtasks: [{ id: 's', title: 'Krok', done: true }] }], DAY),
    ).toEqual([])
  })
  test('T9 do Kosza – tak; ogarnięte do Kosza (sprzątanie, „Wyczyść”) i przywrócenie – nie (T10)', () => {
    expect(taskActivity([t], [{ ...t, deleted: true }], DAY).map((a) => a.kind)).toEqual([
      'task-trashed',
    ])
    expect(
      taskActivity([{ ...t, done: true }], [{ ...t, done: true, deleted: true }], DAY),
    ).toEqual([])
    expect(taskActivity([{ ...t, deleted: true }], [t], DAY)).toEqual([])
  })
  test('T12 „Wspólne” → „Tylko ja” – nic', () => {
    expect(taskActivity([t], [{ ...t, private: true }], DAY)).toEqual([])
  })
})

describe('wydarzenia – co daje powiadomienie', () => {
  test('W1 nowe (z dniem i godziną); W6 „Tylko ja” → „Wspólne”; „Tylko ja” – nic', () => {
    expect(eventActivity([], [ev], DAY)).toEqual([
      { kind: 'event-added', title: 'Kino', detail: 'so 10 paź, 19:00', date: '2026-10-10' },
    ])
    expect(eventActivity([{ ...ev, private: true }], [ev], DAY).map((a) => a.kind)).toEqual([
      'event-added',
    ])
    expect(eventActivity([], [{ ...ev, private: true }], DAY)).toEqual([])
  })
  test('W2 zmiana dnia albo godziny – „przełożone”; W3 inne edycje – nic', () => {
    expect(eventActivity([ev], [{ ...ev, date: '2026-10-12' }], DAY)[0]).toMatchObject({
      kind: 'event-moved',
      detail: 'pn 12 paź, 19:00',
    })
    expect(eventActivity([ev], [{ ...ev, from: '20:00' }], DAY).map((a) => a.kind)).toEqual([
      'event-moved',
    ])
    expect(eventActivity([ev], [{ ...ev, allDay: true, from: null }], DAY)[0].detail).toBe(
      'so 10 paź',
    )
    expect(
      eventActivity([ev], [{ ...ev, title: 'Kino z Olą', remind: 'week', note: 'x' }], DAY),
    ).toEqual([])
  })
  test('W4 do Kosza – „odwołane”; W5 przywrócenie – nic; Z7 miniony dzień – nic', () => {
    expect(eventActivity([ev], [{ ...ev, deleted: true }], DAY).map((a) => a.kind)).toEqual([
      'event-trashed',
    ])
    expect(eventActivity([{ ...ev, deleted: true }], [ev], DAY)).toEqual([])
    const past = { ...ev, date: '2026-10-01' }
    expect(eventActivity([past], [{ ...past, deleted: true }], DAY)).toEqual([])
  })
  test('opis dnia', () => {
    expect(eventWhen({ date: '2026-10-31', allDay: false, from: '17:00' })).toBe('so 31 paź, 17:00')
  })
})
