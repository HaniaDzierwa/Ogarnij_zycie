import { collection, doc, onSnapshot, updateDoc, writeBatch } from 'firebase/firestore'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/auth.ts'
import { db } from '../firebase/app.ts'
import {
  DEFAULT_USER,
  categoryFromDoc,
  categoryToDoc,
  eventFromDoc,
  eventToDoc,
  eventTypeFromDoc,
  eventTypeToDoc,
  paths,
  taskFromDoc,
  taskToDoc,
  type HouseDoc,
  type MemberDoc,
  type UserDoc,
} from '../firebase/model.ts'
import { syncCollection } from '../firebase/sync.ts'
import { useHouse } from '../house/house.ts'
import { builtInEventTypes } from '../theme'
import { nowStamp, today as getToday } from './dates.ts'
import { StoreContext, useUndoToast, type Store } from './store.ts'
import type {
  CalendarEvent,
  Category,
  CleanupDays,
  EventType,
  Member,
  NotificationSettings,
  Task,
} from './types.ts'

const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id)
const BUILT_IN = builtInEventTypes.map((t) => t.id as string)
/** Rodzaje wydarzeń: najpierw wbudowane (w stałej kolejności), potem własne wg dodania. */
const typeOrder = (a: EventType, b: EventType) => {
  const ia = BUILT_IN.indexOf(a.id)
  const ib = BUILT_IN.indexOf(b.id)
  if (ia >= 0 || ib >= 0) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
  return byId(a, b)
}

const reportError = (e: unknown) => console.error('Nie udało się zapisać zmian w Firestore', e)

/**
 * Dane domu z Firestore (etap 2, krok 6): zadania, kosz, kategorie, wydarzenia, rodzaje, domownicy,
 * ustawienia – na żywo i z pamięci telefonu (działa bez internetu). Zmiany ekranów → tylko różnice.
 */
export function FirestoreStoreProvider({ children }: { children: ReactNode }) {
  const { profile } = useHouse()
  // nowy dom (albo inne konto) – dane od zera
  return <HouseData key={profile?.houseId ?? 'bez-domu'}>{children}</HouseData>
}

function HouseData({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { profile } = useHouse()
  const uid = user?.uid ?? ''
  const houseId = profile?.houseId ?? null
  const [day] = useState(getToday)

  const [tasks, setTasksState] = useState<Task[]>([])
  const [categories, setCategoriesState] = useState<Category[]>([])
  const [events, setEventsState] = useState<CalendarEvent[]>([])
  const [eventTypes, setEventTypesState] = useState<EventType[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [houseName, setHouseNameState] = useState('')
  const [userDoc, setUserDoc] = useState<Omit<UserDoc, 'houseId'>>({ ...DEFAULT_USER, name: '' })
  const { toast, show, undo } = useUndoToast()

  // Najnowsze listy – kolejne zmiany w jednym kliknięciu liczą się od wyniku poprzedniej.
  const latest = useRef({ tasks, categories, events, eventTypes })
  latest.current = { tasks, categories, events, eventTypes }

  useEffect(() => {
    if (!uid) return
    return onSnapshot(doc(db, paths.user(uid)), (snap) => {
      const d = snap.data() as Partial<UserDoc> | undefined
      if (!d) return
      setUserDoc({
        name: d.name ?? '',
        notif: { ...DEFAULT_USER.notif, ...d.notif },
        cleanupDays: d.cleanupDays === undefined ? DEFAULT_USER.cleanupDays : d.cleanupDays,
        taskReminderTime: d.taskReminderTime ?? DEFAULT_USER.taskReminderTime,
      })
    })
  }, [uid])

  useEffect(() => {
    if (!houseId) return
    const subs = [
      onSnapshot(doc(db, paths.house(houseId)), (snap) =>
        setHouseNameState((snap.data() as Partial<HouseDoc> | undefined)?.name ?? ''),
      ),
      onSnapshot(collection(db, paths.tasks(houseId)), (snap) =>
        setTasksState(snap.docs.map((d) => taskFromDoc(d.id, d.data())).sort(byId)),
      ),
      onSnapshot(collection(db, paths.categories(houseId)), (snap) =>
        setCategoriesState(
          snap.docs.map((d) => categoryFromDoc(d.id, d.data())).sort((a, b) => a.order - b.order),
        ),
      ),
      onSnapshot(collection(db, paths.events(houseId)), (snap) =>
        setEventsState(snap.docs.map((d) => eventFromDoc(d.id, d.data())).sort(byId)),
      ),
      onSnapshot(collection(db, paths.eventTypes(houseId)), (snap) =>
        setEventTypesState(snap.docs.map((d) => eventTypeFromDoc(d.id, d.data())).sort(typeOrder)),
      ),
      onSnapshot(collection(db, paths.members(houseId)), (snap) =>
        setMembers(
          snap.docs.map((d) => {
            const m = d.data() as Partial<MemberDoc>
            return {
              uid: d.id,
              name: m.name ?? '',
              role: m.role ?? 'member',
              scope: m.scope ?? { all: true, categoryIds: [], calendar: true },
              // bez odmiany i bez „ostatnio” (decyzja Hani 2026-10-18; aktywność – etap 8)
              nameGenitive: m.name ?? '',
              lastSeen: '',
            }
          }),
        ),
      ),
    ]
    return () => subs.forEach((unsub) => unsub())
  }, [houseId])

  /** Zmiana listy: od razu na ekranie, w tle zapis różnic do Firestore. */
  const makeSetter = useCallback(
    <T extends { id: string }>(
      key: keyof typeof latest.current,
      setState: (v: T[]) => void,
      path: (h: string) => string,
      toDoc: (x: T, uid: string) => Record<string, unknown>,
    ) =>
      (update: (list: T[]) => T[]) => {
        if (!houseId) return
        const prev = latest.current[key] as unknown as T[]
        const next = update(prev)
        ;(latest.current[key] as unknown as T[]) = next
        setState(next)
        syncCollection({
          db,
          path: path(houseId),
          prev,
          next,
          toDoc: (x) => toDoc(x, uid),
          onError: reportError,
        })
      },
    [houseId, uid],
  )

  const setTasks = useMemo(
    () => makeSetter<Task>('tasks', setTasksState, paths.tasks, taskToDoc),
    [makeSetter],
  )
  const setCategories = useMemo(
    () => makeSetter<Category>('categories', setCategoriesState, paths.categories, categoryToDoc),
    [makeSetter],
  )
  const setEvents = useMemo(
    () => makeSetter<CalendarEvent>('events', setEventsState, paths.events, eventToDoc),
    [makeSetter],
  )
  const setEventTypes = useMemo(
    () => makeSetter<EventType>('eventTypes', setEventTypesState, paths.eventTypes, eventTypeToDoc),
    [makeSetter],
  )

  const changeTasks = useCallback(
    (text: string, update: (t: Task[]) => Task[]) => {
      const before = latest.current.tasks
      show(text, () => setTasks(() => before))
      setTasks(update)
    },
    [setTasks, show],
  )
  const changeEvents = useCallback(
    (text: string, update: (e: CalendarEvent[]) => CalendarEvent[]) => {
      const before = latest.current.events
      show(text, () => setEvents(() => before))
      setEvents(update)
    },
    [setEvents, show],
  )

  /** Pola profilu – od razu na ekranie, zapis w tle. */
  const updateUser = useCallback(
    (fields: Partial<UserDoc>) => {
      setUserDoc((u) => ({ ...u, ...fields }))
      if (uid) updateDoc(doc(db, paths.user(uid)), fields).catch(reportError)
    },
    [uid],
  )

  const store = useMemo<Store>(
    () => ({
      today: day,
      userName: userDoc.name,
      currentUid: uid,
      houseName,
      tasks,
      categories,
      events,
      eventTypes,
      members,
      notifications: userDoc.notif,
      cleanupDays: userDoc.cleanupDays,
      toast,
      who: () => ({ uid, at: nowStamp(day) }),
      // imię jest w profilu i na liście domowników – zmiana w obu miejscach jednym zapisem
      setUserName: (name) => {
        setUserDoc((u) => ({ ...u, name }))
        const batch = writeBatch(db)
        batch.update(doc(db, paths.user(uid)), { name })
        if (houseId) batch.update(doc(db, `${paths.members(houseId)}/${uid}`), { name })
        batch.commit().catch(reportError)
      },
      setHouseName: (name) => {
        setHouseNameState(name)
        if (houseId) updateDoc(doc(db, paths.house(houseId)), { name }).catch(reportError)
      },
      setTasks,
      changeTasks,
      changeEvents,
      undo,
      setCategories,
      setEvents,
      setEventTypes,
      setNotifications: (update: (n: NotificationSettings) => NotificationSettings) =>
        updateUser({ notif: update(userDoc.notif) }),
      setCleanupDays: (cleanupDays: CleanupDays) => updateUser({ cleanupDays }),
    }),
    [
      day,
      userDoc,
      uid,
      houseId,
      houseName,
      tasks,
      categories,
      events,
      eventTypes,
      members,
      toast,
      setTasks,
      changeTasks,
      changeEvents,
      undo,
      setCategories,
      setEvents,
      setEventTypes,
      updateUser,
    ],
  )

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
