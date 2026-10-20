// Wyliczenia z danych – wspólne dla Startu, Zadań i Kalendarza.

import { addDays, diffDays, weekStart, type DateKey } from './dates.ts'
import { remindNote } from './eventOps.ts'
import { builtInEventTypes } from '../theme'
import type { CalendarEvent, EventType, Task } from './types.ts'

/**
 * Rodzaj wydarzenia po id – zawsze jakiś: z listy domu, wbudowany o tym id albo „Wydarzenie”.
 * Lista rodzajów może jeszcze nie przyjść z bazy (albo rodzaj usunięto) – ekran nie może się wywrócić.
 */
export function eventTypeOf(types: EventType[], id: string): EventType {
  const found = types.find((t) => t.id === id)
  if (found) return found
  const b =
    builtInEventTypes.find((t) => t.id === id) ?? builtInEventTypes.find((t) => t.id === 'event')!
  return { ...b }
}

/** Zadania poza koszem. */
export const liveTasks = (tasks: Task[]) => tasks.filter((t) => !t.deleted)

/** Wydarzenia, które nie zostały usunięte. */
export const liveEvents = (events: CalendarEvent[]) => events.filter((e) => !e.deleted)

export const openTasks = (tasks: Task[]) => liveTasks(tasks).filter((t) => !t.done)

/** Ogarnięte danego dnia (wg doneAt). */
export const doneOn = (tasks: Task[], day: string) =>
  liveTasks(tasks).filter((t) => t.done && t.doneAt?.startsWith(day))

export const urgentOpen = (tasks: Task[]) => openTasks(tasks).filter((t) => t.priority === 'high')

/** % ogarniętych podzadań (null, gdy zadanie nie ma podzadań). */
export function subtaskProgress(task: Task): number | null {
  if (task.subtasks.length === 0) return null
  return Math.round((task.subtasks.filter((s) => s.done).length / task.subtasks.length) * 100)
}

/** Wpis w kalendarzu: wydarzenie albo termin niezrobionego zadania. */
export type CalendarItem = {
  id: string
  title: string
  date: DateKey
  typeId: string
  from: string | null
  to: string | null
  note: string
  taskId?: string
}

export function calendarItems(
  tasks: Task[],
  events: CalendarEvent[],
  categoryName: (id: string | null) => string,
  priorityLabel: (t: Task) => string,
): CalendarItem[] {
  const deadlines: CalendarItem[] = openTasks(tasks)
    .filter((t) => t.due)
    .map((t) => ({
      id: `deadline-${t.id}`,
      title: t.title,
      date: t.due!,
      typeId: 'task',
      from: null,
      to: null,
      note: `${categoryName(t.categoryId)} · ${priorityLabel(t)}`,
      taskId: t.id,
    }))
  const evs: CalendarItem[] = liveEvents(events).map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date,
    typeId: e.typeId,
    from: e.from,
    to: e.to,
    note: [e.note, remindNote(e.remind)].filter(Boolean).join(' · '),
  }))
  return [...deadlines, ...evs].sort(
    (a, b) => a.date.localeCompare(b.date) || (a.from ?? '').localeCompare(b.from ?? ''),
  )
}

/** Wydarzenia (bez terminów zadań) od dziś, najbliższe najpierw. */
export function upcomingEvents(events: CalendarEvent[], today: DateKey, limit = 2) {
  return liveEvents(events)
    .filter((e) => diffDays(today, e.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit)
}

/** Dni bieżącego tygodnia (pn–nd). */
export function weekDays(today: DateKey): DateKey[] {
  const start = weekStart(today)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}
