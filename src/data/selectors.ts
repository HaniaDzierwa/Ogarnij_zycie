// Wyliczenia z danych – wspólne dla Startu, Zadań i Kalendarza.

import { addDays, diffDays, weekStart, type DateKey } from './dates.ts'
import type { CalendarEvent, Task } from './types.ts'

export const openTasks = (tasks: Task[]) => tasks.filter((t) => !t.done)

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
  const evs: CalendarItem[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date,
    typeId: e.typeId,
    from: e.from,
    to: e.to,
    note: e.note,
  }))
  return [...deadlines, ...evs].sort(
    (a, b) => a.date.localeCompare(b.date) || (a.from ?? '').localeCompare(b.from ?? ''),
  )
}

/** Wydarzenia (bez terminów zadań) od dziś, najbliższe najpierw. */
export function upcomingEvents(events: CalendarEvent[], today: DateKey, limit = 2) {
  return events
    .filter((e) => diffDays(today, e.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit)
}

/** Dni bieżącego tygodnia (pn–nd). */
export function weekDays(today: DateKey): DateKey[] {
  const start = weekStart(today)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}
