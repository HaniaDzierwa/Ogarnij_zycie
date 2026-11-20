import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { photoId } from '../firebase/photos.ts'
import { planPhotos, seriesOf, sortPhotos, type TaskPhoto } from '../photos/draft.ts'
import { kindChangeDraft, photoFieldsAfter, withPhotoFields } from '../photos/taskFields.ts'
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
import { DEFAULT_USER, normalizeTimes } from '../firebase/model.ts'
import { newId } from './ids.ts'
import { revertChanges } from './listDiff.ts'
import { spawnRepeats } from './taskOps.ts'
import { allPriorities } from './selectors.ts'
import { StoreContext, useUndoToast, type PhotosApi, type Store } from './store.ts'
import type { CalendarEvent, CleanupDays, CustomPriority, Task } from './types.ts'

let fakePhotoCounter = 0

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
  const [tasks, setTasksState] = useState(() => mockTasks(day))
  /** Ogarnięte zadanie cykliczne → obok następne (etap 8), jak w FirestoreStore. */
  const withRepeats = useCallback(
    (list: Task[]) => spawnRepeats(list, day, currentUid, () => newId('t')),
    [day, currentUid],
  )
  const setTasks = useCallback(
    (update: (list: Task[]) => Task[]) => setTasksState((cur) => withRepeats(update(cur))),
    [withRepeats],
  )
  const [categories, setCategories] = useState(mockCategories)
  const [customPriorities, setCustomPriorities] = useState(initialPriorities)
  const priorities = useMemo(() => allPriorities(customPriorities), [customPriorities])
  const [events, setEvents] = useState(() => mockEvents(day))
  const [eventTypes, setEventTypes] = useState(() => (noEventTypes ? [] : mockEventTypes))
  const [notifications, setNotifications] = useState(mockNotifications)
  const [cleanupDays, setCleanupDays] = useState<CleanupDays>(30)
  const [summaryTimes, setSummaryTimes] = useState(['08:00', '18:00'])
  const [summaryContent, setSummaryContent] = useState(DEFAULT_USER.summaryContent)
  const { toast, show, undo } = useUndoToast()

  const who = useCallback(() => ({ uid: currentUid, at: nowStamp(day) }), [day, currentUid])

  // zdjęcia (etap 9) – w pamięci; zmniejszanie udawane (w testach nie ma prawdziwego obrazka)
  const photoList = useRef<(TaskPhoto & { owner: string })[]>([])
  const photoListeners = useRef(new Set<() => void>())
  const [photoBytes, setPhotoBytes] = useState(0)
  const photos = useMemo<PhotosApi>(() => {
    const api: PhotosApi = {
      usage: { house: photoBytes, app: photoBytes },
      move: async (saved, privateUid) => {
        const ids = new Set(saved.map((p) => p.id))
        photoList.current = photoList.current.map((p) =>
          ids.has(p.id) ? { ...p, place: { ...p.place, privateUid } } : p,
        )
        photoListeners.current.forEach((run) => run())
      },
      changeKind: async (task, saved, photo, kind) =>
        api.save(
          task,
          saved,
          await kindChangeDraft(photo, kind, new Blob(['PELNE']), async () => 'MINI-ZMIANA'),
        ),
      crop: async () => new Blob(['PRZYCIETE'], { type: 'image/jpeg' }),
      loadFull: async (photo) => new Blob([`PELNE-${photo.id}`], { type: photo.type }),
      prepare: async (file) => {
        const n = ++fakePhotoCounter
        const tile = new Uint8Array(100).fill(n % 255)
        return {
          key: `nowe-${n}`,
          type: 'image/webp',
          full: new Uint8Array(Math.max(1, file.size)),
          tile,
          thumb: `MINI${n}`,
          tileUrl: `data:image/webp;base64,KAFEL${n}`,
        }
      },
      watch: (task, onChange) => {
        const run = () =>
          onChange(
            sortPhotos(
              photoList.current.filter((p) =>
                p.kind === 'task' ? p.owner === task.id : p.owner === seriesOf(task),
              ),
            ),
          )
        photoListeners.current.add(run)
        run()
        return () => {
          photoListeners.current.delete(run)
        }
      },
      save: (task, saved, draft) => {
        const plan = planPhotos(saved, draft)
        const removed = new Set(plan.removes.map((p) => p.id))
        const added = plan.adds.map(({ photo, kind, slot }) => ({
          id: photoId(kind, kind === 'series' ? seriesOf(task) : task.id, slot),
          kind,
          slot,
          size: photo.tile.length + photo.full.length,
          type: photo.type,
          tileUrl: photo.tileUrl,
          createdBy: currentUid,
          place: { houseId: 'dom', privateUid: task.private ? currentUid : undefined },
          owner: kind === 'series' ? seriesOf(task) : task.id,
        }))
        photoList.current = [...photoList.current.filter((p) => !removed.has(p.id)), ...added]
        setPhotoBytes(photoList.current.reduce((n, p) => n + p.size, 0))
        photoListeners.current.forEach((run) => run())
        void photoFieldsAfter(task, saved, draft, async (url) => `Z:${url.slice(-6)}`).then((f) =>
          setTasksState((list) => list.map((t) => (t.id === task.id ? withPhotoFields(t, f) : t))),
        )
      },
    }
    return api
  }, [photoBytes, currentUid])

  const changeTasks = useCallback(
    (text: string, update: (t: Task[]) => Task[]) => {
      const before = tasks
      const after = withRepeats(update(tasks))
      // „Cofnij” – tylko zadania zmienione tą akcją (także następne wystąpienie cyklicznego)
      show(text, () => setTasksState((cur) => revertChanges(cur, before, after)))
      setTasksState(after)
    },
    [tasks, show, withRepeats],
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
      summaryTimes,
      summaryContent,
      toast,
      who,
      setUserName,
      setHouseName,
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
      setNotifications,
      setCleanupDays,
      setSummaryTimes: (times: string[]) => setSummaryTimes(normalizeTimes(times)),
      setSummaryContent,
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
      summaryTimes,
      summaryContent,
      toast,
      who,
      setTasks,
      changeTasks,
      changeEvents,
      undo,
      show,
      photos,
    ],
  )

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
