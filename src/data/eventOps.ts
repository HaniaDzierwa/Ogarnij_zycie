// Zmiany wydarzeń wspólne dla ekranów (etap 1: w pamięci; od etapu 2 – zapis do Firestore).

import type { Who } from './taskOps.ts'
import type { CalendarEvent, Remind } from './types.ts'

export const REMINDS: { id: Remind; name: string }[] = [
  { id: 'none', name: 'Brak' },
  { id: 'day', name: 'Dzień wcześniej' },
  { id: 'week', name: 'Tydzień wcześniej' },
]

/** Opis przypomnienia pod tytułem: „Przypomnienie dzień wcześniej”; pusto, gdy brak. */
export const remindNote = (r: Remind) =>
  r === 'none' ? '' : `Przypomnienie ${REMINDS.find((x) => x.id === r)!.name.toLowerCase()}`

export function deleteEvent(event: CalendarEvent, who: Who): CalendarEvent {
  return { ...event, deleted: true, deletedAt: who.at, deletedBy: who.uid }
}

export function restoreEvent(event: CalendarEvent): CalendarEvent {
  return { ...event, deleted: false, deletedAt: null, deletedBy: null }
}

/** Pola zmieniane w arkuszu wydarzenia („Edytuj” → „Zapisz”). */
export type EventEdit = Pick<
  CalendarEvent,
  'title' | 'typeId' | 'date' | 'allDay' | 'from' | 'to' | 'remind' | 'note' | 'private'
>

export const eventEditOf = (e: CalendarEvent): EventEdit => ({
  title: e.title,
  typeId: e.typeId,
  date: e.date,
  allDay: e.allDay,
  from: e.from,
  to: e.to,
  remind: e.remind,
  note: e.note,
  private: e.private,
})

/** Cały dzień ⇄ godzina (domyślnie 18:00, jak w arkuszu nowego wydarzenia). */
export function setAllDay<T extends Pick<CalendarEvent, 'allDay' | 'from' | 'to'>>(
  event: T,
  allDay: boolean,
): T {
  return allDay
    ? { ...event, allDay: true, from: null, to: null }
    : { ...event, allDay: false, from: event.from ?? '18:00' }
}
