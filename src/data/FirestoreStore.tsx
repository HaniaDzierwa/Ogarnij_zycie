import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  waitForPendingWrites,
  where,
  writeBatch,
  type Bytes,
} from 'firebase/firestore'
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
  activityDoc,
  normalizeTimes,
  paths,
  pushDoc,
  summaryContentOf,
  summaryTimesOf,
  priorityFromDoc,
  priorityToDoc,
  taskFromDoc,
  taskToDoc,
  type HouseDoc,
  type MemberDoc,
  type UserDoc,
} from '../firebase/model.ts'
import { listenAfterWrites } from '../firebase/listen.ts'
import {
  addPhotoOps,
  deletePhotoOps,
  movePhotoOps,
  type PhotoDoc,
  type PhotoFullDoc,
  type PhotoOp,
  type PhotoPlace,
} from '../firebase/photos.ts'
import {
  photosOfGoneTasks,
  planPhotos,
  seriesOf,
  sortPhotos,
  type TaskPhoto,
} from '../photos/draft.ts'
import { cropImage, preparePhoto, thumbFromTile } from '../photos/resize.ts'
import { kindChangeDraft, photoFieldsAfter, withPhotoFields } from '../photos/taskFields.ts'
import { syncCollection } from '../firebase/sync.ts'
import { useHouse } from '../house/house.ts'
import { builtInEventTypes } from '../theme'
import { nowStamp, today as getToday } from './dates.ts'
import { eventActivity, taskActivity, type Activity } from './activity.ts'
import { newId } from './ids.ts'
import { revertChanges } from './listDiff.ts'
import { spawnRepeats } from './taskOps.ts'
import { allPriorities } from './selectors.ts'
import { StoreContext, useUndoToast, type PhotosApi, type Store } from './store.ts'
import type {
  CalendarEvent,
  Category,
  CleanupDays,
  CustomPriority,
  EventType,
  SummaryContent,
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

/** Jedna paczka zapisu zdjęcia (bez czekania na serwer – bez internetu wyśle się później). */
function commitPhotoOps(ops: PhotoOp[]) {
  const batch = writeBatch(db)
  for (const op of ops) {
    const ref = doc(db, op.path)
    if ('delete' in op) batch.delete(ref)
    else if (op.mode === 'update') batch.update(ref, op.data)
    else if (op.mode === 'merge') batch.set(ref, op.data, { merge: true })
    else batch.set(ref, op.data)
  }
  batch.commit().catch(reportError)
}

/** Kafelek z bazy → zdjęcie do pokazania. */
function photoFromDoc(id: string, d: Partial<PhotoDoc>, place: PhotoPlace): TaskPhoto {
  const tile = d.tile as Bytes | undefined
  return {
    id,
    kind: d.kind === 'series' ? 'series' : 'task',
    slot: typeof d.slot === 'number' ? d.slot : 0,
    size: typeof d.size === 'number' ? d.size : 0,
    type: d.type === 'image/webp' ? 'image/webp' : 'image/jpeg',
    tileUrl: tile ? `data:${d.type ?? 'image/jpeg'};base64,${tile.toBase64()}` : '',
    createdBy: d.createdBy ?? '',
    place,
  }
}

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
  // zdjęcia (etap 9): zajęte miejsce i numer ostatniej zmiany liczników domu
  const [photoUsage, setPhotoUsage] = useState({ house: 0, app: 0 })
  const photoSeq = useRef(0)
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
        summaryTimes: summaryTimesOf(d),
        summaryContent: summaryContentOf(d),
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
    // odczyt mógł wyprzedzić zapis nowego domu – po „braku dostępu” jeszcze raz, po zapisach
    const listen = (part: string, subscribe: (onError: (e: unknown) => void) => () => void) =>
      listenAfterWrites(subscribe, failed(part), () => waitForPendingWrites(db))
    const subs = [
      listen('house', (onError) =>
        onSnapshot(
          doc(db, paths.house(houseId)),
          (snap) => {
            const h = snap.data() as
              (Partial<HouseDoc> & { photoBytes?: number; photoSeq?: number }) | undefined
            setHouseNameState(h?.name ?? '')
            photoSeq.current = h?.photoSeq ?? 0
            setPhotoUsage((u) => ({ ...u, house: h?.photoBytes ?? 0 }))
            mark('house')
          },
          onError,
        ),
      ),
      listen('tasks', (onError) =>
        onSnapshot(
          collection(db, paths.tasks(houseId)),
          (snap) => {
            setSharedTasks(snap.docs.map((d) => taskFromDoc(d.id, d.data())))
            mark('tasks')
          },
          onError,
        ),
      ),
      listen('privateTasks', (onError) =>
        onSnapshot(
          collection(db, paths.privateTasks(houseId, uid)),
          (snap) => {
            setOwnTasks(snap.docs.map((d) => taskFromDoc(d.id, d.data(), true)))
            mark('privateTasks')
          },
          onError,
        ),
      ),
      listen('categories', (onError) =>
        onSnapshot(
          collection(db, paths.categories(houseId)),
          (snap) => {
            setCategoriesState(
              snap.docs
                .map((d) => categoryFromDoc(d.id, d.data()))
                .sort((a, b) => a.order - b.order),
            )
            mark('categories')
          },
          onError,
        ),
      ),
      listen('priorities', (onError) =>
        onSnapshot(
          collection(db, paths.priorities(houseId)),
          (snap) => {
            setPrioritiesState(snap.docs.map((d) => priorityFromDoc(d.id, d.data())))
            mark('priorities')
          },
          onError,
        ),
      ),
      listen('events', (onError) =>
        onSnapshot(
          collection(db, paths.events(houseId)),
          (snap) => {
            setSharedEvents(snap.docs.map((d) => eventFromDoc(d.id, d.data())))
            mark('events')
          },
          onError,
        ),
      ),
      listen('privateEvents', (onError) =>
        onSnapshot(
          collection(db, paths.privateEvents(houseId, uid)),
          (snap) => {
            setOwnEvents(snap.docs.map((d) => eventFromDoc(d.id, d.data(), true)))
            mark('privateEvents')
          },
          onError,
        ),
      ),
      listen('eventTypes', (onError) =>
        onSnapshot(
          collection(db, paths.eventTypes(houseId)),
          (snap) => {
            setEventTypesState(
              snap.docs.map((d) => eventTypeFromDoc(d.id, d.data())).sort(typeOrder),
            )
            mark('eventTypes')
          },
          onError,
        ),
      ),
      listen('members', (onError) =>
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
          onError,
        ),
      ),
    ]
    // licznik zdjęć całej aplikacji – tylko do komunikatu „miejsce się skończyło” (nie czekamy na niego)
    const usage = onSnapshot(
      doc(db, paths.photoUsage()),
      (snap) => setPhotoUsage((u) => ({ ...u, app: snap.data()?.photoBytes ?? 0 })),
      () => {},
    )
    return () => {
      subs.forEach((unsub) => unsub())
      usage()
    }
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
      /** Co z tej zmiany ma trafić do powiadomień domowników (docs/POWIADOMIENIA.md). */
      activity?: (prev: T[], next: T[]) => Activity[],
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
        const entries = activity?.(prev, next) ?? []
        if (entries.length) {
          const batch = writeBatch(db)
          for (const a of entries)
            batch.set(doc(collection(db, paths.activity(houseId))), activityDoc(a, uid))
          batch.commit().catch(reportError)
        }
      },
    [houseId, uid],
  )

  /** Ogarnięte zadanie cykliczne → obok następne (etap 8). */
  const withRepeats = useCallback(
    (list: Task[]) => spawnRepeats(list, day, uid, () => newId('t')),
    [day, uid],
  )
  /**
   * Zadania usunięte na zawsze („Opróżnij kosz”, sprzątanie po 30 dniach) – ich zdjęcia też znikają,
   * a zdjęcia serii, gdy w serii nie zostało już żadne zadanie (etap 9). Każde – osobna paczka
   * z licznikami. Przeniesienie wspólne ↔ „Tylko ja” to nie usunięcie (to samo id zostaje).
   */
  const removeGonePhotos = useCallback(
    (before: Task[], after: Task[]) => {
      if (!houseId) return
      for (const { task: t, series } of photosOfGoneTasks(before, after)) {
        const place: PhotoPlace = { houseId, privateUid: t.private ? uid : undefined }
        const coll = collection(db, paths.photos(houseId, place.privateUid))
        void Promise.all([
          getDocs(query(coll, where('taskId', '==', t.id))),
          series ? getDocs(query(coll, where('seriesId', '==', series))) : null,
        ])
          .then((snaps) => {
            for (const snap of snaps)
              for (const d of snap?.docs ?? []) {
                const size = (d.data() as Partial<PhotoDoc>).size ?? 0
                photoSeq.current += 1
                commitPhotoOps(deletePhotoOps(place, d.id, size, photoSeq.current))
              }
          })
          .catch(reportError)
      }
    },
    [houseId, uid],
  )
  const setTasks = useMemo(() => {
    const set = makeSetter<Task>(
      'tasks',
      setTasksState,
      paths.tasks,
      taskToDoc,
      paths.privateTasks,
      (p, n) => taskActivity(p, n, day),
    )
    return (update: (list: Task[]) => Task[]) => {
      const before = latest.current.tasks
      set((list) => withRepeats(update(list)))
      removeGonePhotos(before, latest.current.tasks)
    }
  }, [makeSetter, setTasksState, day, withRepeats, removeGonePhotos])
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
        (p, n) => eventActivity(p, n, day),
      ),
    [makeSetter, setEventsState, day],
  )
  const setEventTypes = useMemo(
    () => makeSetter<EventType>('eventTypes', setEventTypesState, paths.eventTypes, eventTypeToDoc),
    [makeSetter],
  )

  const changeTasks = useCallback(
    (text: string, update: (t: Task[]) => Task[]) => {
      const before = latest.current.tasks
      // następne wystąpienie zadania cyklicznego też cofa „Cofnij”
      const after = withRepeats(update(before))
      // „Cofnij” – tylko zadania zmienione tą akcją; zmiany domownika z tych sekund zostają
      show(text, () => setTasks((cur) => revertChanges(cur, before, after)))
      setTasks(() => after)
    },
    [setTasks, show, withRepeats],
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

  const photos = useMemo<PhotosApi>(() => {
    const api: PhotosApi = {
      prepare: preparePhoto,
      crop: cropImage,
      move: async (saved, privateUid) => {
        if (!houseId) return
        const to: PhotoPlace = { houseId, privateUid }
        for (const p of saved) {
          const from = p.place
          const [photo, full] = await Promise.all([
            getDoc(doc(db, `${paths.photos(from.houseId, from.privateUid)}/${p.id}`)),
            getDoc(doc(db, `${paths.photoFull(from.houseId, from.privateUid)}/${p.id}`)),
          ])
          if (!photo.exists() || !full.exists()) continue
          commitPhotoOps(
            movePhotoOps(from, to, p.id, photo.data() as PhotoDoc, full.data() as PhotoFullDoc),
          )
        }
      },
      changeKind: async (task, saved, photo, kind) => {
        const full = await api.loadFull(photo)
        api.save(task, saved, await kindChangeDraft(photo, kind, full, thumbFromTile))
      },
      loadFull: async (photo) => {
        const snap = await getDoc(
          doc(db, `${paths.photoFull(photo.place.houseId, photo.place.privateUid)}/${photo.id}`),
        )
        const full = (snap.data() as Partial<PhotoFullDoc> | undefined)?.full
        if (!full) throw new Error('Brak pełnej wersji zdjęcia')
        return new Blob([new Uint8Array(full.toUint8Array())], { type: photo.type })
      },
      usage: photoUsage,
      watch: (task, onChange) => {
        if (!houseId) return () => {}
        const place: PhotoPlace = { houseId, privateUid: task.private ? uid : undefined }
        const coll = collection(db, paths.photos(houseId, place.privateUid))
        let own: TaskPhoto[] = []
        let series: TaskPhoto[] = []
        const emit = () => onChange(sortPhotos([...own, ...series]))
        const fail = (e: unknown) => console.error('Nie udało się wczytać zdjęć', e)
        const unsubs = [
          onSnapshot(
            query(coll, where('taskId', '==', task.id)),
            (snap) => {
              own = snap.docs.map((d) => photoFromDoc(d.id, d.data(), place))
              emit()
            },
            fail,
          ),
          onSnapshot(
            query(coll, where('seriesId', '==', seriesOf(task))),
            (snap) => {
              series = snap.docs.map((d) => photoFromDoc(d.id, d.data(), place))
              emit()
            },
            fail,
          ),
        ]
        return () => unsubs.forEach((u) => u())
      },
      save: (task, saved, draft) => {
        if (!houseId) return
        const place: PhotoPlace = { houseId, privateUid: task.private ? uid : undefined }
        const plan = planPhotos(saved, draft)
        // każda zmiana – osobna paczka z kolejnym numerem zmiany liczników domu
        let seq = photoSeq.current
        const add = ({ photo, kind, slot }: (typeof plan.adds)[number]) => {
          const { id, ops } = addPhotoOps({
            place,
            uid,
            kind,
            owner: kind === 'series' ? seriesOf(task) : task.id,
            slot,
            type: photo.type,
            tile: photo.tile,
            full: photo.full,
            seq: seq + 1,
          })
          return { id, ops }
        }
        const removedIds = new Set(plan.removes.map((p) => p.id))
        const adds = plan.adds.map(add)
        // najpierw nowe (zdjęcie nie znika na chwilę przy „Przenieś do…”), chyba że zajmują
        // miejsce usuwanego – wtedy po usunięciu
        const order = [
          ...plan.adds.filter((_, i) => !removedIds.has(adds[i].id)).map((a) => () => add(a).ops),
          ...plan.removes.map((p) => () => deletePhotoOps(p.place, p.id, p.size, seq + 1)),
          ...plan.adds.filter((_, i) => removedIds.has(adds[i].id)).map((a) => () => add(a).ops),
        ]
        for (const ops of order) {
          commitPhotoOps(ops())
          seq++
        }
        photoSeq.current = seq
        void photoFieldsAfter(task, saved, draft, thumbFromTile).then((f) =>
          setTasks((list) => list.map((t) => (t.id === task.id ? withPhotoFields(t, f) : t))),
        )
      },
    }
    return api
  }, [houseId, uid, photoUsage, setTasks])

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
      summaryTimes: userDoc.summaryTimes,
      summaryContent: userDoc.summaryContent,
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
      showUndo: show,
      photos,
      setCategories,
      setCustomPriorities,
      setEvents,
      setEventTypes,
      setNotifications: (update: (n: NotificationSettings) => NotificationSettings) =>
        updateUser({ notif: update(userDoc.notif) }),
      setCleanupDays: (cleanupDays: CleanupDays) => updateUser({ cleanupDays }),
      setSummaryTimes: (times: string[]) => updateUser({ summaryTimes: normalizeTimes(times) }),
      setSummaryContent: (summaryContent: SummaryContent) => updateUser({ summaryContent }),
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
      show,
      photos,
      setCategories,
      setCustomPriorities,
      setEvents,
      setEventTypes,
      updateUser,
    ],
  )

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
