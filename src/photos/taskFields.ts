// Liczba zdjęć i miniatura przy zadaniu (lista bez dodatkowych odczytów) – po zapisie zmian zdjęć.

import type { Task } from '../data/types.ts'
import type { PhotoKind } from '../firebase/photos.ts'
import { planPhotos, sortPhotos, type PhotoDraft, type TaskPhoto } from './draft.ts'

/**
 * Nowe pola zadania po zapisie: `photos` (ile widać) i `thumb` (miniatura pierwszego zdjęcia).
 * Gdy pierwsze zdjęcie się zmieniło na wcześniej zapisane – miniatura z jego kafelka.
 */
export async function photoFieldsAfter(
  task: Task,
  saved: TaskPhoto[],
  draft: PhotoDraft,
  thumbFromTile: (tileUrl: string) => Promise<string>,
): Promise<Pick<Task, 'photos' | 'seriesPhotos' | 'thumb'>> {
  const { count, seriesCount, first } = planPhotos(saved, draft)
  if (!count || !first) return { photos: undefined, seriesPhotos: undefined, thumb: undefined }
  const base = { photos: count, seriesPhotos: seriesCount || undefined }
  if (first.added) return { ...base, thumb: first.added.thumb }
  const wasFirst = sortPhotos(saved)[0]?.id === first.saved?.id
  if (wasFirst && task.thumb) return { ...base, thumb: task.thumb }
  try {
    return { ...base, thumb: await thumbFromTile(first.tileUrl) }
  } catch {
    return { ...base, thumb: undefined }
  }
}

/** Zadanie z nowymi polami zdjęć (brak = pole znika). */
export function withPhotoFields(t: Task, f: Pick<Task, 'photos' | 'seriesPhotos' | 'thumb'>): Task {
  const next: Task = { ...t, ...f }
  if (!next.photos) delete next.photos
  if (!next.photos || !next.seriesPhotos) delete next.seriesPhotos
  if (!next.photos || !next.thumb) delete next.thumb
  return next
}

/**
 * „Przenieś do…” w podglądzie: to samo zdjęcie jako nowe innego rodzaju (kafelek z adresu,
 * pełna wersja wczytana z bazy) – zapis usuwa stare i dodaje nowe.
 */
export async function kindChangeDraft(
  photo: TaskPhoto,
  kind: PhotoKind,
  full: Blob,
  thumbFromTile: (tileUrl: string) => Promise<string>,
): Promise<PhotoDraft> {
  const b64 = photo.tileUrl.slice(photo.tileUrl.indexOf(',') + 1)
  const tile = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  return {
    removed: [photo.id],
    added: [
      {
        key: `zmiana-${photo.id}`,
        type: photo.type,
        full: new Uint8Array(await full.arrayBuffer()),
        tile,
        thumb: await thumbFromTile(photo.tileUrl),
        tileUrl: photo.tileUrl,
        kind,
      },
    ],
  }
}
