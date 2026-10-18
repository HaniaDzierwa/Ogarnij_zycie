import { describe, expect, test } from 'vitest'
import { mockCategories, mockTasks } from '../../data/mock.ts'
import {
  clearCandidates,
  deleteCategory,
  doneGroups,
  NO_CATEGORY_ID,
  showFromParam,
  tasksView,
  trashItems,
} from './tasksView.ts'

const DAY = '2026-10-09'
const tasks = mockTasks(DAY)
const view = (
  show: Parameters<typeof tasksView>[2]['show'],
  category = 'all',
  groupBy: 'cat' | 'prio' = 'cat',
) => tasksView(tasks, mockCategories, { show, category, groupBy })

describe('Do zrobienia', () => {
  test('12 otwartych w 6 grupach kategorii, 4 pilne, 7 ogarniętych (kosz się nie liczy)', () => {
    const v = view('all')
    expect([v.openCount, v.highCount, v.doneCount]).toEqual([12, 4, 7])
    expect(v.groups.map((g) => [g.name, g.items.length])).toEqual([
      ['ZAKUPY', 2],
      ['DOM', 3],
      ['ZDROWIE', 2],
      ['URZĘDY', 2],
      ['AUTO', 1],
      ['RODZINA', 2],
    ])
  })

  test('w grupie najpierw Pilne, potem Ważne, potem Przy okazji', () => {
    expect(view('all').groups[0].items.map((t) => t.priority)).toEqual(['high', 'low'])
  })

  test('Pokaż: Pilne – tylko pilne', () => {
    const items = view('high').groups.flatMap((g) => g.items)
    expect(items).toHaveLength(4)
    expect(items.every((t) => t.priority === 'high')).toBe(true)
  })

  test('filtr kategorii + grupowanie po priorytecie', () => {
    expect(view('all', 'home', 'prio').groups.map((g) => [g.name, g.items.length])).toEqual([
      ['PILNE', 1],
      ['PRZY OKAZJI', 2],
    ])
  })

  test('parametr adresu → filtr (bez „ogarnięte”)', () => {
    expect(showFromParam('pilne')).toBe('high')
    expect(showFromParam('ogarniete')).toBe('all')
  })
})

describe('Ogarnięte', () => {
  test('grupy Dziś / Wczoraj / W tym tygodniu / Wcześniej, najnowsze najpierw', () => {
    expect(doneGroups(tasks, DAY).map((g) => [g.name, g.items.map((t) => t.title)])).toEqual([
      ['DZIŚ', ['Założyć opony zimowe', 'Mleko i chleb', 'Wynieść śmieci']],
      ['WCZORAJ', ['Odebrać pranie z pralni']],
      ['W TYM TYGODNIU', ['Opłacić przedszkole']],
      ['WCZEŚNIEJ', ['Wymienić żarówkę w łazience', 'Oddać książki do biblioteki']],
    ])
  })

  test('Wyczyść: starsze niż 7 dni = 2, starsze niż 30 dni = 1, wszystkie = 7', () => {
    expect(clearCandidates(tasks, DAY, 'week')).toHaveLength(2)
    expect(clearCandidates(tasks, DAY, 'month').map((t) => t.title)).toEqual([
      'Oddać książki do biblioteki',
    ])
    expect(clearCandidates(tasks, DAY, 'all')).toHaveLength(7)
  })
})

describe('Kosz', () => {
  test('3 zadania, najnowsze najpierw, „zniknie za N dni”', () => {
    expect(trashItems(tasks, DAY).map((i) => [i.task.title, i.ago, i.left])).toEqual([
      ['Kupić nowy czajnik', 2, 28],
      ['Umówić przegląd pieca', 9, 21],
      ['Odnowić kartę biblioteczną', 27, 3],
    ])
  })
})

describe('usuwanie kategorii', () => {
  test('zadania trafiają do „Bez kategorii”, która pojawia się jako grupa', () => {
    const after = deleteCategory(mockCategories, tasks, 'car')
    const v = tasksView(after.tasks, after.categories, {
      show: 'all',
      category: 'all',
      groupBy: 'cat',
    })
    const last = v.groups.at(-1)!
    expect([last.key, last.name, last.items.map((t) => t.title)]).toEqual([
      NO_CATEGORY_ID,
      'BEZ KATEGORII',
      ['Przegląd techniczny'],
    ])
  })
})
