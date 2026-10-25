// Logika listy zadań (Zadania.dc.html, Kosz.dc.html → renderVals).

import { DEFAULT_PRIORITY, noCategory, type Priority } from '../../theme'
import { diffDays, stampDay, type DateKey } from '../../data/dates.ts'
import { plural } from '../../data/plural.ts'
import { allPriorities } from '../../data/selectors.ts'
import type {
  CalendarEvent,
  Category,
  CustomPriority,
  PriorityDef,
  Task,
} from '../../data/types.ts'

/** 'all' albo id priorytetu (wbudowanego lub własnego). */
export type Show = 'all' | Priority
export type GroupBy = 'cat' | 'prio'
export type Tab = 'todo' | 'done'

/** Kategoria „Bez kategorii” – pojawia się, gdy jakieś zadanie nie ma kategorii. */
export const NO_CATEGORY_ID = '__bez'

/** Wbudowane priorytety bez listy domu (np. zanim przyjdą własne z bazy). */
const BUILT_IN = allPriorities([])

/** Adres filtra wbudowanego priorytetu: `?pokaz=pilne`; własny – po id. */
const PARAMS: Record<string, string> = { high: 'pilne', mid: 'wazne', low: 'przy-okazji' }

/**
 * Filtr „Pokaż” – Wszystkie i wszystkie priorytety domu w kolejności (bez „Ogarnięte” –
 * ogarnięte mają własną zakładkę).
 */
export function showsOf(
  priorities: PriorityDef[] = BUILT_IN,
): { id: Show; name: string; param: string }[] {
  return [
    { id: 'all', name: 'Wszystkie', param: 'wszystkie' },
    ...priorities.map((p) => ({ id: p.id, name: p.label, param: PARAMS[p.id] ?? p.id })),
  ]
}

export function showFromParam(param: string | null, priorities: PriorityDef[] = BUILT_IN): Show {
  return showsOf(priorities).find((s) => s.param === param)?.id ?? 'all'
}

/** Kategorie do wyświetlenia: zdefiniowane + „Bez kategorii”, jeśli potrzebna. */
export function categoriesWithNone(categories: Category[], tasks: Task[]): Category[] {
  const sorted = [...categories].sort((a, b) => a.order - b.order)
  if (!tasks.some((t) => t.categoryId === null && !t.deleted)) return sorted
  return [
    ...sorted,
    { id: NO_CATEGORY_ID, name: noCategory.name, color: noCategory.color, order: 999 },
  ]
}

export const categoryKey = (t: Task) => t.categoryId ?? NO_CATEGORY_ID

export type Group = {
  key: string
  name: string
  color: string
  kind: 'cat' | 'prio'
  items: Task[]
}

export type TasksView = {
  groups: Group[]
  openCount: number
  highCount: number
  doneCount: number
  /** Liczba otwartych zadań w każdej kategorii (do chipów filtra; 'all' = wszystkie). */
  categoryCounts: Record<string, number>
}

/** Zakładka „Do zrobienia”: otwarte zadania (bez kosza) wg filtrów, w grupach. */
export function tasksView(
  tasks: Task[],
  categories: Category[],
  opts: { show: Show; category: string; groupBy: GroupBy; priorities?: PriorityDef[] },
): TasksView {
  const { show, category, groupBy, priorities = BUILT_IN } = opts
  // nieznany priorytet (np. własny jeszcze nie wczytany) – jak „Ważne”
  const prioOf = (t: Task) =>
    priorities.some((p) => p.id === t.priority) ? t.priority : DEFAULT_PRIORITY
  const rank = (t: Task) => priorities.findIndex((p) => p.id === prioOf(t))
  const live = tasks.filter((t) => !t.deleted)
  const cats = categoriesWithNone(categories, live)
  const allOpen = live.filter((t) => !t.done)
  const open = allOpen
    .filter((t) => category === 'all' || categoryKey(t) === category)
    .filter((t) => show === 'all' || show === prioOf(t))
    .sort((a, b) => rank(a) - rank(b))

  const groups: Group[] =
    groupBy === 'cat'
      ? cats.map((c) => ({
          key: c.id,
          name: c.name.toUpperCase(),
          color: c.color,
          kind: 'cat' as const,
          items: open.filter((t) => categoryKey(t) === c.id),
        }))
      : priorities.map((p) => ({
          key: p.id,
          name: p.label.toUpperCase(),
          color: p.line,
          kind: 'prio' as const,
          items: open.filter((t) => prioOf(t) === p.id),
        }))

  const categoryCounts: Record<string, number> = { all: allOpen.length }
  for (const c of cats) categoryCounts[c.id] = allOpen.filter((t) => categoryKey(t) === c.id).length

  return {
    groups: groups.filter((g) => g.items.length > 0),
    openCount: allOpen.length,
    highCount: allOpen.filter((t) => t.priority === 'high').length,
    doneCount: live.filter((t) => t.done).length,
    categoryCounts,
  }
}

/** Ile dni temu ogarnięte (0 = dziś). */
export const doneDaysAgo = (t: Task, today: DateKey) =>
  t.doneAt ? diffDays(stampDay(t.doneAt), today) : 0

const DONE_GROUPS: { name: string; test: (d: number) => boolean }[] = [
  { name: 'DZIŚ', test: (d) => d <= 0 },
  { name: 'WCZORAJ', test: (d) => d === 1 },
  { name: 'W TYM TYGODNIU', test: (d) => d >= 2 && d < 7 },
  { name: 'WCZEŚNIEJ', test: (d) => d >= 7 },
]

/** Zakładka „Ogarnięte”: najnowsze najpierw, w grupach Dziś / Wczoraj / W tym tygodniu / Wcześniej. */
export function doneGroups(tasks: Task[], today: DateKey): { name: string; items: Task[] }[] {
  const done = tasks
    .filter((t) => t.done && !t.deleted)
    .sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''))
  return DONE_GROUPS.map((g) => ({
    name: g.name,
    items: done.filter((t) => g.test(doneDaysAgo(t, today))),
  })).filter((g) => g.items.length > 0)
}

export type ClearOption = 'week' | 'month' | 'all'

export const CLEAR_OPTIONS: { id: ClearOption; name: string; test: (d: number) => boolean }[] = [
  { id: 'week', name: 'Starsze niż 7 dni', test: (d) => d > 7 },
  { id: 'month', name: 'Starsze niż 30 dni', test: (d) => d > 30 },
  { id: 'all', name: 'Wszystkie ogarnięte', test: () => true },
]

/** Ogarnięte zadania, które „Wyczyść” przeniesie do kosza. */
export function clearCandidates(tasks: Task[], today: DateKey, option: ClearOption): Task[] {
  const test = CLEAR_OPTIONS.find((o) => o.id === option)!.test
  return tasks.filter((t) => t.done && !t.deleted && test(doneDaysAgo(t, today)))
}

export const TRASH_DAYS = 30

/**
 * Sprzątanie (Ustawienia → Porządki): ogarnięte starsze niż `cleanupDays` do Kosza; z Kosza
 * na zawsze to, co leży dłużej niż 30 dni. Zwraca null, gdy nie ma nic do zrobienia.
 * Robi to Worker raz dziennie, a zapasowo aplikacja przy uruchomieniu (etap 6).
 */
export function autoCleanup(
  tasks: Task[],
  events: CalendarEvent[],
  today: DateKey,
  cleanupDays: number | null,
  who: { uid: string; at: string },
): { tasks: Task[]; events: CalendarEvent[] } | null {
  const expired = (deletedAt: string | null) =>
    !!deletedAt && diffDays(stampDay(deletedAt), today) > TRASH_DAYS
  const stale = (t: Task) =>
    cleanupDays !== null && t.done && !t.deleted && doneDaysAgo(t, today) > cleanupDays
  const nextTasks = tasks
    .filter((t) => !(t.deleted && expired(t.deletedAt)))
    .map((t) => (stale(t) ? { ...t, deleted: true, deletedAt: who.at, deletedBy: who.uid } : t))
  const nextEvents = events.filter((e) => !(e.deleted && expired(e.deletedAt)))
  const changed =
    nextTasks.length !== tasks.length ||
    nextEvents.length !== events.length ||
    nextTasks.some((t, i) => t !== tasks[i])
  return changed ? { tasks: nextTasks, events: nextEvents } : null
}

/** Wpis w koszu: zadanie albo wydarzenie z kalendarza. */
export type TrashItem = {
  id: string
  title: string
  deletedBy: string | null
  /** Ile dni temu usunięte. */
  ago: number
  /** Za ile dni zniknie na zawsze. */
  left: number
} & ({ kind: 'task'; task: Task } | { kind: 'event'; event: CalendarEvent })

/** Kosz: zadania i wydarzenia, najnowsze usunięcia najpierw; ile dni temu i za ile zniknie. */
export function trashItems(tasks: Task[], events: CalendarEvent[], today: DateKey): TrashItem[] {
  const timing = (deletedAt: string | null) => {
    const ago = deletedAt ? diffDays(stampDay(deletedAt), today) : 0
    return { ago, left: Math.max(0, TRASH_DAYS - ago) }
  }
  const items: (TrashItem & { at: string })[] = [
    ...tasks
      .filter((t) => t.deleted)
      .map((t) => ({
        kind: 'task' as const,
        task: t,
        id: t.id,
        title: t.title,
        deletedBy: t.deletedBy,
        at: t.deletedAt ?? '',
        ...timing(t.deletedAt),
      })),
    ...events
      .filter((e) => e.deleted)
      .map((e) => ({
        kind: 'event' as const,
        event: e,
        id: e.id,
        title: e.title,
        deletedBy: e.deletedBy,
        at: e.deletedAt ?? '',
        ...timing(e.deletedAt),
      })),
  ]
  return items.sort((a, b) => b.at.localeCompare(a.at))
}

/** „zadania”, „wydarzenia”, „zadania i wydarzenia” – co jest w koszu. */
export function trashWhat(items: TrashItem[]): string {
  const t = items.some((i) => i.kind === 'task')
  const e = items.some((i) => i.kind === 'event')
  return t && e ? 'zadania i wydarzenia' : e ? 'wydarzenia' : 'zadania'
}

export function emptyLabel(show: Show, priorities: PriorityDef[] = BUILT_IN): string {
  switch (show) {
    case 'high':
      return 'Nic pilnego – oddychaj spokojnie.'
    case 'mid':
      return 'Brak ważnych zadań.'
    case 'low':
      return 'Nic do zrobienia przy okazji.'
    case 'all':
      return 'Brak zadań w tym widoku.'
    default: {
      const p = priorities.find((x) => x.id === show)
      return p ? `Brak zadań „${p.label}”.` : 'Brak zadań w tym widoku.'
    }
  }
}

/**
 * Zadania przypięte do kategorii / priorytetu (do zrobienia i ogarnięte; kosz się nie liczy) –
 * dopóki są, kategorii ani priorytetu nie da się usunąć (decyzja Hani 2026-10-20).
 */
export const tasksWithCategory = (tasks: Task[], id: string) =>
  tasks.filter((t) => !t.deleted && t.categoryId === id).length
export const tasksWithPriority = (tasks: Task[], id: string) =>
  tasks.filter((t) => !t.deleted && t.priority === id).length

/** „3 ZADANIA”, „BRAK ZADAŃ”. */
export const tasksMeta = (n: number) =>
  n ? `${n} ${plural(n, ['ZADANIE', 'ZADANIA', 'ZADAŃ'])}` : 'BRAK ZADAŃ'

/**
 * Usunięcie pustej kategorii. Zadania z Kosza, które ją miały, przechodzą do „Bez kategorii”
 * (żeby po przywróceniu nie wskazywały na nieistniejącą).
 */
export function deleteCategory(
  categories: Category[],
  tasks: Task[],
  id: string,
): { categories: Category[]; tasks: Task[] } {
  return {
    categories: categories.filter((c) => c.id !== id),
    tasks: tasks.map((t) => (t.deleted && t.categoryId === id ? { ...t, categoryId: null } : t)),
  }
}

/** Usunięcie pustego własnego priorytetu; zadania z Kosza z tym priorytetem – „Ważne”. */
export function deletePriority(
  custom: CustomPriority[],
  tasks: Task[],
  id: string,
): { custom: CustomPriority[]; tasks: Task[] } {
  return {
    custom: custom.filter((p) => p.id !== id),
    tasks: tasks.map((t) =>
      t.deleted && t.priority === id ? { ...t, priority: DEFAULT_PRIORITY } : t,
    ),
  }
}
