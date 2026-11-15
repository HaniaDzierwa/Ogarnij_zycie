import { describe, expect, test } from 'vitest'
import {
  addSubtask,
  editTask,
  markDone,
  nextDue,
  spawnRepeats,
  trashOnlyThis,
  moveToTrash,
  removeSubtask,
  taskEditOf,
  restoreFromTrash,
  toggleDone,
  toggleSubtask,
} from './taskOps.ts'
import type { Task } from './types.ts'
import { editEvent, eventEditOf, skipOccurrence } from './eventOps.ts'
import { mockEvents } from './mock.ts'

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
  private: false,
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

test('„Zapisz” w arkuszu: zmienia pola; dodany niezrobiony krok przywraca ogarnięte zadanie', () => {
  const done = markDone(
    { ...task, subtasks: task.subtasks.map((s) => ({ ...s, done: true })) },
    who,
  )
  const e = taskEditOf(done)
  const saved = editTask(
    done,
    {
      ...e,
      title: 'Prezent dla mamy',
      subtasks: [...e.subtasks, { id: 'c', title: 'Kartka', done: false }],
    },
    who,
  )
  expect([saved.title, saved.done, saved.doneBy]).toEqual(['Prezent dla mamy', false, null])
  // bez zmian w krokach – stan ogarnięcia zostaje
  expect(editTask(done, { ...e, note: 'x' }, who).done).toBe(true)
})

// ── Zadania cykliczne (etap 8) ─────────────────────────────────────────────

describe('zadanie cykliczne', () => {
  const TODAY = '2026-11-18'
  const weekly: Task = {
    ...task,
    id: 'w',
    title: 'Wynieść śmieci',
    due: '2026-11-20',
    dueWeek: true,
    repeat: { every: 'week' },
    note: 'Plastik w czwartek',
  }
  let n = 0
  const makeId = () => `n${++n}`
  const krzys = { uid: 'krzys', at: '2026-11-18T19:00' }

  test('ogarnięte → obok następne z terminem za tydzień, kroki odznaczone, notatka zostaje', () => {
    const list = spawnRepeats([markDone(weekly, krzys)], TODAY, 'krzys', makeId)
    expect(list).toHaveLength(2)
    const [done, next] = list
    expect(done.done).toBe(true)
    expect(done.repeat).toBeUndefined()
    expect(next).toMatchObject({
      title: 'Wynieść śmieci',
      due: '2026-11-27',
      repeat: { every: 'week' },
      done: false,
      doneAt: null,
      doneBy: null,
      note: 'Plastik w czwartek',
      createdBy: 'krzys',
    })
    expect(next.id).not.toBe(weekly.id)
    expect(next.dueWeek).toBeUndefined()
    expect(next.subtasks.every((s) => !s.done)).toBe(true)
  })

  test('drugie wywołanie nic nie zmienia; niezrobione, w koszu i zwykłe – bez zmian', () => {
    const once = spawnRepeats([markDone(weekly, krzys)], TODAY, 'krzys', makeId)
    expect(spawnRepeats(once, TODAY, 'krzys', makeId)).toBe(once)
    const list = [weekly, moveToTrash(markDone(weekly, who), who), markDone(task, who)]
    expect(spawnRepeats(list, TODAY, 'hania', makeId)).toBe(list)
  })

  test('spóźnione – następny termin po dziś; bez terminu – od dziś', () => {
    const late = { ...weekly, due: '2026-11-06' }
    expect(nextDue(late, TODAY)).toBe('2026-11-20')
    expect(nextDue({ ...weekly, due: null }, TODAY)).toBe('2026-11-25')
    expect(nextDue(task, TODAY)).toBeNull()
  })

  test('„Tylko to”: to do kosza bez powtarzania, następne na liście', () => {
    const [trashed, next] = trashOnlyThis(weekly, krzys, TODAY, 'n9')
    expect(trashed).toMatchObject({ id: 'w', deleted: true, deletedBy: 'krzys' })
    expect(trashed.repeat).toBeUndefined()
    expect(next).toMatchObject({ id: 'n9', due: '2026-11-27', repeat: { every: 'week' } })
  })

  test('edycja: wyłączenie powtarzania albo usunięcie terminu kasuje pole', () => {
    expect(editTask(weekly, { ...taskEditOf(weekly), repeat: undefined }, who).repeat).toBe(
      undefined,
    )
    expect(editTask(weekly, { ...taskEditOf(weekly), due: null }, who).repeat).toBeUndefined()
    expect(
      editTask(task, { ...taskEditOf(task), due: '2026-11-20', repeat: { every: 'day' } }, who)
        .repeat,
    ).toEqual({ every: 'day' })
  })
})

describe('wydarzenie cykliczne – operacje (etap 8)', () => {
  const ev = { ...mockEvents('2026-10-09')[0], repeat: { every: 'week' as const } }

  test('„Tylko to” dopisuje dzień do pominiętych (raz, posortowane)', () => {
    const a = skipOccurrence(ev, '2026-10-23')
    const b = skipOccurrence(a, '2026-10-16')
    expect(b.skip).toEqual(['2026-10-16', '2026-10-23'])
    expect(skipOccurrence(b, '2026-10-16')).toBe(b)
  })

  test('edycja zmienia wszystkie powtórki; wyłączenie powtarzania kasuje pominięte', () => {
    const withSkip = skipOccurrence(ev, '2026-10-23')
    const later = editEvent(withSkip, { ...eventEditOf(withSkip), from: '18:00' })
    expect(later).toMatchObject({ from: '18:00', repeat: { every: 'week' }, skip: ['2026-10-23'] })
    const once = editEvent(withSkip, { ...eventEditOf(withSkip), repeat: undefined })
    expect('repeat' in once || 'skip' in once).toBe(false)
  })
})
