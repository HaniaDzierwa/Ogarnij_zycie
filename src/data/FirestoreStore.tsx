import { collection, doc, onSnapshot, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
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
  pushDoc,
  priorityFromDoc,
  priorityToDoc,
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
import { revertChanges } from './listDiff.ts'
import { allPriorities } from './selectors.ts'
import { StoreContext, useUndoToast, type Store } from './store.ts'
import type {
  CalendarEvent,
  Category,
  CleanupDays,
  CustomPriority,
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

/** Części danych domu czytane na żywo: dom, zadania, kategorie, wydarzenia, rodzaje, domownicy. */
const HOUSE_PARTS = 9

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

  // wspólne i „Tylko ja” przychodzą z dwóch miejsc w bazie; ekrany widzą jedną listę
  const [sharedTasks, setSharedTasks] = useState<Task[]>([])
  const [ownTasks, setOwnTasks] = useState<Task[]>([])
  const tasks = useMemo(() => [...sharedTasks, ...ownTasks].sort(byId), [sharedTasks, ownTasks])
  const setTasksState = useCallback((list: Task[]) => {
    setSharedTasks(list.filter((t) => !t.private))
    setOwnTasks(list.filter((t) => t.private))
  }, [])
  const [categories, setCategoriesState] = useState<Category[]>([])
  const [customPriorities, setPrioritiesState] = useState<CustomPriority[]>([])
  const [sharedEvents, setSharedEvents] = useState<CalendarEvent[]>([])
  const [ownEvents, setOwnEvents] = useState<CalendarEvent[]>([])
  const events = useMemo(
    () => [...sharedEvents, ...ownEvents].sort(byId),
    [sharedEvents, ownEvents],
  )
  const setEventsState = useCallback((list: CalendarEvent[]) => {
    setSharedEvents(list.filter((e) => !e.private))
    setOwnEvents(list.filter((e) => e.private))
  }, [])
  const [eventTypes, setEventTypesState] = useState<EventType[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [houseName, setHouseNameState] = useState('')
  const [userDoc, setUserDoc] = useState<Omit<UserDoc, 'houseId'>>({ ...DEFAULT_USER, name: '' })
  const { toast, show, undo } = useUndoToast()
  // które części danych domu już przyszły (pierwszy odczyt) – ekrany czekają na komplet
  const [loaded, setLoaded] = useState<ReadonlySet<string>>(new Set())

  // Najnowsze listy – kolejne zmiany w jednym kliknięciu liczą się od wyniku poprzedniej.
  const latest = useRef({ tasks, categories, customPriorities, events, eventTypes })
  latest.current = { tasks, categories, customPriorities, events, eventTypes }

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
    const mark = (part: string) => setLoaded((s) => (s.has(part) ? s : new Set([...s, part])))
    // błąd odczytu (np. brak dostępu) – nie czekamy w nieskończoność na tę część
    const failed = (part: string) => (e: unknown) => {
      console.error(`Nie udało się wczytać: ${part}`, e)
      mark(part)
    }
    const subs = [
      onSnapshot(
        doc(db, paths.house(houseId)),
        (snap) => {
          setHouseNameState((snap.data() as Partial<HouseDoc> | undefined)?.name ?? '')
          mark('house')
        },
        failed('house'),
      ),
      onSnapshot(
        collection(db, paths.tasks(houseId)),
        (snap) => {
          setSharedTasks(snap.docs.map((d) => taskFromDoc(d.id, d.data())))
          mark('tasks')
        },
        failed('tasks'),
      ),
      onSnapshot(
        collection(db, paths.privateTasks(houseId, uid)),
        (snap) => {
          setOwnTasks(snap.docs.map((d) => taskFromDoc(d.id, d.data(), true)))
          mark('privateTasks')
        },
        failed('privateTasks'),
      ),
      onSnapshot(
        collection(db, paths.categories(houseId)),
        (snap) => {
          setCategoriesState(
            snap.docs.map((d) => categoryFromDoc(d.id, d.data())).sort((a, b) => a.order - b.order),
          )
          mark('categories')
        },
        failed('categories'),
      ),
      onSnapshot(
        collection(db, paths.priorities(houseId)),
        (snap) => {
          setPrioritiesState(snap.docs.map((d) => priorityFromDoc(d.id, d.data())))
          mark('priorities')
        },
        failed('priorities'),
      ),
      onSnapshot(
        collection(db, paths.events(houseId)),
        (snap) => {
          setSharedEvents(snap.docs.map((d) => eventFromDoc(d.id, d.data())))
          mark('events')
        },
        failed('events'),
      ),
      onSnapshot(
        collection(db, paths.privateEvents(houseId, uid)),
        (snap) => {
          setOwnEvents(snap.docs.map((d) => eventFromDoc(d.id, d.data(), true)))
          mark('privateEvents')
        },
        failed('privateEvents'),
      ),
      onSnapshot(
        collection(db, paths.eventTypes(houseId)),
        (snap) => {
          setEventTypesState(snap.docs.map((d) => eventTypeFromDoc(d.id, d.data())).sort(typeOrder))
          mark('eventTypes')
        },
        failed('eventTypes'),
      ),
      onSnapshot(
        collection(db, paths.members(houseId)),
        (snap) => {
          mark('members')
          setMembers(
            snap.docs.map((d) => {
              const m = d.data() as Partial<MemberDoc>
              return {
                uid: d.id,
                name: m.name ?? '',
                role: m.role ?? 'member',
                scope: m.scope ?? { all: true, categoryIds: [], calendar: true },
                // bez odmiany i bez „ostatnio” (decyzja Hani 2026-10-18; aktywność – etap 4)
                nameGenitive: m.name ?? '',
                lastSeen: '',
              }
            }),
          )
        },
        failed('members'),
      ),
    ]
    return () => subs.forEach((unsub) => unsub())
  }, [houseId, uid])

  /** Zmiana listy: od razu na ekranie, w tle zapis różnic do Firestore. */
  const makeSetter = useCallback(
    <T extends { id: string; private?: boolean }>(
      key: keyof typeof latest.current,
      setState: (v: T[]) => void,
      path: (h: string) => string,
      toDoc: (x: T, uid: string) => Record<string, unknown>,
      /** Lista z „Tylko ja”: prywatne do osobnego miejsca; zmiana wspólne ↔ prywatne = przeniesienie. */
      privatePath?: (h: string, uid: string) => string,
    ) =>
      (update: (list: T[]) => T[]) => {
        if (!houseId) return
        const prev = latest.current[key] as unknown as T[]
        const next = update(prev)
        ;(latest.current[key] as unknown as T[]) = next
        setState(next)
        const sync = (where: string, keep: (x: T) => boolean) =>
          syncCollection({
            db,
            path: where,
            prev: prev.filter(keep),
            next: next.filter(keep),
            toDoc: (x) => toDoc(x, uid),
            onError: reportError,
          })
        if (!privatePath) sync(path(houseId), () => true)
        else {
          sync(path(houseId), (x) => !x.private)
          sync(privatePath(houseId, uid), (x) => !!x.private)
        }
      },
    [houseId, uid],
  )

  const setTasks = useMemo(
    () => makeSetter<Task>('tasks', setTasksState, paths.tasks, taskToDoc, paths.privateTasks),
    [makeSetter, setTasksState],
  )
  const setCategories = useMemo(
    () => makeSetter<Category>('categories', setCategoriesState, paths.categories, categoryToDoc),
    [makeSetter],
  )
  const setCustomPriorities = useMemo(
    () =>
      makeSetter<CustomPriority>(
        'customPriorities',
        setPrioritiesState,
        paths.priorities,
        priorityToDoc,
      ),
    [makeSetter],
  )
  const priorities = useMemo(() => allPriorities(customPriorities), [customPriorities])
  const setEvents = useMemo(
    () =>
      makeSetter<CalendarEvent>(
        'events',
        setEventsState,
        paths.events,
        eventToDoc,
        paths.privateEvents,
      ),
    [makeSetter, setEventsState],
  )
  const setEventTypes = useMemo(
    () => makeSetter<EventType>('eventTypes', setEventTypesState, paths.eventTypes, eventTypeToDoc),
    [makeSetter],
  )

  const changeTasks = useCallback(
    (text: string, update: (t: Task[]) => Task[]) => {
      const before = latest.current.tasks
      const after = update(before)
      // „Cofnij” – tylko zadania zmienione tą akcją; zmiany domownika z tych sekund zostają
      show(text, () => setTasks((cur) => revertChanges(cur, before, after)))
      setTasks(() => after)
    },
    [setTasks, show],
  )
  const changeEvents = useCallback(
    (text: string, update: (e: CalendarEvent[]) => CalendarEvent[]) => {
      const before = latest.current.events
      const after = update(before)
      show(text, () => setEvents((cur) => revertChanges(cur, before, after)))
      setEvents(() => after)
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
      ready: !houseId || loaded.size >= HOUSE_PARTS,
      today: day,
      userName: userDoc.name,
      currentUid: uid,
      houseName,
      tasks,
      categories,
      customPriorities,
      priorities,
      events,
      eventTypes,
      members,
      notifications: userDoc.notif,
      cleanupDays: userDoc.cleanupDays,
      taskReminderTime: userDoc.taskReminderTime,
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
      setCustomPriorities,
      setEvents,
      setEventTypes,
      setNotifications: (update: (n: NotificationSettings) => NotificationSettings) =>
        updateUser({ notif: update(userDoc.notif) }),
      setCleanupDays: (cleanupDays: CleanupDays) => updateUser({ cleanupDays }),
      setTaskReminderTime: (taskReminderTime: string) => updateUser({ taskReminderTime }),
      savePushSubscription: (id, sub) =>
        setDoc(doc(db, paths.push(uid, id)), pushDoc(sub, navigator.userAgent)),
    }),
    [
      day,
      loaded,
      userDoc,
      uid,
      houseId,
      houseName,
      tasks,
      categories,
      customPriorities,
      priorities,
      events,
      eventTypes,
      members,
      toast,
      setTasks,
      changeTasks,
      changeEvents,
      undo,
      setCategories,
      setCustomPriorities,
      setEvents,
      setEventTypes,
      updateUser,
    ],
  )

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
