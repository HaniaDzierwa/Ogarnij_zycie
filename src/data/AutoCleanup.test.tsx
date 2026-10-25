import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { autoCleanup, TRASH_DAYS } from '../screens/tasks/tasksView.ts'
import { MemoryHouseProvider } from '../house/MemoryHouseProvider.tsx'
import { AutoCleanup } from './AutoCleanup.tsx'
import { mockEvents, mockTasks } from './mock.ts'
import { MockStoreProvider } from './MockStore.tsx'
import { useStore } from './store.ts'
import type { Store } from './store.ts'

afterEach(cleanup)

const DAY = '2026-10-09'
const who = { uid: 'hania', at: '2026-10-09T08:00' }
const base = mockTasks(DAY)[0]
const done = (daysAgo: number, id: string) => ({
  ...base,
  id,
  done: true,
  doneAt: `2026-${daysAgo === 40 ? '08-30' : daysAgo === 8 ? '10-01' : '10-08'}T10:00`,
  doneBy: 'hania',
})
const trashed = (at: string, id: string) => ({
  ...base,
  id,
  deleted: true,
  deletedAt: at,
  deletedBy: 'hania',
})

test('ogarnięte starsze niż ustawienie – do Kosza; z Kosza po 30 dniach – na zawsze', () => {
  const tasks = [
    done(40, 'stare'),
    done(8, 'tydzien'),
    done(1, 'wczoraj'),
    trashed('2026-09-01T10:00', 'dawno-w-koszu'),
    trashed('2026-10-01T10:00', 'niedawno-w-koszu'),
  ]
  const events = [
    {
      ...mockEvents(DAY)[0],
      id: 'e-stare',
      deleted: true,
      deletedAt: '2026-09-01T10:00',
      deletedBy: 'hania',
    },
    { ...mockEvents(DAY)[0], id: 'e-nowe' },
  ]
  const r30 = autoCleanup(tasks, events, DAY, 30, who)!
  expect(r30.tasks.map((t) => [t.id, t.deleted])).toEqual([
    ['stare', true],
    ['tydzien', false],
    ['wczoraj', false],
    ['niedawno-w-koszu', true],
  ])
  expect(r30.tasks[0]).toMatchObject({ deletedAt: who.at, deletedBy: 'hania' })
  expect(r30.events.map((e) => e.id)).toEqual(['e-nowe'])

  const r7 = autoCleanup(tasks, events, DAY, 7, who)!
  expect(r7.tasks.find((t) => t.id === 'tydzien')!.deleted).toBe(true)

  // „Nigdy” – ogarnięte zostają, kosz i tak sprząta się po 30 dniach
  const never = autoCleanup(tasks, events, DAY, null, who)!
  expect(never.tasks.filter((t) => t.done && t.deleted)).toHaveLength(0)
  expect(TRASH_DAYS).toBe(30)
})

test('nic do sprzątania – null (bez zapisu do bazy)', () => {
  expect(autoCleanup([done(1, 'a')], [], DAY, 30, who)).toBeNull()
})

test('przy uruchomieniu: raz, na wczytanych danych domu', () => {
  let store: Store | null = null
  const Peek = () => {
    store = useStore()
    return null
  }
  render(
    <MemoryHouseProvider>
      <MockStoreProvider today={DAY}>
        <AutoCleanup />
        <Peek />
      </MockStoreProvider>
    </MemoryHouseProvider>,
  )
  const before = mockTasks(DAY)
  const expected = autoCleanup(before, mockEvents(DAY), DAY, 30, { uid: 'hania', at: '' })
  const s = store as unknown as Store
  // tyle samo zadań w Koszu, ile wyliczy funkcja (zapisane od razu)
  expect(s.tasks.filter((t) => t.deleted).length).toBe(
    (expected?.tasks ?? before).filter((t) => t.deleted).length,
  )
})
