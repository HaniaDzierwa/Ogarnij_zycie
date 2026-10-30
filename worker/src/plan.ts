// Co i komu wysłać o danej minucie – czyste funkcje (bez sieci), czas polski (Europe/Warsaw).
// Decyzje Hani: podsumowania o godzinach wybranych przez każdego domownika (2026-10-30) – treść wg
// kratek, nic do zgłoszenia – nic nie wysyłamy;
// zmiany domowników wg docs/POWIADOMIENIA.md (zatwierdzone 2026-10-25). „Tylko ja” nigdy nie trafia do innych.

export const ZONE = 'Europe/Warsaw'
export const CLEANUP_TIME = '03:00'
export const TRASH_DAYS = 30

/** `morning` – „Podsumowania” (włączone / wyłączone); `house` – zmiany od domowników. */
export type Notif = { tasks: boolean; events: boolean; morning: boolean; house: boolean }
export type SummaryContent = {
  urgent: boolean
  dueToday: boolean
  dueTomorrow: boolean
  eventsToday: boolean
  eventsSoon: boolean
}
export type User = {
  uid: string
  name: string
  houseId: string | null
  notif: Notif
  /** Godziny podsumowań „HH:MM”, rosnąco (1–5). */
  summaryTimes: string[]
  summaryContent: SummaryContent
  cleanupDays: number | null
}

const TIME = /^([01][0-9]|2[0-3]):[0-5][0-9]$/

/**
 * Godziny podsumowań z profilu; konta sprzed zmiany (bez pola) – jak dotąd: 8:00 i dawna godzina
 * przypomnienia o terminach. Ta sama zasada co summaryTimesOf w aplikacji (src/firebase/model.ts).
 */
export function summaryTimesOf(summaryTimes: unknown, taskReminderTime: unknown): string[] {
  const norm = (xs: unknown[]) =>
    [...new Set(xs.filter((t): t is string => typeof t === 'string' && TIME.test(t)))]
      .sort()
      .slice(0, 5)
  const own = Array.isArray(summaryTimes) ? norm(summaryTimes) : []
  return own.length
    ? own
    : norm(['08:00', typeof taskReminderTime === 'string' ? taskReminderTime : '18:00'])
}

/** Co przychodzi; konta sprzed zmiany – wg dawnych przełączników terminów i wydarzeń. */
export function summaryContentOf(content: unknown, notif: Notif): SummaryContent {
  if (content && typeof content === 'object') {
    const c = content as Record<string, unknown>
    const b = (k: string) => c[k] !== false
    return {
      urgent: b('urgent'),
      dueToday: b('dueToday'),
      dueTomorrow: b('dueTomorrow'),
      eventsToday: b('eventsToday'),
      eventsSoon: b('eventsSoon'),
    }
  }
  return {
    urgent: notif.tasks,
    dueToday: notif.tasks,
    dueTomorrow: notif.tasks,
    eventsToday: notif.events,
    eventsSoon: notif.events,
  }
}
export type Task = {
  id: string
  title: string
  priority: string
  due: string | null
  done: boolean
  doneAt: number | null
  doneBy: string | null
  deleted: boolean
  deletedAt: number | null
  createdBy: string
  updatedBy: string
}
export type Event = {
  id: string
  title: string
  date: string
  allDay: boolean
  from: string | null
  remind: 'none' | 'day' | 'week'
  deleted: boolean
  deletedAt: number | null
}
export type Message = { title: string; body: string; url: string; tag: string }

/** Data i godzina w Polsce: { day: '2026-10-25', time: '18:00' }. */
export function localNow(ms: number): { day: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(ms))
  const get = (t: string) => parts.find((p) => p.type === t)!.value
  return {
    day: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  }
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Ile dni minęło od chwili `ms` do dnia `day` (wg polskiego kalendarza). */
export function daysSince(ms: number, day: string): number {
  const from = localNow(ms).day
  return Math.round((Date.parse(`${day}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000)
}

const open = (t: Task) => !t.done && !t.deleted
/** „A, B, C i 2 więcej” */
function list(titles: string[]): string {
  const head = titles.slice(0, 3).join(', ')
  return titles.length > 3 ? `${head} i ${titles.length - 3} więcej` : head
}
const hour = (e: Event) => (e.allDay || !e.from ? '' : ` ${e.from}`)

/**
 * Podsumowanie o jednej z godzin wybranych przez domownika (decyzje Hani 2026-10-30): części wg
 * zaznaczonych kratek; „Za tydzień” tylko w pierwszym podsumowaniu dnia; nic do zgłoszenia – null.
 */
export function summaryFor(
  user: User,
  tasks: Task[],
  events: Event[],
  day: string,
  time: string,
  isFirstToday: boolean,
): Message | null {
  const c = user.summaryContent
  const tomorrow = addDays(day, 1)
  const live = events.filter((e) => !e.deleted)
  const pick = <T>(on: boolean, items: T[]) => (on ? items : [])

  const urgent = pick(
    c.urgent,
    tasks.filter((t) => open(t) && t.priority === 'high'),
  )
  const dueToday = pick(
    c.dueToday,
    tasks.filter((t) => open(t) && t.due !== null && t.due <= day),
  )
  // dzisiejsze – bez tych z godziną, która już minęła
  const eventsToday = pick(
    c.eventsToday,
    live.filter((e) => e.date === day && (e.allDay || !e.from || e.from >= time)),
  )
  const dueTomorrow = pick(
    c.dueTomorrow,
    tasks.filter((t) => open(t) && t.due === tomorrow),
  )
  const eventsTomorrow = pick(
    c.eventsSoon,
    live.filter((e) => e.remind === 'day' && e.date === tomorrow),
  )
  const eventsWeek = pick(
    c.eventsSoon && isFirstToday,
    live.filter((e) => e.remind === 'week' && e.date === addDays(day, 7)),
  )

  const titles = (xs: { title: string }[]) => list(xs.map((x) => x.title))
  const withHour = (xs: Event[]) => list(xs.map((e) => `${e.title}${hour(e)}`))
  const parts = [
    urgent.length ? `Pilne: ${titles(urgent)}` : '',
    dueToday.length ? `Termin dziś: ${titles(dueToday)}` : '',
    eventsToday.length ? `Dziś: ${withHour(eventsToday)}` : '',
    dueTomorrow.length ? `Jutro termin: ${titles(dueTomorrow)}` : '',
    eventsTomorrow.length ? `Jutro: ${withHour(eventsTomorrow)}` : '',
    eventsWeek.length ? `Za tydzień: ${withHour(eventsWeek)}` : '',
  ].filter(Boolean)
  if (!parts.length) return null

  const hasToday = urgent.length + dueToday.length + eventsToday.length > 0
  const hasTomorrow = dueTomorrow.length + eventsTomorrow.length > 0
  const title =
    hasToday && hasTomorrow
      ? 'Na dziś i jutro'
      : hasToday
        ? 'Na dziś'
        : hasTomorrow
          ? 'Na jutro'
          : 'Za tydzień'
  // same wydarzenia jednego dnia – od razu ten dzień w kalendarzu; inaczej Start
  const onlyEvents = !urgent.length && !dueToday.length && !dueTomorrow.length
  const dates = new Set([...eventsToday, ...eventsTomorrow, ...eventsWeek].map((e) => e.date))
  const url = onlyEvents && dates.size === 1 ? `/kalendarz?dzien=${[...dates][0]}` : '/'
  return { title, body: parts.join(' · '), url, tag: 'podsumowanie' }
}

/** Wpis „co się stało” z aplikacji (src/data/activity.ts, docs/POWIADOMIENIA.md). */
export type ActivityKind =
  | 'task-added'
  | 'task-done'
  | 'task-due-soon'
  | 'task-urgent'
  | 'task-trashed'
  | 'event-added'
  | 'event-moved'
  | 'event-trashed'

export type ActivityEntry = {
  houseId: string
  actor: string
  kind: ActivityKind
  title: string
  detail: string | null
  date: string | null
}

/** Cisza nocna 22:00–7:00 – bez powiadomień o zmianach (Z4). */
export const isQuiet = (time: string) => time >= '22:00' || time < '07:00'

/** Opis rodzaju zmiany: jedna rzecz / kilka (2–4) / wiele. */
const LABELS: Record<ActivityKind, [string, string, string]> = {
  'task-added': ['nowe zadanie', 'nowe zadania', 'nowych zadań'],
  'task-done': ['ogarnięte', 'ogarnięte', 'ogarniętych'],
  'task-due-soon': ['termin', 'terminy', 'terminów'],
  'task-urgent': ['pilne', 'pilne', 'pilnych'],
  'task-trashed': ['usunięte', 'usunięte', 'usuniętych'],
  'event-added': ['nowe wydarzenie', 'nowe wydarzenia', 'nowych wydarzeń'],
  'event-moved': ['przełożone', 'przełożone', 'przełożonych'],
  'event-trashed': ['odwołane', 'odwołane', 'odwołanych'],
}

function plural(n: number, [one, few, many]: [string, string, string]) {
  if (n === 1) return one
  const d = n % 10
  const dd = n % 100
  return d >= 2 && d <= 4 && (dd < 12 || dd > 14) ? few : many
}

/** Co pokazać o jednej zmianie: „Mleko”, „Rachunek (JUTRO)”, „Dentysta → pt 31 paź, 17:00”. */
function itemText(e: ActivityEntry): string {
  if (e.kind === 'task-due-soon') return e.detail ? `${e.title} (${e.detail})` : e.title
  if (e.kind === 'event-moved') return `${e.title} → ${e.detail ?? ''}`.trim()
  if (e.kind.startsWith('event-')) return e.detail ? `${e.title} · ${e.detail}` : e.title
  return e.title
}

const RESTORE = ' – można przywrócić z Kosza'

/**
 * Jedno powiadomienie na osobę i minutę (Z3): jedna zmiana – „Krzyś · nowe zadanie”; kilka tego
 * samego rodzaju – „Krzyś · 3 nowe zadania”; różne – „Krzyś · zmiany: 3”.
 */
export function activityMessage(actorName: string, entries: ActivityEntry[]): Message {
  const kinds = new Set(entries.map((e) => e.kind))
  const events = entries.filter((e) => e.kind.startsWith('event-'))
  const dates = new Set(events.map((e) => e.date))
  const url = !events.length
    ? '/zadania'
    : events.length === entries.length && dates.size === 1 && events[0].date
      ? `/kalendarz?dzien=${events[0].date}`
      : '/kalendarz'
  const tag = `zmiany-${actorName}`
  const trashed = entries.some((e) => e.kind === 'task-trashed' || e.kind === 'event-trashed')

  if (kinds.size === 1) {
    const kind = entries[0].kind
    if (entries.length === 1) {
      const e = entries[0]
      const label = kind === 'task-due-soon' && e.detail ? `termin ${e.detail}` : LABELS[kind][0]
      const body = kind === 'task-due-soon' ? e.title : itemText(e)
      return { title: `${actorName} · ${label}`, body: body + (trashed ? RESTORE : ''), url, tag }
    }
    return {
      title: `${actorName} · ${entries.length} ${plural(entries.length, LABELS[kind])}`,
      body: list(entries.map(itemText)) + (trashed ? RESTORE : ''),
      url,
      tag,
    }
  }
  const lines = entries.map((e) => {
    const label = LABELS[e.kind][0]
    return `${label[0].toUpperCase()}${label.slice(1)}: ${itemText(e)}`
  })
  const head = lines.slice(0, 3).join(' · ')
  return {
    title: `${actorName} · zmiany: ${entries.length}`,
    body: lines.length > 3 ? `${head} i ${lines.length - 3} więcej` : head,
    url,
    tag,
  }
}

/**
 * Codzienne sprzątanie domu (ustawienie założyciela z Porządków): ogarnięte starsze niż N dni →
 * do Kosza; z Kosza po 30 dniach – na zawsze. Zwraca, co zmienić.
 */
export function cleanupPlan(
  tasks: (Task & { path: string })[],
  events: (Event & { path: string })[],
  day: string,
  cleanupDays: number | null,
): { toTrash: string[]; toDelete: string[] } {
  const expired = (at: number | null) => at !== null && daysSince(at, day) > TRASH_DAYS
  return {
    toTrash:
      cleanupDays === null
        ? []
        : tasks
            .filter(
              (t) =>
                t.done && !t.deleted && t.doneAt !== null && daysSince(t.doneAt, day) > cleanupDays,
            )
            .map((t) => t.path),
    toDelete: [
      ...tasks.filter((t) => t.deleted && expired(t.deletedAt)).map((t) => t.path),
      ...events.filter((e) => e.deleted && expired(e.deletedAt)).map((e) => e.path),
    ],
  }
}
