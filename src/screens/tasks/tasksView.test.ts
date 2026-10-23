import { describe, expect, test } from 'vitest'
import { mockCategories, mockTasks } from '../../data/mock.ts'
import { allPriorities } from '../../data/selectors.ts'
import {
  clearCandidates,
  deleteCategory,
  deletePriority,
  showsOf,
  tasksWithCategory,
  tasksWithPriority,
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
    expect(trashItems(tasks, [], DAY).map((i) => [i.title, i.ago, i.left])).toEqual([
      ['Kupić nowy czajnik', 2, 28],
      ['Umówić przegląd pieca', 9, 21],
      ['Odnowić kartę biblioteczną', 27, 3],
    ])
  })
})

describe('usuwanie kategorii i priorytetów', () => {
  test('przypięte zadania (do zrobienia i ogarnięte) blokują usuwanie; kosz się nie liczy', () => {
    expect(tasksWithCategory(tasks, 'car')).toBe(2)
    const inTrash = tasks.map((t) => (t.categoryId === 'car' ? { ...t, deleted: true } : t))
    expect(tasksWithCategory(inTrash, 'car')).toBe(0)
    expect(tasksWithPriority(tasks, 'high')).toBeGreaterThan(0)
  })
  test('usunięta kategoria: zadania z kosza przechodzą do „Bez kategorii”', () => {
    const inTrash = tasks.map((t) => (t.categoryId === 'car' ? { ...t, deleted: true } : t))
    const after = deleteCategory(mockCategories, inTrash, 'car')
    expect(after.categories.some((c) => c.id === 'car')).toBe(false)
    const moved = after.tasks.find((t) => t.title === 'Przegląd techniczny')!
    expect([moved.categoryId, moved.deleted]).toEqual([null, true])
    const restored = after.tasks.map((t) => ({ ...t, deleted: false }))
    const v = tasksView(restored, after.categories, {
      show: 'all',
      category: 'all',
      groupBy: 'cat',
    })
    expect(v.groups.at(-1)!.key).toBe(NO_CATEGORY_ID)
  })
  test('usunięty własny priorytet: zadania z kosza przechodzą na „Ważne”', () => {
    const custom = [{ id: 'p1', name: 'Na weekend', color: '#3F7A7A', order: 25 }]
    const t = { ...tasks[0], priority: 'p1', deleted: true }
    const after = deletePriority(custom, [t], 'p1')
    expect([after.custom, after.tasks[0].priority]).toEqual([[], 'mid'])
  })
})

describe('własne priorytety', () => {
  const custom = [{ id: 'p1', name: 'Na weekend', color: '#3F7A7A', order: 25 }]
  const prios = allPriorities(custom)
  const withCustom = tasks.map((t, i) => (i === 0 ? { ...t, priority: 'p1' } : t))

  test('w filtrze „Pokaż” i w grupach na swoim miejscu (między Ważne a Przy okazji)', () => {
    expect(showsOf(prios).map((s) => s.name)).toEqual([
      'Wszystkie',
      'Pilne',
      'Ważne',
      'Na weekend',
      'Przy okazji',
    ])
    const v = tasksView(withCustom, mockCategories, {
      show: 'all',
      category: 'all',
      groupBy: 'prio',
      priorities: prios,
    })
    expect(v.groups.map((g) => g.name)).toEqual(['PILNE', 'WAŻNE', 'NA WEEKEND', 'PRZY OKAZJI'])
    expect(v.groups[2].items.map((t) => t.id)).toEqual([withCustom[0].id])
  })
  test('filtr po własnym priorytecie; adres ?pokaz=<id>', () => {
    expect(showFromParam('p1', prios)).toBe('p1')
    const v = tasksView(withCustom, mockCategories, {
      show: 'p1',
      category: 'all',
      groupBy: 'cat',
      priorities: prios,
    })
    expect(v.groups.flatMap((g) => g.items).map((t) => t.id)).toEqual([withCustom[0].id])
  })
  test('nieznany priorytet (jeszcze nie wczytany) – jak „Ważne”', () => {
    const v = tasksView(withCustom, mockCategories, {
      show: 'mid',
      category: 'all',
      groupBy: 'cat',
    })
    expect(v.groups.flatMap((g) => g.items).some((t) => t.id === withCustom[0].id)).toBe(true)
  })
})
