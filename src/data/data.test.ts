import { describe, expect, test } from 'vitest'
import { priorities } from '../theme'
import { addDays, dueLabel, longDayLabel, shortDayLabel, weekStart } from './dates.ts'
import { mockCategories, mockEvents, mockTasks } from './mock.ts'
import {
  calendarItems,
  openTasks,
  subtaskProgress,
  upcomingEvents,
  urgentOpen,
  weekDays,
} from './selectors.ts'

// Dzień z projektu: piątek 9 października 2026.
const DAY = '2026-10-09'
const tasks = mockTasks(DAY)
const events = mockEvents(DAY)
const catName = (id: string | null) =>
  mockCategories.find((c) => c.id === id)?.name ?? 'Bez kategorii'

describe('daty', () => {
  test('etykiety dnia jak w projekcie', () => {
    expect(longDayLabel(DAY)).toBe('PIĄTEK · 9 PAŹDZIERNIKA')
    expect(shortDayLabel(DAY)).toBe('PIĄTEK 9 PAŹ')
  })

  test('termin: DZIŚ, JUTRO, dzień tygodnia, DO …', () => {
    expect(dueLabel(DAY, DAY)).toBe('DZIŚ')
    expect(dueLabel(addDays(DAY, 1), DAY)).toBe('JUTRO')
    expect(dueLabel('2026-10-13', DAY)).toBe('WT 13 PAŹ')
    expect(dueLabel('2026-10-30', DAY)).toBe('DO 30 PAŹ')
    expect(dueLabel('2026-10-08', DAY)).toBe('PO TERMINIE')
  })

  test('tydzień zaczyna się w poniedziałek', () => {
    expect(weekStart(DAY)).toBe('2026-10-05')
    expect(weekStart('2026-10-11')).toBe('2026-10-05')
    expect(weekDays(DAY)).toHaveLength(7)
  })
})

describe('przykładowe dane = liczby z projektu (Start, 9 paź)', () => {
  test('12 do zrobienia w 6 kategoriach', () => {
    const open = openTasks(tasks)
    expect(open).toHaveLength(12)
    expect(new Set(open.map((t) => t.categoryId)).size).toBe(6)
  })

  test('4 pilne', () => {
    expect(urgentOpen(tasks)).toHaveLength(4)
  })

  test('podzadania: prezent dla mamy 50%', () => {
    expect(subtaskProgress(tasks[0])).toBe(50)
    expect(subtaskProgress(tasks[1])).toBeNull()
  })

  test('najbliższe wydarzenia: od wskazanego dnia, najbliższe najpierw', () => {
    const next = upcomingEvents(events, '2026-10-11', 2)
    expect(next.map((e) => [e.title, e.date])).toEqual([
      ['Zebranie w szkole', '2026-10-13'],
      ['Imieniny mamy', '2026-10-16'],
    ])
  })

  test('kalendarz: terminy niezrobionych zadań jako „Termin zadania”', () => {
    const items = calendarItems(tasks, events, catName, (t) => priorities[t.priority].label)
    const onDay = items.filter((i) => i.date === DAY)
    expect(onDay.map((i) => [i.title, i.typeId, i.note])).toEqual([
      ['Zadzwonić do hydraulika – cieknący kran', 'task', 'Dom · Pilne'],
    ])
  })
})
