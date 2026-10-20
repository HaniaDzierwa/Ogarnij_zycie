import { describe, expect, test } from 'vitest'
import { mockTasks } from '../data/mock.ts'
import { markDone, moveToTrash } from '../data/taskOps.ts'
import { diffById, revertChanges } from '../data/listDiff.ts'

const tasks = mockTasks('2026-10-09')
const who = { uid: 'hania', at: '2026-10-09T10:00' }

describe('różnice list', () => {
  test('bez zmian – nic do zapisania', () => {
    expect(diffById(tasks, [...tasks])).toEqual({ upserts: [], deletes: [] })
  })

  test('ogarnięcie jednego zadania zapisuje tylko to zadanie', () => {
    const next = tasks.map((t) => (t.id === 't2' ? markDone(t, who) : t))
    const { upserts, deletes } = diffById(tasks, next)
    expect(upserts.map((t) => t.id)).toEqual(['t2'])
    expect(deletes).toEqual([])
  })

  test('nowe zadanie – zapis; do kosza – zmiana (miękko), nie usunięcie', () => {
    const added = { ...tasks[1], id: 'nowe', title: 'Kupić żarówki' }
    const next = [...tasks.map((t) => (t.id === 't3' ? moveToTrash(t, who) : t)), added]
    const { upserts, deletes } = diffById(tasks, next)
    expect(upserts.map((t) => t.id).sort()).toEqual(['nowe', 't3'])
    expect(deletes).toEqual([])
  })

  test('„Opróżnij kosz” – usunięte z listy znikają z bazy na zawsze', () => {
    const next = tasks.filter((t) => !t.deleted)
    const { upserts, deletes } = diffById(tasks, next)
    expect(upserts).toEqual([])
    expect(deletes).toEqual(tasks.filter((t) => t.deleted).map((t) => t.id))
  })

  test('„Cofnij” – powrót do listy sprzed akcji przywraca dokładnie poprzedni stan', () => {
    const after = tasks.map((t) => (t.id === 't2' ? markDone(t, who) : t))
    const { upserts } = diffById(after, tasks)
    expect(upserts).toEqual([tasks.find((t) => t.id === 't2')])
  })
})

describe('„Cofnij” tylko dla zmian z akcji', () => {
  test('cofa ogarnięcie, a zmiana z drugiego telefonu w tym czasie zostaje', () => {
    const after = tasks.map((t) => (t.id === 't2' ? markDone(t, who) : t))
    // w ciągu 4,5 s ktoś zmienił inne zadanie
    const current = after.map((t) =>
      t.id === 't4' ? { ...t, title: 'Zmienione przez Krzysia' } : t,
    )
    const undone = revertChanges(current, tasks, after)
    expect(undone.find((t) => t.id === 't2')).toEqual(tasks.find((t) => t.id === 't2'))
    expect(undone.find((t) => t.id === 't4')!.title).toBe('Zmienione przez Krzysia')
  })

  test('cofa dodanie (znika) i usunięcie (wraca); nic nie zmienione – bez zmian', () => {
    const added = [...tasks, { ...tasks[1], id: 'nowe' }]
    expect(revertChanges(added, tasks, added).map((t) => t.id)).toEqual(tasks.map((t) => t.id))
    const removed = tasks.filter((t) => t.id !== 't3')
    expect(
      revertChanges(removed, tasks, removed)
        .map((t) => t.id)
        .sort(),
    ).toEqual(tasks.map((t) => t.id).sort())
    expect(revertChanges(tasks, tasks, tasks)).toBe(tasks)
  })
})
