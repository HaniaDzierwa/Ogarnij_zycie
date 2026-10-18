// Logika listy zadań (Zadania.dc.html → renderVals): filtr „Pokaż”, filtr kategorii, grupy.

import { noCategory, priorities, type Priority } from '../../theme'
import type { Category, Task } from '../../data/types.ts'

export type Show = 'all' | Priority | 'done'
export type GroupBy = 'cat' | 'prio'

/** Kategoria „Bez kategorii” – pojawia się, gdy jakieś zadanie nie ma kategorii. */
export const NO_CATEGORY_ID = '__bez'

export const SHOWS: { id: Show; name: string; param: string }[] = [
  { id: 'all', name: 'Wszystkie', param: 'wszystkie' },
  { id: 'high', name: 'Pilne', param: 'pilne' },
  { id: 'mid', name: 'Ważne', param: 'wazne' },
  { id: 'low', name: 'Przy okazji', param: 'przy-okazji' },
  { id: 'done', name: 'Ogarnięte', param: 'ogarniete' },
]

export function showFromParam(param: string | null): Show {
  return SHOWS.find((s) => s.param === param)?.id ?? 'all'
}

const PRIORITY_ORDER: Priority[] = ['high', 'mid', 'low']

/** Kategorie do wyświetlenia: zdefiniowane + „Bez kategorii”, jeśli potrzebna. */
export function categoriesWithNone(categories: Category[], tasks: Task[]): Category[] {
  const sorted = [...categories].sort((a, b) => a.order - b.order)
  if (!tasks.some((t) => t.categoryId === null)) return sorted
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
  done: Task[]
  openCount: number
  highCount: number
  /** Liczba otwartych zadań w każdej kategorii (do chipów filtra; 'all' = wszystkie). */
  categoryCounts: Record<string, number>
}

export function tasksView(
  tasks: Task[],
  categories: Category[],
  opts: { show: Show; category: string; groupBy: GroupBy },
): TasksView {
  const { show, category, groupBy } = opts
  const cats = categoriesWithNone(categories, tasks)
  const inCategory = tasks.filter((t) => category === 'all' || categoryKey(t) === category)
  const open = inCategory
    .filter((t) => !t.done && (show === 'all' || show === t.priority))
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

  const allOpen = tasks.filter((t) => !t.done)
  const categoryCounts: Record<string, number> = { all: allOpen.length }
  for (const c of cats) categoryCounts[c.id] = allOpen.filter((t) => categoryKey(t) === c.id).length

  return {
    groups: groups.filter((g) => g.items.length > 0),
    done: show === 'all' || show === 'done' ? inCategory.filter((t) => t.done) : [],
    openCount: allOpen.length,
    highCount: allOpen.filter((t) => t.priority === 'high').length,
    categoryCounts,
  }
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
