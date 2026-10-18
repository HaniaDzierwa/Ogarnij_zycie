// Model danych w Firestore (docs/DESIGN.md → „Model danych”): ścieżki, kształt dokumentów
// i zamiana dokument ↔ typ aplikacji (src/data/types.ts). Bez połączenia z bazą – czyste funkcje.

import { Timestamp, serverTimestamp, type FieldValue } from 'firebase/firestore'
import { toKey, type Stamp } from '../data/dates.ts'
import type {
  CalendarEvent,
  Category,
  CleanupDays,
  EventType,
  Member,
  NotificationSettings,
  Remind,
  Subtask,
  Task,
} from '../data/types.ts'
import { builtInEventTypes, defaultCategories, type Priority } from '../theme'

// ── Ścieżki ────────────────────────────────────────────────────────────────

export const paths = {
  user: (uid: string) => `users/${uid}`,
  house: (houseId: string) => `houses/${houseId}`,
  members: (houseId: string) => `houses/${houseId}/members`,
  categories: (houseId: string) => `houses/${houseId}/categories`,
  tasks: (houseId: string) => `houses/${houseId}/tasks`,
  eventTypes: (houseId: string) => `houses/${houseId}/eventTypes`,
  events: (houseId: string) => `houses/${houseId}/events`,
} as const

// ── Limity (te same sprawdzą reguły Firestore) ─────────────────────────────

export const LIMITS = {
  title: 200,
  name: 40,
  note: 500,
  subtasks: 50,
} as const

export const PRIORITIES: readonly Priority[] = ['high', 'mid', 'low']
export const REMINDS: readonly Remind[] = ['none', 'day', 'week']

// ── Czas: aplikacja „RRRR-MM-DDTHH:MM” (czas lokalny) ↔ Timestamp w bazie ─

export function stampToTimestamp(s: Stamp): Timestamp {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  const [hh, mm] = s.slice(11, 16).split(':').map(Number)
  return Timestamp.fromDate(new Date(y, m - 1, d, hh, mm))
}

export function timestampToStamp(t: Timestamp): Stamp {
  const d = t.toDate()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${toKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const tsOrNull = (s: Stamp | null) => (s ? stampToTimestamp(s) : null)
const stampOrNull = (t: Timestamp | null | undefined) => (t ? timestampToStamp(t) : null)

// ── Dokumenty ──────────────────────────────────────────────────────────────

/** Kto i kiedy zmienił – przy każdym zapisie (updatedAt ustawia serwer). */
type Changed = { updatedAt: Timestamp | FieldValue; updatedBy: string }

export type UserDoc = {
  name: string
  houseId: string | null
  notif: NotificationSettings
  cleanupDays: CleanupDays
  /** Godzina przypomnienia o terminach zadań dzień wcześniej (etap 7). */
  taskReminderTime: string
}

export type HouseDoc = {
  name: string
  ownerUid: string
  createdAt: Timestamp | FieldValue
}

export type MemberDoc = {
  name: string
  role: Member['role']
  scope: Member['scope']
  joinedAt: Timestamp | FieldValue
}

export type CategoryDoc = Omit<Category, 'id'> & Changed

export type TaskDoc = Omit<Task, 'id' | 'doneAt' | 'deletedAt'> & {
  doneAt: Timestamp | null
  deletedAt: Timestamp | null
} & Changed

export type EventTypeDoc = Omit<EventType, 'id'> & Changed

export type EventDoc = Omit<CalendarEvent, 'id' | 'deletedAt'> & {
  deletedAt: Timestamp | null
} & Changed

const changed = (uid: string): Changed => ({ updatedAt: serverTimestamp(), updatedBy: uid })

// ── Zadania ────────────────────────────────────────────────────────────────

export function taskToDoc(t: Task, uid: string): TaskDoc {
  return {
    title: t.title,
    categoryId: t.categoryId,
    priority: t.priority,
    due: t.due,
    done: t.done,
    subtasks: t.subtasks.map(({ id, title, done }) => ({ id, title, done })),
    createdBy: t.createdBy,
    doneAt: tsOrNull(t.doneAt),
    doneBy: t.doneBy,
    deleted: t.deleted,
    deletedAt: tsOrNull(t.deletedAt),
    deletedBy: t.deletedBy,
    ...changed(uid),
  }
}

export function taskFromDoc(id: string, d: Partial<TaskDoc>): Task {
  return {
    id,
    title: d.title ?? '',
    categoryId: d.categoryId ?? null,
    priority: PRIORITIES.includes(d.priority as Priority) ? (d.priority as Priority) : 'mid',
    due: d.due ?? null,
    done: !!d.done,
    subtasks: (d.subtasks ?? []).map((s: Subtask) => ({
      id: s.id,
      title: s.title,
      done: !!s.done,
    })),
    createdBy: d.createdBy ?? '',
    doneAt: stampOrNull(d.doneAt),
    doneBy: d.doneBy ?? null,
    deleted: !!d.deleted,
    deletedAt: stampOrNull(d.deletedAt),
    deletedBy: d.deletedBy ?? null,
  }
}

// ── Wydarzenia ─────────────────────────────────────────────────────────────

export function eventToDoc(e: CalendarEvent, uid: string): EventDoc {
  return {
    title: e.title,
    date: e.date,
    allDay: e.allDay,
    from: e.allDay ? null : e.from,
    to: e.allDay ? null : e.to,
    typeId: e.typeId,
    remind: e.remind,
    createdBy: e.createdBy,
    note: e.note,
    deleted: e.deleted,
    deletedAt: tsOrNull(e.deletedAt),
    deletedBy: e.deletedBy,
    ...changed(uid),
  }
}

export function eventFromDoc(id: string, d: Partial<EventDoc>): CalendarEvent {
  return {
    id,
    title: d.title ?? '',
    date: d.date ?? '',
    allDay: d.allDay ?? true,
    from: d.from ?? null,
    to: d.to ?? null,
    typeId: d.typeId ?? 'event',
    remind: REMINDS.includes(d.remind as Remind) ? (d.remind as Remind) : 'none',
    createdBy: d.createdBy ?? '',
    note: d.note ?? '',
    deleted: !!d.deleted,
    deletedAt: stampOrNull(d.deletedAt),
    deletedBy: d.deletedBy ?? null,
  }
}

// ── Kategorie i rodzaje wydarzeń ───────────────────────────────────────────

export function categoryToDoc(c: Category, uid: string): CategoryDoc {
  return { name: c.name, color: c.color, order: c.order, ...changed(uid) }
}

export function categoryFromDoc(id: string, d: Partial<CategoryDoc>): Category {
  return { id, name: d.name ?? '', color: d.color ?? '#9AA59D', order: d.order ?? 0 }
}

export function eventTypeToDoc(t: EventType, uid: string): EventTypeDoc {
  const { name, dot, bg, fg, icon, system } = t
  return { name, dot, bg, fg, icon, system, ...changed(uid) }
}

export function eventTypeFromDoc(id: string, d: Partial<EventTypeDoc>): EventType {
  return {
    id,
    name: d.name ?? '',
    dot: d.dot ?? '#A9CBE8',
    bg: d.bg ?? '#DCE6EC',
    fg: d.fg ?? '#2F5670',
    icon: d.icon ?? 'custom',
    system: !!d.system,
  }
}

// ── Profil użytkownika ─────────────────────────────────────────────────────

export const DEFAULT_USER: Omit<UserDoc, 'name'> = {
  houseId: null,
  notif: { tasks: true, events: true, morning: true, house: false },
  cleanupDays: 30,
  taskReminderTime: '18:00',
}

// ── Nowy dom ───────────────────────────────────────────────────────────────

/** Ikony wbudowanych rodzajów wydarzeń (id z src/theme). */
const BUILT_IN_ICONS: Record<string, EventType['icon']> = {
  task: 'deadline',
  birthday: 'bday',
  party: 'party',
  event: 'event',
  doctor: 'custom',
}

export type NewDoc = { path: string; data: Record<string, unknown> }

/**
 * „Załóż nowy dom” (etap 2, krok 5): wszystkie dokumenty do zapisania w jednej paczce –
 * dom z nazwą, założyciel jako domownik, profil z houseId, domyślne kategorie i rodzaje wydarzeń.
 * `newId` daje identyfikatory (w aplikacji – z Firestore, w testach – przewidywalne).
 */
export function newHouseDocs(opts: {
  houseId: string
  houseName: string
  uid: string
  userName: string
  newId: () => string
}): NewDoc[] {
  const { houseId, houseName, uid, userName, newId } = opts
  const docs: NewDoc[] = [
    {
      path: paths.house(houseId),
      data: { name: houseName, ownerUid: uid, createdAt: serverTimestamp() } satisfies HouseDoc,
    },
    {
      path: `${paths.members(houseId)}/${uid}`,
      data: {
        name: userName,
        role: 'owner',
        scope: { all: true, categoryIds: [], calendar: true },
        joinedAt: serverTimestamp(),
      } satisfies MemberDoc,
    },
    {
      path: paths.user(uid),
      data: { ...DEFAULT_USER, name: userName, houseId } satisfies UserDoc,
    },
  ]
  defaultCategories.forEach((c, order) =>
    docs.push({
      path: `${paths.categories(houseId)}/${newId()}`,
      data: categoryToDoc({ id: '', name: c.name, color: c.color, order }, uid),
    }),
  )
  builtInEventTypes.forEach((t) =>
    docs.push({
      path: `${paths.eventTypes(houseId)}/${t.id}`,
      data: eventTypeToDoc({ ...t, icon: BUILT_IN_ICONS[t.id] }, uid),
    }),
  )
  return docs
}
