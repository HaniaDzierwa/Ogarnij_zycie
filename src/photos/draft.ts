// Zdjęcia w arkuszu zadania (etap 9): zmiany zbierane w kopii roboczej i zapisywane dopiero przy
// „Dodaj zadanie” / „Zapisz” – „Anuluj” cofa je razem z resztą zmian.

import {
  freeSlot,
  PHOTO_LIMITS,
  type PhotoKind,
  type PhotoPlace,
  type PhotoType,
} from '../firebase/photos.ts'
import type { Task } from '../data/types.ts'
import type { PreparedPhoto } from './resize.ts'

/** Zdjęcie zapisane w bazie (kafelek – bez pełnej wersji). */
export type TaskPhoto = {
  id: string
  kind: PhotoKind
  slot: number
  size: number
  type: PhotoType
  tileUrl: string
  createdBy: string
  /** Gdzie leży – wspólne albo „Tylko ja”. */
  place: PhotoPlace
}

export type PhotoDraft = {
  added: PreparedPhoto[]
  /** Id usuniętych zdjęć z bazy. */
  removed: string[]
}

export const emptyPhotoDraft: PhotoDraft = { added: [], removed: [] }

export const draftChanged = (d: PhotoDraft) => d.added.length > 0 || d.removed.length > 0

/** Kafelek w arkuszu: zapisane (bez usuniętych) i nowe. */
export type PhotoTile = {
  key: string
  tileUrl: string
  kind: PhotoKind
  saved?: TaskPhoto
  added?: PreparedPhoto
}

/** Rodzaj nowego zdjęcia – bez wyboru „tylko tym razem”. */
export const kindOf = (a: PreparedPhoto): PhotoKind => a.kind ?? 'task'

/** Kolejność: najpierw „przy każdym powtórzeniu”, potem zdjęcia zadania – wg miejsca. */
export function sortPhotos(list: TaskPhoto[]): TaskPhoto[] {
  return [...list].sort(
    (a, b) => (a.kind === b.kind ? 0 : a.kind === 'series' ? -1 : 1) || a.slot - b.slot,
  )
}

/** Widoczne kafelki: najpierw zdjęcia serii (zapisane, potem nowe), potem zdjęcia zadania. */
export function visibleTiles(saved: TaskPhoto[], draft: PhotoDraft): PhotoTile[] {
  const tiles = (kind: PhotoKind): PhotoTile[] => [
    ...sortPhotos(saved)
      .filter((p) => p.kind === kind && !draft.removed.includes(p.id))
      .map((p) => ({ key: p.id, tileUrl: p.tileUrl, kind, saved: p })),
    ...draft.added
      .filter((a) => kindOf(a) === kind)
      .map((a) => ({ key: a.key, tileUrl: a.tileUrl, kind, added: a })),
  ]
  return [...tiles('series'), ...tiles('task')]
}

/** Czy można dodać kolejne (razem najwyżej 5; `pending` – jeszcze się zmniejszają). */
export const canAddPhoto = (saved: TaskPhoto[], draft: PhotoDraft, pending = 0) =>
  visibleTiles(saved, draft).length + pending < PHOTO_LIMITS.perTask

/** Bajty, o które zmieni się licznik domu po zapisie kopii roboczej. */
export function draftBytes(saved: TaskPhoto[], draft: PhotoDraft): number {
  const add = draft.added.reduce((n, a) => n + a.tile.length + a.full.length, 0)
  const del = saved.filter((p) => draft.removed.includes(p.id)).reduce((n, p) => n + p.size, 0)
  return add - del
}

/** Miniatura z zadania (base64) jako adres obrazka – rodzaj pliku z jego początku. */
export const thumbSrc = (b64: string) =>
  `data:${b64.startsWith('/9j/') ? 'image/jpeg' : 'image/webp'};base64,${b64}`

/** Seria zadania cyklicznego (zdjęcia „przy każdym powtórzeniu”) – brak pola = id zadania. */
export const seriesOf = (t: Pick<Task, 'id' | 'seriesId'>) => t.seriesId ?? t.id

/**
 * Plan zapisu: które zdjęcia usunąć, które dodać i na które miejsca (0–4 osobno dla każdego
 * rodzaju), ile zdjęć zostanie przy zadaniu (w tym serii) i pierwsze widoczne (miniatura).
 */
export function planPhotos(
  saved: TaskPhoto[],
  draft: PhotoDraft,
): {
  removes: TaskPhoto[]
  adds: { photo: PreparedPhoto; kind: PhotoKind; slot: number }[]
  count: number
  seriesCount: number
  /** Pierwsze widoczne zdjęcie po zapisie – nowe (miniatura gotowa) albo zapisane. */
  first: PhotoTile | null
} {
  const removes = saved.filter((p) => draft.removed.includes(p.id))
  const taken = (kind: PhotoKind) =>
    saved.filter((p) => p.kind === kind && !draft.removed.includes(p.id)).map((p) => p.slot)
  const slots = { task: taken('task'), series: taken('series') }
  const adds: { photo: PreparedPhoto; kind: PhotoKind; slot: number }[] = []
  for (const photo of draft.added) {
    const kind = kindOf(photo)
    const slot = freeSlot(slots[kind])
    if (slot === null) continue
    slots[kind].push(slot)
    adds.push({ photo, kind, slot })
  }
  const tiles = visibleTiles(saved, { ...draft, added: adds.map((a) => a.photo) })
  return {
    removes,
    adds,
    count: tiles.length,
    seriesCount: tiles.filter((t) => t.kind === 'series').length,
    first: tiles[0] ?? null,
  }
}

/**
 * Zadania usunięte na zawsze (są w `before`, nie ma ich w `after`) ze zdjęciami – i czy usunąć też
 * zdjęcia serii (gdy w tym miejscu nie zostało żadne zadanie tej serii). Przeniesienie wspólne ↔
 * „Tylko ja” zostawia to samo id, więc nie jest usunięciem.
 */
export function photosOfGoneTasks(
  before: Task[],
  after: Task[],
): { task: Task; series: string | null }[] {
  const kept = new Set(after.map((t) => t.id))
  return before
    .filter((t) => !kept.has(t.id) && (t.photos ?? 0) > 0)
    .map((t) => {
      const series = seriesOf(t)
      const alive = after.some((x) => x.private === t.private && seriesOf(x) === series)
      return { task: t, series: alive ? null : series }
    })
}
