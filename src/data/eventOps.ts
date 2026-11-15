// Zmiany wydarzeń wspólne dla ekranów (etap 1: w pamięci; od etapu 2 – zapis do Firestore).

import type { DateKey } from './dates.ts'
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

/** Wydarzenie cykliczne – „Usuń → Tylko to”: ten dzień pomijamy, reszta powtórek zostaje. */
export function skipOccurrence(event: CalendarEvent, day: DateKey): CalendarEvent {
  const skip = event.skip ?? []
  return skip.includes(day) ? event : { ...event, skip: [...skip, day].sort() }
}

export function restoreEvent(event: CalendarEvent): CalendarEvent {
  return { ...event, deleted: false, deletedAt: null, deletedBy: null }
}

/** Pola zmieniane w arkuszu wydarzenia („Edytuj” → „Zapisz”). */
export type EventEdit = Pick<
  CalendarEvent,
  'title' | 'typeId' | 'date' | 'allDay' | 'from' | 'to' | 'remind' | 'repeat' | 'note' | 'private'
>

export const eventEditOf = (e: CalendarEvent): EventEdit => ({
  title: e.title,
  typeId: e.typeId,
  date: e.date,
  allDay: e.allDay,
  from: e.from,
  to: e.to,
  remind: e.remind,
  repeat: e.repeat,
  note: e.note,
  private: e.private,
})

/**
 * „Zapisz” w arkuszu wydarzenia – zmienia wszystkie powtórki (decyzja Hani 2026-11-15).
 * Wyłączone powtarzanie kasuje też pominięte dni; zmiana dnia startu – pominięte zostają.
 */
export function editEvent(event: CalendarEvent, edit: EventEdit): CalendarEvent {
  const next = { ...event, ...edit }
  if (!next.repeat) {
    delete next.repeat
    delete next.skip
  }
  return next
}

/** Cały dzień ⇄ godzina (domyślnie 18:00, jak w arkuszu nowego wydarzenia). */
export function setAllDay<T extends Pick<CalendarEvent, 'allDay' | 'from' | 'to'>>(
  event: T,
  allDay: boolean,
): T {
  return allDay
    ? { ...event, allDay: true, from: null, to: null }
    : { ...event, allDay: false, from: event.from ?? '18:00' }
}
