// Logika listy zadań (Zadania.dc.html, Kosz.dc.html → renderVals).

import { noCategory, priorities, type Priority } from '../../theme'
import { diffDays, stampDay, type DateKey } from '../../data/dates.ts'
import type { Category, Task } from '../../data/types.ts'

export type Show = 'all' | Priority
export type GroupBy = 'cat' | 'prio'
export type Tab = 'todo' | 'done'

/** Kategoria „Bez kategorii” – pojawia się, gdy jakieś zadanie nie ma kategorii. */
export const NO_CATEGORY_ID = '__bez'

/** Filtr „Pokaż” – bez „Ogarnięte” (ogarnięte mają własną zakładkę). */
export const SHOWS: { id: Show; name: string; param: string }[] = [
  { id: 'all', name: 'Wszystkie', param: 'wszystkie' },
  { id: 'high', name: 'Pilne', param: 'pilne' },
  { id: 'mid', name: 'Ważne', param: 'wazne' },
  { id: 'low', name: 'Przy okazji', param: 'przy-okazji' },
]

export function showFromParam(param: string | null): Show {
  return SHOWS.find((s) => s.param === param)?.id ?? 'all'
}

const PRIORITY_ORDER: Priority[] = ['high', 'mid', 'low']

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
  opts: { show: Show; category: string; groupBy: GroupBy },
): TasksView {
  const { show, category, groupBy } = opts
  const live = tasks.filter((t) => !t.deleted)
  const cats = categoriesWithNone(categories, live)
  const allOpen = live.filter((t) => !t.done)
  const open = allOpen
    .filter((t) => category === 'all' || categoryKey(t) === category)
    .filter((t) => show === 'all' || show === t.priority)
    .sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority))

  const groups: Group[] =
    groupBy === 'cat'
      ? cats.map((c) => ({
          key: c.id,
          name: c.name.toUpperCase(),
          color: c.color,
          kind: 'cat' as const,
          items: open.filter((t) => categoryKey(t) === c.id),
        }))
      : PRIORITY_ORDER.map((p) => ({
          key: p,
          name: priorities[p].label.toUpperCase(),
          color: priorities[p].line,
          kind: 'prio' as const,
          items: open.filter((t) => t.priority === p),
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

/** Kosz: najnowsze usunięcia najpierw; ile dni temu i za ile zniknie. */
export function trashItems(tasks: Task[], today: DateKey) {
  return tasks
    .filter((t) => t.deleted)
    .sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''))
    .map((t) => {
      const ago = t.deletedAt ? diffDays(stampDay(t.deletedAt), today) : 0
      return { task: t, ago, left: Math.max(0, TRASH_DAYS - ago) }
    })
}

export function emptyLabel(show: Show): string {
  switch (show) {
    case 'high':
      return 'Nic pilnego – oddychaj spokojnie.'
    case 'mid':
      return 'Brak ważnych zadań.'
    case 'low':
      return 'Nic do zrobienia przy okazji.'
    default:
      return 'Brak zadań w tym widoku.'
  }
}

/** Usunięcie kategorii: jej zadania trafiają do „Bez kategorii”. */
export function deleteCategory(
  categories: Category[],
  tasks: Task[],
  id: string,
): { categories: Category[]; tasks: Task[] } {
  return {
    categories: categories.filter((c) => c.id !== id),
    tasks: tasks.map((t) => (t.categoryId === id ? { ...t, categoryId: null } : t)),
  }
}
