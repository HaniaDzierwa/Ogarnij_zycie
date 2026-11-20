// Liczba zdjęć i miniatura przy zadaniu (lista bez dodatkowych odczytów) – po zapisie zmian zdjęć.

import type { Task } from '../data/types.ts'
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
): Promise<Pick<Task, 'photos' | 'thumb'>> {
  const { count, first } = planPhotos(saved, draft)
  if (!count || !first) return { photos: undefined, thumb: undefined }
  if (first.added) return { photos: count, thumb: first.added.thumb }
  const wasFirst = sortPhotos(saved)[0]?.id === first.saved?.id
  if (wasFirst && task.thumb) return { photos: count, thumb: task.thumb }
  try {
    return { photos: count, thumb: await thumbFromTile(first.tileUrl) }
  } catch {
    return { photos: count, thumb: undefined }
  }
}

/** Zadanie z nowymi polami zdjęć (brak = pole znika). */
export function withPhotoFields(t: Task, f: Pick<Task, 'photos' | 'thumb'>): Task {
  const next: Task = { ...t, ...f }
  if (!next.photos) delete next.photos
  if (!next.photos || !next.thumb) delete next.thumb
  return next
}
