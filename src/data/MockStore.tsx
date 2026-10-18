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

/** Pasek „… · COFNIJ”: tekst + stan zadań sprzed akcji. */
export type Toast = { id: number; text: string; before: Task[] }

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

  const changeTasks = useCallback(
    (text: string, update: (t: Task[]) => Task[]) => {
      const id = ++toastId.current
      setToast({ id, text, before: tasks })
      setTasks(update(tasks))
      setTimeout(() => setToast((t) => (t?.id === id ? null : t)), TOAST_MS)
    },
    [tasks],
  )

  const undo = useCallback(() => {
    if (!toast) return
    setTasks(toast.before)
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
