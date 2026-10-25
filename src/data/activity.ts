// Wpisy „co się stało” dla powiadomień o zmianach domowników (docs/POWIADOMIENIA.md, zatwierdzone
// przez Hanię 2026-10-25). Aplikacja porównuje listę przed i po zmianie; Worker rozsyła wpisy.
// „Tylko ja” nigdy nie daje wpisu (Z2).

import { addDays, DAYS_SHORT, dueLabel, MONTHS_SHORT, parseKey, type DateKey } from './dates.ts'
import type { CalendarEvent, Task } from './types.ts'

export type ActivityKind =
  | 'task-added' // T1, T11
  | 'task-done' // T2
  | 'task-due-soon' // T4
  | 'task-urgent' // T6
  | 'task-trashed' // T9
  | 'event-added' // W1, W6
  | 'event-moved' // W2
  | 'event-trashed' // W4

export type Activity = {
  kind: ActivityKind
  title: string
  /** „JUTRO” (termin) albo „sob 26 paź, 19:00” (wydarzenie). */
  detail: string | null
  /** Dzień wydarzenia – do otwarcia kalendarza z powiadomienia. */
  date: DateKey | null
}

const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [x.id, x]))

/** „sob 26 paź, 19:00” / „sob 26 paź” */
export function eventWhen(e: Pick<CalendarEvent, 'date' | 'allDay' | 'from'>): string {
  const d = parseKey(e.date)
  const day = `${DAYS_SHORT[d.getDay()].toLowerCase()} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()].toLowerCase()}`
  return e.allDay || !e.from ? day : `${day}, ${e.from}`
}

/** Zadania: wspólne, które domownik dodał, ogarnął, przesunął na dziś / jutro, oznaczył jako pilne, usunął. */
export function taskActivity(prev: Task[], next: Task[], today: DateKey): Activity[] {
  const before = byId(prev)
  const soon = new Set([today, addDays(today, 1)])
  const out: Activity[] = []
  for (const t of next) {
    if (t.private) continue
    const p = before.get(t.id)
    const add = (kind: ActivityKind, detail: string | null = null) =>
      out.push({ kind, title: t.title, detail, date: null })
    // nowe dla innych: dodane albo „Tylko ja” → „Wspólne” (T1, T11)
    if (!p || p.private) {
      if (!t.deleted && !t.done) add('task-added')
      continue
    }
    // do Kosza – ale nie ogarnięte (sprzątanie, „Wyczyść”) (T9, T10)
    if (!p.deleted && t.deleted) {
      if (!p.done) add('task-trashed')
      continue
    }
    if (t.deleted) continue
    if (!p.done && t.done) {
      add('task-done')
      continue
    }
    if (t.done) continue
    if (t.due !== p.due && t.due !== null && soon.has(t.due))
      add('task-due-soon', dueLabel(t.due, today))
    if (t.priority === 'high' && p.priority !== 'high') add('task-urgent')
  }
  return out
}

/** Wydarzenia: wspólne, dzisiejsze i przyszłe – dodane, przełożone (dzień / godzina), usunięte. */
export function eventActivity(
  prev: CalendarEvent[],
  next: CalendarEvent[],
  today: DateKey,
): Activity[] {
  const before = byId(prev)
  const out: Activity[] = []
  for (const e of next) {
    if (e.private || e.date < today) continue // Z2, Z7
    const p = before.get(e.id)
    const add = (kind: ActivityKind) =>
      out.push({ kind, title: e.title, detail: eventWhen(e), date: e.date })
    if (!p || p.private) {
      if (!e.deleted) add('event-added')
      continue
    }
    if (!p.deleted && e.deleted) {
      add('event-trashed')
      continue
    }
    if (e.deleted) continue
    const moved = e.date !== p.date || e.allDay !== p.allDay || (!e.allDay && e.from !== p.from)
    if (moved) add('event-moved')
  }
  return out
}
