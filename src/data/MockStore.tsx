import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { today as getToday, type DateKey } from './dates.ts'
import {
  mockCategories,
  mockEventTypes,
  mockEvents,
  mockMembers,
  mockNotifications,
  mockTasks,
  mockUserName,
} from './mock.ts'
import type {
  CalendarEvent,
  Category,
  EventType,
  Member,
  NotificationSettings,
  Task,
} from './types.ts'

/** Dane mockupu (etap 1): w pamięci, znikają po odświeżeniu strony. */
type Store = {
  today: DateKey
  userName: string
  tasks: Task[]
  categories: Category[]
  events: CalendarEvent[]
  eventTypes: EventType[]
  members: Member[]
  notifications: NotificationSettings
  setUserName: (name: string) => void
  setTasks: (update: (tasks: Task[]) => Task[]) => void
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

  const store = useMemo<Store>(
    () => ({
      today: day,
      userName,
      tasks,
      categories,
      events,
      eventTypes,
      members: mockMembers,
      notifications,
      setUserName,
      setTasks,
      setCategories,
      setEvents,
      setEventTypes,
      setNotifications,
    }),
    [day, userName, tasks, categories, events, eventTypes, notifications],
  )

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore() poza <MockStoreProvider>')
  return store
}
