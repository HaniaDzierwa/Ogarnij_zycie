// Co i komu wysłać o danej minucie – czyste funkcje (bez sieci), czas polski (Europe/Warsaw).
// Decyzje Hani: przypomnienie o terminach dzień wcześniej o godzinie z Ustawień (domyślnie 18:00);
// poranne podsumowanie o 8:00 tylko, gdy jest coś pilnego, termin na dziś albo wydarzenie dziś;
// zmiany domowników wg docs/POWIADOMIENIA.md (zatwierdzone 2026-10-25). „Tylko ja” nigdy nie trafia do innych.

export const ZONE = 'Europe/Warsaw'
export const MORNING = '08:00'
export const CLEANUP_TIME = '03:00'
export const TRASH_DAYS = 30

export type Notif = { tasks: boolean; events: boolean; morning: boolean; house: boolean }
export type User = {
  uid: string
  name: string
  houseId: string | null
  notif: Notif
  taskReminderTime: string
  cleanupDays: number | null
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

/** Przypomnienia o tej godzinie (z Ustawień): terminy zadań jutro, wydarzenia jutro / za tydzień. */
export function remindersFor(user: User, tasks: Task[], events: Event[], day: string): Message[] {
  const out: Message[] = []
  const tomorrow = addDays(day, 1)
  if (user.notif.tasks) {
    const due = tasks.filter((t) => open(t) && t.due === tomorrow).map((t) => t.title)
    if (due.length)
      out.push({
        title: due.length === 1 ? 'Jutro termin' : `Jutro terminy: ${due.length}`,
        body: list(due),
        url: '/zadania',
        tag: 'terminy',
      })
  }
  if (user.notif.events) {
    const live = events.filter((e) => !e.deleted)
    const soon = [
      ...live
        .filter((e) => e.remind === 'day' && e.date === tomorrow)
        .map((e) => ({ e, when: 'Jutro' })),
      ...live
        .filter((e) => e.remind === 'week' && e.date === addDays(day, 7))
        .map((e) => ({ e, when: 'Za tydzień' })),
    ]
    for (const { e, when } of soon)
      out.push({
        title: `${when}: ${e.title}`,
        body: when === 'Jutro' ? `Jutro${hour(e) || ' – cały dzień'}` : `Za tydzień${hour(e)}`,
        url: `/kalendarz?dzien=${e.date}`,
        tag: `wydarzenie-${e.id}`,
      })
  }
  return out
}

/** Poranne podsumowanie o 8:00 – tylko gdy jest coś pilnego, termin na dziś albo wydarzenie dziś. */
export function morningFor(
  user: User,
  tasks: Task[],
  events: Event[],
  day: string,
): Message | null {
  if (!user.notif.morning) return null
  const urgent = tasks.filter((t) => open(t) && t.priority === 'high')
  const dueToday = tasks.filter((t) => open(t) && t.due !== null && t.due <= day)
  const today = events.filter((e) => !e.deleted && e.date === day)
  if (!urgent.length && !dueToday.length && !today.length) return null
  const parts = [
    urgent.length ? `Pilne: ${urgent.length}` : '',
    dueToday.length ? `Termin dziś: ${list(dueToday.map((t) => t.title))}` : '',
    today.length ? `Dziś: ${list(today.map((e) => `${e.title}${hour(e)}`))}` : '',
  ].filter(Boolean)
  return { title: 'Na dziś', body: parts.join(' · '), url: '/', tag: 'poranek' }
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
