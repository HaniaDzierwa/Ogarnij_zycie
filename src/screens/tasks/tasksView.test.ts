import { describe, expect, test } from 'vitest'
import { mockCategories, mockTasks } from '../../data/mock.ts'
import { deleteCategory, NO_CATEGORY_ID, showFromParam, tasksView } from './tasksView.ts'

const tasks = mockTasks('2026-10-09')
const view = (
  show: Parameters<typeof tasksView>[2]['show'],
  category = 'all',
  groupBy: 'cat' | 'prio' = 'cat',
) => tasksView(tasks, mockCategories, { show, category, groupBy })

describe('lista zadań', () => {
  test('wszystkie: 12 otwartych w 6 grupach kategorii, 3 ogarnięte', () => {
    const v = view('all')
    expect(v.openCount).toBe(12)
    expect(v.highCount).toBe(4)
    expect(v.groups.map((g) => [g.name, g.items.length])).toEqual([
      ['ZAKUPY', 2],
      ['DOM', 3],
      ['ZDROWIE', 2],
      ['URZĘDY', 2],
      ['AUTO', 1],
      ['RODZINA', 2],
    ])
    expect(v.done).toHaveLength(3)
  })

  test('w grupie najpierw Pilne, potem Ważne, potem Przy okazji', () => {
    const zakupy = view('all').groups[0].items
    expect(zakupy.map((t) => t.priority)).toEqual(['high', 'low'])
  })

  test('Pokaż: Pilne – tylko pilne, bez ogarniętych', () => {
    const v = view('high')
    expect(v.groups.flatMap((g) => g.items).every((t) => t.priority === 'high')).toBe(true)
    expect(v.groups.flatMap((g) => g.items)).toHaveLength(4)
    expect(v.done).toHaveLength(0)
  })

  test('Pokaż: Ogarnięte – brak otwartych, same zrobione', () => {
    const v = view('done')
    expect(v.groups).toHaveLength(0)
    expect(v.done).toHaveLength(3)
  })

  test('filtr kategorii + grupowanie po priorytecie', () => {
    const v = view('all', 'home', 'prio')
    expect(v.groups.map((g) => [g.name, g.items.length])).toEqual([
      ['PILNE', 1],
      ['PRZY OKAZJI', 2],
    ])
    expect(v.done.map((t) => t.title)).toEqual(['Wynieść śmieci'])
  })

  test('liczniki kategorii do chipów filtra', () => {
    const v = view('all')
    expect(v.categoryCounts).toMatchObject({ all: 12, shop: 2, home: 3, car: 1 })
  })

  test('parametr adresu → filtr', () => {
    expect(showFromParam('pilne')).toBe('high')
    expect(showFromParam('ogarniete')).toBe('done')
    expect(showFromParam(null)).toBe('all')
  })
})

describe('usuwanie kategorii', () => {
  test('zadania trafiają do „Bez kategorii”, która pojawia się jako grupa', () => {
    const after = deleteCategory(mockCategories, tasks, 'car')
    expect(after.categories.map((c) => c.id)).not.toContain('car')
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
