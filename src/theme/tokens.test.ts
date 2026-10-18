import { expect, test } from 'vitest'
import { builtInEventTypes, defaultCategories, priorities } from './tokens.ts'

test('priorytety mają nazwy Pilne · Ważne · Przy okazji', () => {
  expect(Object.values(priorities).map((p) => p.label)).toEqual(['Pilne', 'Ważne', 'Przy okazji'])
})

test('domyślne kategorie w kolejności z projektu', () => {
  expect(defaultCategories.map((c) => c.name)).toEqual([
    'Zakupy',
    'Dom',
    'Zdrowie',
    'Urzędy',
    'Auto',
    'Rodzina',
  ])
})

test('tylko „Termin zadania” jest rodzajem systemowym', () => {
  expect(builtInEventTypes.filter((t) => t.system).map((t) => t.name)).toEqual(['Termin zadania'])
})
