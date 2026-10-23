// Model danych w Firestore (docs/DESIGN.md → „Model danych”): ścieżki, kształt dokumentów
// i zamiana dokument ↔ typ aplikacji (src/data/types.ts). Bez połączenia z bazą – czyste funkcje.

import { Timestamp, serverTimestamp, type FieldValue } from 'firebase/firestore'
import { toKey, type Stamp } from '../data/dates.ts'
import type {
  CalendarEvent,
  Category,
  CustomPriority,
  CleanupDays,
  EventType,
  Member,
  NotificationSettings,
  Remind,
  Subtask,
  Task,
} from '../data/types.ts'
import { builtInEventTypes, DEFAULT_PRIORITY, defaultCategories } from '../theme'

// ── Ścieżki ────────────────────────────────────────────────────────────────

export const paths = {
  user: (uid: string) => `users/${uid}`,
  house: (houseId: string) => `houses/${houseId}`,
  members: (houseId: string) => `houses/${houseId}/members`,
  categories: (houseId: string) => `houses/${houseId}/categories`,
  /** Własne priorytety (wbudowane są w kodzie). */
  priorities: (houseId: string) => `houses/${houseId}/priorities`,
  tasks: (houseId: string) => `houses/${houseId}/tasks`,
  eventTypes: (houseId: string) => `houses/${houseId}/eventTypes`,
  events: (houseId: string) => `houses/${houseId}/events`,
  /** Zaproszenie do domu: kod 6 cyfr. */
  invite: (code: string) => `invites/${code}`,
} as const

// ── Limity (te same sprawdzą reguły Firestore) ─────────────────────────────

export const LIMITS = {
  title: 200,
  name: 40,
  note: 500,
  subtasks: 50,
} as const

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
  /** Godzina przypomnienia o terminach zadań dzień wcześniej (etap 6). */
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
  /** Kod zaproszenia, którym domownik dołączył (założyciel – brak). */
  invite?: string
}

export type CategoryDoc = Omit<Category, 'id'> & Changed

export type PriorityDoc = Omit<CustomPriority, 'id'> & Changed

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
    note: t.note,
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
    // wbudowany albo własny – nieznany id pokaże się jako „Ważne” (priorityOf)
    priority: typeof d.priority === 'string' && d.priority ? d.priority : DEFAULT_PRIORITY,
    due: d.due ?? null,
    done: !!d.done,
    subtasks: (d.subtasks ?? []).map((s: Subtask) => ({
      id: s.id,
      title: s.title,
      done: !!s.done,
    })),
    note: d.note ?? '',
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

export function priorityToDoc(p: CustomPriority, uid: string): PriorityDoc {
  return { name: p.name, color: p.color, order: p.order, ...changed(uid) }
}

export function priorityFromDoc(id: string, d: Partial<PriorityDoc>): CustomPriority {
  return { id, name: d.name ?? '', color: d.color ?? '#9AA59D', order: d.order ?? 100 }
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
      data: eventTypeToDoc({ ...t }, uid),
    }),
  )
  return docs
}

// ── Zaproszenia (etap 4) ───────────────────────────────────────────────────

/** Ważność zaproszenia w minutach (reguły liczą ją od czasu serwera przy tworzeniu). */
export const INVITE_MINUTES = 10

export type InviteDoc = {
  houseId: string
  /** Nazwa domu i imię zapraszającego – dla „Znaleziono dom” (nowy domownik nie czyta jeszcze domu). */
  houseName: string
  createdBy: string
  inviterName: string
  /** Imiona obecnych domowników – „Hania i Krzyś” na „Znaleziono dom”. */
  memberNames: string[]
  createdAt: Timestamp | FieldValue
  /** Co zobaczy domownik. */
  scope: Member['scope']
  /** Kto użył zaproszenia (raz) i kiedy. */
  usedBy: string | null
  usedAt: Timestamp | FieldValue | null
}

/** Losowy kod 6 cyfr („482913”); w bazie bez spacji, na ekranie „482 913”. */
export function newInviteCode(random = Math.random): string {
  return String(Math.floor(100000 + random() * 900000))
}

export function newInviteDoc(opts: {
  houseId: string
  houseName: string
  uid: string
  name: string
  memberNames?: string[]
  scope: Member['scope']
}): InviteDoc {
  return {
    houseId: opts.houseId,
    houseName: opts.houseName,
    createdBy: opts.uid,
    inviterName: opts.name,
    memberNames: (opts.memberNames ?? [opts.name]).slice(0, 20),
    createdAt: serverTimestamp(),
    scope: opts.scope,
    usedBy: null,
    usedAt: null,
  }
}

/** Ile milisekund zaproszenie jest jeszcze ważne (0 – wygasło). */
export function inviteLeftMs(createdAt: Timestamp, now = Date.now()): number {
  return Math.max(0, createdAt.toMillis() + INVITE_MINUTES * 60_000 - now)
}

export type JoinOp = { path: string; data: Record<string, unknown>; merge?: boolean }

/**
 * „Dołącz jako …”: jedna paczka – zaproszenie oznaczone jako użyte, nowy domownik (zakres z zaproszenia)
 * i profil z houseId. `hasProfile` – konto ma już profil (wtedy tylko imię i dom, reszta zostaje).
 */
export function joinHouseOps(opts: {
  code: string
  invite: Pick<InviteDoc, 'houseId' | 'scope'>
  uid: string
  userName: string
  hasProfile: boolean
}): JoinOp[] {
  const { code, invite, uid, userName, hasProfile } = opts
  return [
    {
      path: paths.invite(code),
      data: { usedBy: uid, usedAt: serverTimestamp() },
      merge: true,
    },
    {
      path: `${paths.members(invite.houseId)}/${uid}`,
      data: {
        name: userName,
        role: 'member',
        scope: invite.scope,
        joinedAt: serverTimestamp(),
        invite: code,
      } satisfies MemberDoc,
    },
    hasProfile
      ? { path: paths.user(uid), data: { name: userName, houseId: invite.houseId }, merge: true }
      : {
          path: paths.user(uid),
          data: { ...DEFAULT_USER, name: userName, houseId: invite.houseId } satisfies UserDoc,
        },
  ]
}
