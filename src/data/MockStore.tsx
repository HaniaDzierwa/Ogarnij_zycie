import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { nowStamp, today as getToday, type DateKey } from './dates.ts'
import {
  mockCategories,
  mockCurrentUid,
  mockEventTypes,
  mockEvents,
  mockMembers,
  mockNotifications,
  mockTasks,
  mockUserName,
} from './mock.ts'
import { revertChanges } from './listDiff.ts'
import { StoreContext, useUndoToast, type Store } from './store.ts'
import type { CalendarEvent, CleanupDays, Task } from './types.ts'

/** Przykładowe dane (testy, podgląd ekranów): w pamięci, znikają po odświeżeniu strony. */
export function MockStoreProvider({
  children,
  today,
  noMembers = false,
  noEventTypes = false,
  notReady = false,
}: {
  children: ReactNode
  today?: DateKey
  /** Bez domowników – jak konto, które nie ma jeszcze domu. */
  noMembers?: boolean
  /** Lista rodzajów wydarzeń jeszcze nie przyszła z bazy (a wydarzenia już tak). */
  noEventTypes?: boolean
  /** Dane domu jeszcze się wczytują. */
  notReady?: boolean
}) {
  const [day] = useState(() => today ?? getToday())
  const [userName, setUserName] = useState(mockUserName)
  const [houseName, setHouseName] = useState('Dom na Leśnej')
  const [tasks, setTasks] = useState(() => mockTasks(day))
  const [categories, setCategories] = useState(mockCategories)
  const [events, setEvents] = useState(() => mockEvents(day))
  const [eventTypes, setEventTypes] = useState(() => (noEventTypes ? [] : mockEventTypes))
  const [notifications, setNotifications] = useState(mockNotifications)
  const [cleanupDays, setCleanupDays] = useState<CleanupDays>(30)
  const { toast, show, undo } = useUndoToast()

  const who = useCallback(() => ({ uid: mockCurrentUid, at: nowStamp(day) }), [day])

  const changeTasks = useCallback(
    (text: string, update: (t: Task[]) => Task[]) => {
      const before = tasks
      const after = update(tasks)
      // „Cofnij” – tylko zadania zmienione tą akcją
      show(text, () => setTasks((cur) => revertChanges(cur, before, after)))
      setTasks(after)
    },
    [tasks, show],
  )

  const changeEvents = useCallback(
    (text: string, update: (e: CalendarEvent[]) => CalendarEvent[]) => {
      const before = events
      const after = update(events)
      show(text, () => setEvents((cur) => revertChanges(cur, before, after)))
      setEvents(after)
    },
    [events, show],
  )

  const store = useMemo<Store>(
    () => ({
      ready: !notReady,
      today: day,
      userName,
      currentUid: mockCurrentUid,
      houseName,
      tasks,
      categories,
      events,
      eventTypes,
      members: noMembers ? [] : mockMembers,
      notifications,
      cleanupDays,
      toast,
      who,
      setUserName,
      setHouseName,
      setTasks,
      changeTasks,
      changeEvents,
      undo,
      setCategories,
      setEvents,
      setEventTypes,
      setNotifications,
      setCleanupDays,
    }),
    [
      day,
      noMembers,
      notReady,
      userName,
      houseName,
      tasks,
      categories,
      events,
      eventTypes,
      notifications,
      cleanupDays,
      toast,
      who,
      changeTasks,
      changeEvents,
      undo,
    ],
  )

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
