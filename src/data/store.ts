// Dane domu dla ekranów (zadania, kategorie, wydarzenia, ustawienia) i pasek „Cofnij”.
// W aplikacji: FirestoreStoreProvider (etap 2); w testach: MockStoreProvider (przykładowe dane).

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { DateKey } from './dates.ts'
import type { Who } from './taskOps.ts'
import type {
  CalendarEvent,
  Category,
  CleanupDays,
  CustomPriority,
  EventType,
  Member,
  NotificationSettings,
  PriorityDef,
  Task,
} from './types.ts'

/** Pasek „… · COFNIJ”: tekst + przywrócenie stanu sprzed akcji (zadań albo wydarzeń). */
export type Toast = { id: number; text: string; restore: () => void }

export const TOAST_MS = 4500

/**
 * Zmiany przez funkcję „stara lista → nowa lista” (jak setState) – magazyn sam ustala,
 * co dodać, zmienić albo usunąć.
 */
export type Store = {
  /** Wszystkie dane domu już wczytane (z bazy albo z pamięci telefonu) – do tego czasu ekran ładowania. */
  ready: boolean
  today: DateKey
  userName: string
  currentUid: string
  houseName: string
  tasks: Task[]
  categories: Category[]
  /** Własne priorytety domu (do zapisu). */
  customPriorities: CustomPriority[]
  /** Wszystkie priorytety w kolejności: wbudowane i własne (allPriorities). */
  priorities: PriorityDef[]
  events: CalendarEvent[]
  eventTypes: EventType[]
  members: Member[]
  notifications: NotificationSettings
  /** Sprzątanie ogarniętych: po 7 / 30 dniach, null = nigdy. */
  cleanupDays: CleanupDays
  /** Godzina przypomnienia o terminach zadań (dzień przed terminem), „HH:MM”. */
  taskReminderTime: string
  toast: Toast | null
  /** Kto i teraz – do oznaczania zmian. */
  who: () => Who
  setUserName: (name: string) => void
  setHouseName: (name: string) => void
  setTasks: (update: (tasks: Task[]) => Task[]) => void
  /** Zmiana zadań z paskiem „Cofnij”. */
  changeTasks: (text: string, update: (tasks: Task[]) => Task[]) => void
  /** Zmiana wydarzeń z paskiem „Cofnij”. */
  changeEvents: (text: string, update: (events: CalendarEvent[]) => CalendarEvent[]) => void
  undo: () => void
  setCategories: (update: (categories: Category[]) => Category[]) => void
  setCustomPriorities: (update: (list: CustomPriority[]) => CustomPriority[]) => void
  setEvents: (update: (events: CalendarEvent[]) => CalendarEvent[]) => void
  setEventTypes: (update: (types: EventType[]) => EventType[]) => void
  setNotifications: (update: (n: NotificationSettings) => NotificationSettings) => void
  setCleanupDays: (days: CleanupDays) => void
  setTaskReminderTime: (time: string) => void
  /** Zapis subskrypcji powiadomień tego telefonu przy koncie (etap 6). */
  savePushSubscription: (id: string, sub: PushSubscriptionJSON) => Promise<void>
}

export const StoreContext = createContext<Store | null>(null)

export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore() poza providerem danych (FirestoreStore / MockStore)')
  return store
}

/** Pasek „Cofnij” wspólny dla obu magazynów: pokazuje się na ~4,5 s, COFNIJ wywołuje `restore`. */
export function useUndoToast() {
  const [toast, setToastState] = useState<Toast | null>(null)
  const current = useRef<Toast | null>(null)
  const nextId = useRef(0)

  const setToast = useCallback((t: Toast | null) => {
    current.current = t
    setToastState(t)
  }, [])

  const show = useCallback(
    (text: string, restore: () => void) => {
      const id = ++nextId.current
      setToast({ id, text, restore })
      setTimeout(() => {
        if (current.current?.id === id) setToast(null)
      }, TOAST_MS)
    },
    [setToast],
  )

  const undo = useCallback(() => {
    const t = current.current
    if (!t) return
    setToast(null)
    t.restore()
  }, [setToast])

  return { toast, show, undo }
}
