// Model danych (docs/DESIGN.md → „Model danych”). W etapie 1 dane są przykładowe, w pamięci.

import type { Priority } from '../theme'
import type { DateKey } from './dates.ts'

export type Category = { id: string; name: string; color: string; order: number }

export type Subtask = { id: string; title: string; done: boolean }

export type Task = {
  id: string
  title: string
  categoryId: string | null
  priority: Priority
  due: DateKey | null
  done: boolean
  subtasks: Subtask[]
  /** uid domownika, który dodał zadanie. */
  createdBy: string
  /** Kiedy ogarnięte: 'RRRR-MM-DDTHH:MM' (czas lokalny). */
  doneAt: string | null
  /** uid domownika, który ogarnął. */
  doneBy: string | null
  /** Kosz: miękkie usunięcie (po 30 dniach od deletedAt – usunięcie na zawsze). */
  deleted: boolean
  deletedAt: string | null
  deletedBy: string | null
}

export type EventType = {
  id: string
  name: string
  dot: string
  bg: string
  fg: string
  icon: 'deadline' | 'bday' | 'party' | 'event' | 'custom'
  system: boolean
}

/** Przypomnienie o wydarzeniu (wysyłka – etap 7). */
export type Remind = 'none' | 'day' | 'week'

export type CalendarEvent = {
  id: string
  title: string
  date: DateKey
  allDay: boolean
  from: string | null
  to: string | null
  typeId: string
  remind: Remind
  /** uid domownika, który dodał wydarzenie. */
  createdBy: string
  /** Dopisek pod tytułem, np. „Co roku”, „Przynieść wino”. */
  note: string
  /** Usunięte (miękko, jak zadania w koszu). */
  deleted: boolean
  deletedAt: string | null
  deletedBy: string | null
}

export type Member = {
  uid: string
  name: string
  role: 'owner' | 'member'
  scope: { all: boolean; categoryIds: string[]; calendar: boolean }
  /** Dopełniacz imienia: „u Krzysia”. */
  nameGenitive: string
  /** Ostatnia zmiana, np. „DZIŚ 13:05”. */
  lastSeen: string
}

export type NotificationSettings = {
  tasks: boolean
  events: boolean
  morning: boolean
  house: boolean
}

/** Sprzątanie ogarniętych (Ustawienia → Porządki): po 7 / 30 dniach, null = nigdy. */
export type CleanupDays = 7 | 30 | null
