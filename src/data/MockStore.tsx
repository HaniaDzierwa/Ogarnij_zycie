import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
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
import type { Who } from './taskOps.ts'
import type {
  CalendarEvent,
  Category,
  EventType,
  Member,
  NotificationSettings,
  Task,
} from './types.ts'

/** Pasek „… · COFNIJ”: tekst + przywrócenie stanu sprzed akcji (zadań albo wydarzeń). */
export type Toast = { id: number; text: string; restore: () => void }

const TOAST_MS = 4500

/** Dane mockupu (etap 1): w pamięci, znikają po odświeżeniu strony. */
type Store = {
  today: DateKey
  userName: string
  currentUid: string
  tasks: Task[]
  categories: Category[]
  events: CalendarEvent[]
  eventTypes: EventType[]
  members: Member[]
  notifications: NotificationSettings
  toast: Toast | null
  /** Kto i teraz – do oznaczania zmian. */
  who: () => Who
  setUserName: (name: string) => void
  setTasks: (update: (tasks: Task[]) => Task[]) => void
  /** Zmiana zadań z paskiem „Cofnij”. */
  changeTasks: (text: string, update: (tasks: Task[]) => Task[]) => void
  /** Zmiana wydarzeń z paskiem „Cofnij”. */
  changeEvents: (text: string, update: (events: CalendarEvent[]) => CalendarEvent[]) => void
  undo: () => void
  setCategories: (update: (categories: Category[]) => Category[]) => void
  setEvents: (update: (events: CalendarEvent[]) => CalendarEvent[]) => void
  setEventTypes: (update: (types: EventType[]) => EventType[]) => void
  setNotifications: (update: (n: NotificationSettings) => NotificationSettings) => void
}

const StoreContext = createContext<Store | null>(null)

export function MockStoreProvider({ children, today }: { children: ReactNode; today?: DateKey }) {
  const [day] = useState(() => today ?? getToday())
  const [userName, setUserName] = useState(mockUserName)
  const [tasks, setTasks] = useState(() => mockTasks(day))
  const [categories, setCategories] = useState(mockCategories)
  const [events, setEvents] = useState(() => mockEvents(day))
  const [eventTypes, setEventTypes] = useState(mockEventTypes)
  const [notifications, setNotifications] = useState(mockNotifications)
  const [toast, setToast] = useState<Toast | null>(null)
  const toastId = useRef(0)

  const who = useCallback(() => ({ uid: mockCurrentUid, at: nowStamp(day) }), [day])

  const showToast = useCallback((text: string, restore: () => void) => {
    const id = ++toastId.current
    setToast({ id, text, restore })
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), TOAST_MS)
  }, [])

  const changeTasks = useCallback(
    (text: string, update: (t: Task[]) => Task[]) => {
      const before = tasks
      showToast(text, () => setTasks(before))
      setTasks(update(tasks))
    },
    [tasks, showToast],
  )

  const changeEvents = useCallback(
    (text: string, update: (e: CalendarEvent[]) => CalendarEvent[]) => {
      const before = events
      showToast(text, () => setEvents(before))
      setEvents(update(events))
    },
    [events, showToast],
  )

  const undo = useCallback(() => {
    if (!toast) return
    toast.restore()
    setToast(null)
  }, [toast])

  const store = useMemo<Store>(
    () => ({
      today: day,
      userName,
      currentUid: mockCurrentUid,
      tasks,
      categories,
      events,
      eventTypes,
      members: mockMembers,
      notifications,
      toast,
      who,
      setUserName,
      setTasks,
      changeTasks,
      changeEvents,
      undo,
      setCategories,
      setEvents,
      setEventTypes,
      setNotifications,
    }),
    [
      day,
      userName,
      tasks,
      categories,
      events,
      eventTypes,
      notifications,
      toast,
      who,
      changeTasks,
      changeEvents,
      undo,
    ],
  )

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore() poza <MockStoreProvider>')
  return store
}
