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

export type CalendarEvent = {
  id: string
  title: string
  date: DateKey
  allDay: boolean
  from: string | null
  to: string | null
  typeId: string
  /** Opis pod tytułem, np. „Przypomnienie dzień wcześniej”. */
  note: string
}

export type Member = {
  uid: string
  name: string
  role: 'owner' | 'member'
  scope: { all: boolean; categoryIds: string[]; calendar: boolean }
  /** Ostatnia zmiana, np. „DZIŚ 13:05”. */
  lastSeen: string
}

export type NotificationSettings = {
  tasks: boolean
  events: boolean
  morning: boolean
  house: boolean
}
