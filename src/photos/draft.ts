// Zdjęcia w arkuszu zadania (etap 9): zmiany zbierane w kopii roboczej i zapisywane dopiero przy
// „Dodaj zadanie” / „Zapisz” – „Anuluj” cofa je razem z resztą zmian.

import { freeSlot, PHOTO_LIMITS, type PhotoKind, type PhotoPlace } from '../firebase/photos.ts'
import type { Task } from '../data/types.ts'
import type { PreparedPhoto } from './resize.ts'

/** Zdjęcie zapisane w bazie (kafelek – bez pełnej wersji). */
export type TaskPhoto = {
  id: string
  kind: PhotoKind
  slot: number
  size: number
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
export type PhotoTile = { key: string; tileUrl: string; saved?: TaskPhoto; added?: PreparedPhoto }

/** Kolejność: najpierw „przy każdym powtórzeniu”, potem zdjęcia zadania – wg miejsca. */
export function sortPhotos(list: TaskPhoto[]): TaskPhoto[] {
  return [...list].sort(
    (a, b) => (a.kind === b.kind ? 0 : a.kind === 'series' ? -1 : 1) || a.slot - b.slot,
  )
}

export function visibleTiles(saved: TaskPhoto[], draft: PhotoDraft): PhotoTile[] {
  return [
    ...sortPhotos(saved)
      .filter((p) => !draft.removed.includes(p.id))
      .map((p) => ({ key: p.id, tileUrl: p.tileUrl, saved: p })),
    ...draft.added.map((a) => ({ key: a.key, tileUrl: a.tileUrl, added: a })),
  ]
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

/** Seria zadania cyklicznego (zdjęcia „przy każdym powtórzeniu”) – brak pola = id zadania. */
export const seriesOf = (t: Pick<Task, 'id' | 'seriesId'>) => t.seriesId ?? t.id

/**
 * Plan zapisu: które zdjęcia usunąć, które dodać i na które miejsca (0–4), ile zdjęć zostanie
 * przy zadaniu i czy miniatura na listę się zmienia (pierwsze widoczne zdjęcie).
 */
export function planPhotos(
  saved: TaskPhoto[],
  draft: PhotoDraft,
  kind: PhotoKind = 'task',
): {
  removes: TaskPhoto[]
  adds: { photo: PreparedPhoto; slot: number }[]
  count: number
  /** Pierwsze widoczne zdjęcie po zapisie – nowe (miniatura gotowa) albo zapisane. */
  first: PhotoTile | null
} {
  const removes = saved.filter((p) => draft.removed.includes(p.id))
  const taken = saved
    .filter((p) => p.kind === kind && !draft.removed.includes(p.id))
    .map((p) => p.slot)
  const adds: { photo: PreparedPhoto; slot: number }[] = []
  for (const photo of draft.added) {
    const slot = freeSlot(taken)
    if (slot === null) break
    taken.push(slot)
    adds.push({ photo, slot })
  }
  const tiles = visibleTiles(saved, { ...draft, added: adds.map((a) => a.photo) })
  return { removes, adds, count: tiles.length, first: tiles[0] ?? null }
}
