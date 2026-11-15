import { describe, expect, test } from 'vitest'
import {
  addDays,
  dueBadge,
  dueLabel,
  longDayLabel,
  shortDayLabel,
  weekEnd,
  weekStart,
} from './dates.ts'
import { mockCategories, mockEvents, mockTasks } from './mock.ts'
import {
  allPriorities,
  calendarItems,
  eventTypeOf,
  openTasks,
  priorityOf,
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

  test('plakietka terminu: jedna skala far → soon → today → late', () => {
    expect(dueBadge(DAY, DAY)).toEqual({ label: 'DZIŚ', level: 'today' })
    expect(dueBadge(addDays(DAY, 1), DAY)).toEqual({ label: 'JUTRO', level: 'soon' })
    expect(dueBadge('2026-10-30', DAY)).toEqual({ label: 'DO 30 PAŹ', level: 'far' })
    expect(dueBadge('2026-10-08', DAY)).toEqual({ label: 'PO TERMINIE', level: 'late' })
  })

  test('plakietka terminu „na tydzień” (termin = niedziela 11 paź)', () => {
    const sun = '2026-10-11'
    // piątek – zwykły termin, sobota – poziom jutra, niedziela – KONIEC TYG., poniedziałek – po terminie
    expect(dueBadge(sun, DAY, true)).toEqual({ label: 'W TYM TYG.', level: 'far' })
    expect(dueBadge(sun, '2026-10-10', true)).toEqual({ label: 'W TYM TYG.', level: 'soon' })
    expect(dueBadge(sun, sun, true)).toEqual({ label: 'KONIEC TYG.', level: 'today' })
    expect(dueBadge(sun, '2026-10-12', true)).toEqual({ label: 'PO TERMINIE', level: 'late' })
    // przyszły tydzień; w poniedziałek staje się „W TYM TYG.”
    expect(dueBadge('2026-10-18', DAY, true)).toEqual({ label: 'PRZYSZŁY TYDZ.', level: 'far' })
    expect(dueBadge('2026-10-18', '2026-10-12', true).label).toBe('W TYM TYG.')
  })

  test('tydzień zaczyna się w poniedziałek, kończy w niedzielę', () => {
    expect(weekEnd(DAY)).toBe('2026-10-11')
    expect(weekEnd('2026-10-11')).toBe('2026-10-11')
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
    const items = calendarItems(
      tasks,
      events,
      catName,
      (t) => priorityOf(allPriorities([]), t.priority).label,
    )
    const onDay = items.filter((i) => i.date === DAY)
    expect(onDay.map((i) => [i.title, i.typeId, i.note])).toEqual([
      ['Zadzwonić do hydraulika – cieknący kran', 'task', 'Dom · Pilne'],
    ])
  })
})

describe('rodzaj wydarzenia', () => {
  test('zawsze jakiś: z listy, wbudowany o tym id albo „Wydarzenie”', () => {
    expect(eventTypeOf([], 'birthday').name).toBe('Urodziny')
    expect(eventTypeOf([], 'r-usuniety').name).toBe('Wydarzenie')
    const own = { ...eventTypeOf([], 'event'), id: 'r1', name: 'Trening' }
    expect(eventTypeOf([own], 'r1').name).toBe('Trening')
  })
})

describe('wydarzenia cykliczne (etap 8)', () => {
  const basen = {
    ...events[0],
    id: 'b',
    title: 'Basen',
    date: '2026-10-02',
    allDay: false,
    from: '17:00',
    repeat: { every: 'week' as const },
    skip: ['2026-10-16'],
  }
  const urodziny = {
    ...events[0],
    id: 'u',
    title: 'Urodziny Oli',
    date: '2019-12-02',
    repeat: { every: 'year' as const },
  }
  const label = (t: (typeof tasks)[number]) => priorityOf(allPriorities([]), t.priority).label

  test('kalendarz: powtórki w przedziale jako osobne wpisy (id@dzień), bez pominiętych', () => {
    const items = calendarItems([], [basen], catName, label, {
      from: '2026-10-05',
      to: '2026-10-31',
    })
    expect(items.map((i) => [i.id, i.date, i.eventId, i.repeat])).toEqual([
      ['b@2026-10-09', '2026-10-09', 'b', { every: 'week' }],
      ['b@2026-10-23', '2026-10-23', 'b', { every: 'week' }],
      ['b@2026-10-30', '2026-10-30', 'b', { every: 'week' }],
    ])
    // bez przedziału – tylko dzień startu (jak zwykłe wydarzenie)
    expect(calendarItems([], [basen], catName, label).map((i) => i.date)).toEqual(['2026-10-02'])
  })

  test('najbliższe wydarzenia: najbliższe powtórki, także „co rok”', () => {
    const next = upcomingEvents([basen, urodziny], '2026-11-20', 3)
    expect(next.map((e) => [e.title, e.date])).toEqual([
      ['Basen', '2026-11-20'],
      ['Basen', '2026-11-27'],
      ['Urodziny Oli', '2026-12-02'],
    ])
    expect(upcomingEvents([{ ...basen, deleted: true }], '2026-11-20', 2)).toEqual([])
  })
})
