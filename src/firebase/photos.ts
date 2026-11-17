// Zdjęcia w zadaniach (etap 9, docs/PLAN.md): kształt dokumentów i paczki zapisu.
// Bez połączenia z bazą – czyste funkcje; te same zasady sprawdzają reguły Firestore.
//
// Jedno zdjęcie = kafelek z opisem (`photos/{id}`) + pełna wersja (`photoFull/{id}`).
// Każde dodanie / usunięcie zmienia w tej samej paczce dwa liczniki miejsca: domu (150 MB)
// i całej aplikacji (`meta/photos`, 600 MB) – darmowy plan ma 1 GB na wszystko.

import {
  Bytes,
  increment,
  serverTimestamp,
  type FieldValue,
  type Timestamp,
} from 'firebase/firestore'
import { paths } from './model.ts'

const MB = 1024 * 1024

export const PHOTO_LIMITS = {
  /** Zdjęć widocznych przy zadaniu – razem własne i „przy każdym powtórzeniu” (pilnuje aplikacja). */
  perTask: 5,
  /** Miejsc na każdy rodzaj zdjęć (twarda granica w regułach: id `_0`…`_4` / `_s0`…`_s4`). */
  slots: 5,
  /** Kafelek (ok. 300 px) i pełna wersja (1080 px) – w bajtach. */
  tileBytes: 60_000,
  fullBytes: 700_000,
  /** Miniatura na listę przy zadaniu. */
  thumbBytes: 8_000,
  /** Liczniki miejsca (decyzja Hani 2026-11-17). */
  houseBytes: 150 * MB,
  appBytes: 600 * MB,
} as const

/** „Tylko tym razem” (zdjęcie wystąpienia) albo „Przy każdym powtórzeniu” (zdjęcie serii). */
export type PhotoKind = 'task' | 'series'
export type PhotoType = 'image/webp' | 'image/jpeg'

export type PhotoDoc = {
  kind: PhotoKind
  /** Zadanie (kind „task”) albo seria (kind „series”) – dokładnie jedno z nich. */
  taskId?: string
  seriesId?: string
  slot: number
  type: PhotoType
  tile: Bytes
  /** Kafelek + pełna wersja, w bajtach – o tyle zmieniają się liczniki. */
  size: number
  createdBy: string
  createdAt: Timestamp | FieldValue
}

export type PhotoFullDoc = { full: Bytes }

/** Id zdjęcia: `{zadanie}_{0–4}` albo `{seria}_s{0–4}` – stałe miejsca zamiast liczenia w regułach. */
export function photoId(kind: PhotoKind, owner: string, slot: number): string {
  return kind === 'task' ? `${owner}_${slot}` : `${owner}_s${slot}`
}

/** Pierwsze wolne miejsce (0–4) albo null, gdy wszystkie zajęte. */
export function freeSlot(taken: number[]): number | null {
  for (let s = 0; s < PHOTO_LIMITS.slots; s++) if (!taken.includes(s)) return s
  return null
}

/** Jedna operacja paczki: zapis (z `mergeFields` – tylko te pola) albo usunięcie. */
export type PhotoOp =
  | { path: string; data: Record<string, unknown>; mergeFields?: string[] }
  | { path: string; delete: true }

/** Gdzie leży zdjęcie: wspólne albo „Tylko ja” (uid autora). */
export type PhotoPlace = { houseId: string; privateUid?: string }

const photoPath = (p: PhotoPlace, id: string) => `${paths.photos(p.houseId, p.privateUid)}/${id}`
const fullPath = (p: PhotoPlace, id: string) => `${paths.photoFull(p.houseId, p.privateUid)}/${id}`

/** Oba liczniki o `delta` bajtów; `photoOp` / `op` wskazują zdjęcie (reguły sprawdzają zgodność). */
function counterOps(p: PhotoPlace, id: string, delta: number): PhotoOp[] {
  const uid = p.privateUid ?? ''
  return [
    {
      path: paths.house(p.houseId),
      data: { photoBytes: increment(delta), photoOp: { uid, id } },
      mergeFields: ['photoBytes', 'photoOp'],
    },
    {
      path: paths.photoUsage(),
      data: { photoBytes: increment(delta), op: { house: p.houseId, uid, id } },
      mergeFields: ['photoBytes', 'op'],
    },
  ]
}

/** Dodanie zdjęcia: kafelek, pełna wersja i oba liczniki – jedną paczką. */
export function addPhotoOps(opts: {
  place: PhotoPlace
  uid: string
  kind: PhotoKind
  /** Id zadania (kind „task”) albo serii (kind „series”). */
  owner: string
  slot: number
  type: PhotoType
  tile: Uint8Array
  full: Uint8Array
}): { id: string; size: number; ops: PhotoOp[] } {
  const { place, uid, kind, owner, slot, type, tile, full } = opts
  const id = photoId(kind, owner, slot)
  const size = tile.length + full.length
  const photo: PhotoDoc = {
    kind,
    ...(kind === 'task' ? { taskId: owner } : { seriesId: owner }),
    slot,
    type,
    tile: Bytes.fromUint8Array(tile),
    size,
    createdBy: uid,
    createdAt: serverTimestamp(),
  }
  return {
    id,
    size,
    ops: [
      { path: photoPath(place, id), data: photo },
      {
        path: fullPath(place, id),
        data: { full: Bytes.fromUint8Array(full) } satisfies PhotoFullDoc,
      },
      ...counterOps(place, id, size),
    ],
  }
}

/** Usunięcie zdjęcia: kafelek, pełna wersja i oba liczniki w dół – jedną paczką. */
export function deletePhotoOps(place: PhotoPlace, id: string, size: number): PhotoOp[] {
  return [
    { path: photoPath(place, id), delete: true },
    { path: fullPath(place, id), delete: true },
    ...counterOps(place, id, -size),
  ]
}

/**
 * Przeniesienie zdjęcia razem z zadaniem między „Wspólne” a „Tylko ja” – te same dane w nowym
 * miejscu, liczniki bez zmian (zdjęcie dalej zajmuje miejsce w tym samym domu).
 */
export function movePhotoOps(
  from: PhotoPlace,
  to: PhotoPlace,
  id: string,
  photo: PhotoDoc,
  full: PhotoFullDoc,
): PhotoOp[] {
  return [
    { path: photoPath(to, id), data: photo },
    { path: fullPath(to, id), data: full },
    { path: photoPath(from, id), delete: true },
    { path: fullPath(from, id), delete: true },
  ]
}

/**
 * Usuwanie domu (usunięcie konta założyciela): najpierw licznik domu na 0, a wspólny w dół o całe
 * miejsce domu. Potem założyciel usuwa zdjęcia bez liczenia każdego z osobna.
 */
export function closeHousePhotosOps(houseId: string, houseBytes: number): PhotoOp[] {
  return [
    {
      path: paths.house(houseId),
      data: { photoBytes: 0, photoOp: { closing: true } },
      mergeFields: ['photoBytes', 'photoOp'],
    },
    {
      path: paths.photoUsage(),
      data: { photoBytes: increment(-houseBytes), op: { house: houseId, closing: true } },
      mergeFields: ['photoBytes', 'op'],
    },
  ]
}
