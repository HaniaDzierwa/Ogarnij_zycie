// Odbiór etapu 5: „Każda kombinacja filtrów daje poprawną listę, liczniki się zgadzają”.
// Sprawdzamy wszystkie kombinacje Pokaż × kategoria × grupowanie na danych z własnym
// priorytetem, zadaniem bez kategorii, „Tylko ja”, ogarniętymi i koszem – wynik porównujemy
// z wyliczeniem „na piechotę”.

import { describe, expect, test } from 'vitest'
import { mockCategories, mockTasks } from '../../data/mock.ts'
import { allPriorities } from '../../data/selectors.ts'
import type { Task } from '../../data/types.ts'
import {
  categoriesWithNone,
  categoryKey,
  NO_CATEGORY_ID,
  showsOf,
  tasksView,
  type GroupBy,
} from './tasksView.ts'

const DAY = '2026-10-09'
const prios = allPriorities([
  { id: 'p1', name: 'Na weekend', color: '#3F7A7A', order: 25 },
  { id: 'p2', name: 'Kiedyś', color: '#7A6A5C', order: 40 },
])
const tasks: Task[] = mockTasks(DAY).map((t, i) => {
  if (i === 0) return { ...t, priority: 'p1' }
  if (i === 1) return { ...t, priority: 'p2', private: true }
  if (i === 2) return { ...t, categoryId: null }
  // priorytet, którego nie ma (np. usunięty na innym telefonie) – liczy się jak „Ważne”
  if (i === 3) return { ...t, priority: 'zniknal' }
  return t
})

const known = (id: string) => (prios.some((p) => p.id === id) ? id : 'mid')
const open = tasks.filter((t) => !t.deleted && !t.done)
const categories = ['all', ...categoriesWithNone(mockCategories, tasks).map((c) => c.id)]
const shows = showsOf(prios).map((s) => s.id)
const groupings: GroupBy[] = ['cat', 'prio']

describe('każda kombinacja filtrów', () => {
  test('dane testowe mają wszystkie przypadki', () => {
    expect(categories).toContain(NO_CATEGORY_ID)
    expect(shows).toEqual(['all', 'high', 'mid', 'p1', 'low', 'p2'])
    expect(tasks.some((t) => t.deleted) && tasks.some((t) => t.done)).toBe(true)
  })

  for (const show of shows)
    for (const category of categories)
      for (const groupBy of groupings)
        test(`Pokaż: ${show} · kategoria: ${category} · grupuj: ${groupBy}`, () => {
          const v = tasksView(tasks, mockCategories, { show, category, groupBy, priorities: prios })
          const expected = open
            .filter((t) => category === 'all' || categoryKey(t) === category)
            .filter((t) => show === 'all' || known(t.priority) === show)
            .map((t) => t.id)
            .sort()
          const shown = v.groups.flatMap((g) => g.items.map((t) => t.id))

          // dokładnie te zadania, każde raz
          expect([...shown].sort()).toEqual(expected)
          expect(new Set(shown).size).toBe(shown.length)
          // bez pustych grup; zadanie w swojej grupie
          for (const g of v.groups) {
            expect(g.items.length).toBeGreaterThan(0)
            for (const t of g.items)
              expect(groupBy === 'cat' ? categoryKey(t) : known(t.priority)).toBe(g.key)
          }
          // w grupie: kolejność priorytetów
          const rank = (t: Task) => prios.findIndex((p) => p.id === known(t.priority))
          for (const g of v.groups)
            for (let i = 1; i < g.items.length; i++)
              expect(rank(g.items[i - 1])).toBeLessThanOrEqual(rank(g.items[i]))

          // liczniki nie zależą od filtrów
          expect(v.openCount).toBe(open.length)
          expect(v.highCount).toBe(open.filter((t) => t.priority === 'high').length)
          expect(v.doneCount).toBe(tasks.filter((t) => !t.deleted && t.done).length)
          for (const c of categories)
            expect(v.categoryCounts[c]).toBe(
              c === 'all' ? open.length : open.filter((t) => categoryKey(t) === c).length,
            )
        })
})
