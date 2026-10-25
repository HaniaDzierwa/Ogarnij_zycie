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
import { allPriorities } from './selectors.ts'
import { StoreContext, useUndoToast, type Store } from './store.ts'
import type { CalendarEvent, CleanupDays, CustomPriority, Task } from './types.ts'

/** Przykładowe dane (testy, podgląd ekranów): w pamięci, znikają po odświeżeniu strony. */
export function MockStoreProvider({
  children,
  today,
  noMembers = false,
  noEventTypes = false,
  notReady = false,
  customPriorities: initialPriorities = [],
  currentUid = mockCurrentUid,
}: {
  children: ReactNode
  today?: DateKey
  /** Bez domowników – jak konto, które nie ma jeszcze domu. */
  noMembers?: boolean
  /** Lista rodzajów wydarzeń jeszcze nie przyszła z bazy (a wydarzenia już tak). */
  noEventTypes?: boolean
  /** Dane domu jeszcze się wczytują. */
  notReady?: boolean
  /** Własne priorytety domu na start. */
  customPriorities?: CustomPriority[]
  /** Kto jest zalogowany (domyślnie Hania – założycielka; np. 'krzys' – domownik). */
  currentUid?: string
}) {
  const [day] = useState(() => today ?? getToday())
  const [userName, setUserName] = useState(mockUserName)
  const [houseName, setHouseName] = useState('Dom na Leśnej')
  const [tasks, setTasks] = useState(() => mockTasks(day))
  const [categories, setCategories] = useState(mockCategories)
  const [customPriorities, setCustomPriorities] = useState(initialPriorities)
  const priorities = useMemo(() => allPriorities(customPriorities), [customPriorities])
  const [events, setEvents] = useState(() => mockEvents(day))
  const [eventTypes, setEventTypes] = useState(() => (noEventTypes ? [] : mockEventTypes))
  const [notifications, setNotifications] = useState(mockNotifications)
  const [cleanupDays, setCleanupDays] = useState<CleanupDays>(30)
  const [taskReminderTime, setTaskReminderTime] = useState('18:00')
  const { toast, show, undo } = useUndoToast()

  const who = useCallback(() => ({ uid: currentUid, at: nowStamp(day) }), [day, currentUid])

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
      currentUid,
      houseName,
      tasks,
      categories,
      customPriorities,
      priorities,
      events,
      eventTypes,
      members: noMembers ? [] : mockMembers,
      notifications,
      cleanupDays,
      taskReminderTime,
      toast,
      who,
      setUserName,
      setHouseName,
      setTasks,
      changeTasks,
      changeEvents,
      undo,
      setCategories,
      setCustomPriorities,
      setEvents,
      setEventTypes,
      setNotifications,
      setCleanupDays,
      setTaskReminderTime,
      savePushSubscription: async () => {},
    }),
    [
      day,
      currentUid,
      noMembers,
      notReady,
      userName,
      houseName,
      tasks,
      categories,
      customPriorities,
      priorities,
      events,
      eventTypes,
      notifications,
      cleanupDays,
      taskReminderTime,
      toast,
      who,
      changeTasks,
      changeEvents,
      undo,
    ],
  )

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
