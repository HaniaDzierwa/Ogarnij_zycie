import { expect, test } from 'vitest'
import {
  addSubtask,
  markDone,
  moveToTrash,
  removeSubtask,
  restoreFromTrash,
  toggleDone,
  toggleSubtask,
} from './taskOps.ts'
import type { Task } from './types.ts'

const who = { uid: 'hania', at: '2026-10-09T10:00' }

const task: Task = {
  id: 't',
  title: 'Prezent',
  categoryId: 'shop',
  note: '',
  priority: 'high',
  due: null,
  done: false,
  subtasks: [
    { id: 'a', title: 'Wybrać', done: true },
    { id: 'b', title: 'Zapakować', done: false },
  ],
  createdBy: 'hania',
  doneAt: null,
  doneBy: null,
  deleted: false,
  deletedAt: null,
  deletedBy: null,
}

test('odhaczenie ostatniego podzadania ogarnia zadanie: kto i kiedy', () => {
  const done = toggleSubtask(task, 'b', who)
  expect([done.done, done.doneBy, done.doneAt]).toEqual([true, 'hania', '2026-10-09T10:00'])
})

test('odznaczenie podzadania w ogarniętym zadaniu przywraca je i czyści „kto/kiedy”', () => {
  const back = toggleSubtask(toggleSubtask(task, 'b', who), 'a', who)
  expect([back.done, back.doneBy, back.doneAt]).toEqual([false, null, null])
})

test('usunięcie jedynego nieodhaczonego podzadania ogarnia zadanie', () => {
  expect(removeSubtask(task, 'b', who).done).toBe(true)
})

test('nowy krok w ogarniętym zadaniu otwiera je ponownie', () => {
  const done = toggleSubtask(task, 'b', who)
  expect(addSubtask(done, { id: 'c', title: 'Kartka', done: false }, who).done).toBe(false)
})

test('kwadracik: ogarnij ⇄ przywróć', () => {
  const plain = { ...task, subtasks: [] }
  const done = toggleDone(plain, who)
  expect([done.done, done.doneBy]).toEqual([true, 'hania'])
  expect(toggleDone(done, who).done).toBe(false)
})

test('kosz: przeniesienie i przywrócenie zachowuje kategorię, priorytet i kroki', () => {
  const trashed = moveToTrash(markDone(task, who), who)
  expect([trashed.deleted, trashed.deletedBy, trashed.deletedAt]).toEqual([
    true,
    'hania',
    '2026-10-09T10:00',
  ])
  const back = restoreFromTrash(trashed)
  expect(back.deleted).toBe(false)
  expect([back.categoryId, back.priority, back.subtasks]).toEqual([
    task.categoryId,
    task.priority,
    task.subtasks,
  ])
})
