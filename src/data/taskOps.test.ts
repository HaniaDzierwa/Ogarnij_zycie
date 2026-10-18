import { expect, test } from 'vitest'
import { addSubtask, removeSubtask, toggleSubtask, toggleTask } from './taskOps.ts'
import type { Task } from './types.ts'

const task: Task = {
  id: 't',
  title: 'Prezent',
  categoryId: 'shop',
  priority: 'high',
  due: null,
  done: false,
  subtasks: [
    { id: 'a', title: 'Wybrać', done: true },
    { id: 'b', title: 'Zapakować', done: false },
  ],
}

test('odhaczenie ostatniego podzadania kończy zadanie', () => {
  expect(toggleSubtask(task, 'b').done).toBe(true)
})

test('odznaczenie podzadania w zrobionym zadaniu przywraca zadanie', () => {
  const done = toggleSubtask(task, 'b')
  expect(toggleSubtask(done, 'a').done).toBe(false)
})

test('usunięcie jedynego nieodhaczonego podzadania kończy zadanie', () => {
  expect(removeSubtask(task, 'b').done).toBe(true)
})

test('usunięcie wszystkich podzadań nie zmienia stanu zadania', () => {
  const none = removeSubtask(removeSubtask(task, 'a'), 'b')
  expect(none.subtasks).toHaveLength(0)
  expect(none.done).toBe(false)
})

test('nowy krok w zrobionym zadaniu otwiera je ponownie', () => {
  const done = toggleSubtask(task, 'b')
  expect(addSubtask(done, { id: 'c', title: 'Kartka', done: false }).done).toBe(false)
})

test('zadanie bez podzadań odhacza się ręcznie', () => {
  expect(toggleTask({ ...task, subtasks: [] }).done).toBe(true)
})
