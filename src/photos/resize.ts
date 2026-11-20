// Zmniejszanie zdjęć na telefonie (etap 9): z jednego pliku (aparat albo galeria) trzy wersje –
// pełna (1080 px po dłuższym boku), kafelek (kwadrat 300 px) i miniatura na listę (kwadrat 120 px).
// WebP, a gdy przeglądarka go nie zapisze (starsze Safari) – JPEG.

import { PHOTO_LIMITS, type PhotoKind, type PhotoType } from '../firebase/photos.ts'
import { cropPixels, type CropRect } from './crop.ts'

export const PHOTO_SIZES = { full: 1080, tile: 300, thumb: 120 } as const

/** Zdjęcie gotowe do zapisu: bajty wersji pełnej i kafelka, miniatura i kafelek do pokazania. */
export type PreparedPhoto = {
  /** Id na czas edycji (przed zapisem do bazy). */
  key: string
  type: PhotoType
  full: Uint8Array
  tile: Uint8Array
  /** Miniatura na listę – base64. */
  thumb: string
  /** Kafelek jako adres data: – do pokazania od razu. */
  tileUrl: string
  /** Zadanie cykliczne: „przy każdym powtórzeniu” (series) albo „tylko tym razem” (brak / task). */
  kind?: PhotoKind
}

/** Wymiary po zmniejszeniu tak, by dłuższy bok ≤ max (bez powiększania). */
export function fitSize(w: number, h: number, max: number): { w: number; h: number } {
  const s = Math.min(1, max / Math.max(w, h))
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) }
}

/** Środkowy kwadrat obrazka (kafelek, miniatura). */
export function squareCrop(w: number, h: number): { sx: number; sy: number; side: number } {
  const side = Math.min(w, h)
  return { sx: Math.round((w - side) / 2), sy: Math.round((h - side) / 2), side }
}

export class PhotoError extends Error {
  readonly reason: 'read' | 'too-big'
  constructor(reason: 'read' | 'too-big') {
    super(reason === 'read' ? 'Nie udało się wczytać zdjęcia' : 'Zdjęcie jest za duże')
    this.reason = reason
  }
}

/** Coraz niższa jakość, aż plik zmieści się w limicie. */
export async function encodeWithin(
  encode: (quality: number) => Promise<Blob>,
  limit: number,
  qualities: readonly number[] = [0.8, 0.7, 0.6, 0.5, 0.4, 0.3],
): Promise<Blob> {
  for (const q of qualities) {
    const blob = await encode(q)
    if (blob.size <= limit) return blob
  }
  throw new PhotoError('too-big')
}

export function toBase64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

const bytesOf = async (b: Blob) => new Uint8Array(await b.arrayBuffer())

/** Obrazek z pliku albo adresu – przeglądarka sama obraca zdjęcie wg danych z aparatu (EXIF). */
async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image()
  img.src = src
  try {
    await img.decode()
  } catch {
    throw new PhotoError('read')
  }
  return img
}

function draw(
  img: HTMLImageElement,
  w: number,
  h: number,
  crop?: { sx: number; sy: number; side: number },
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new PhotoError('read')
  ctx.imageSmoothingQuality = 'high'
  if (crop) ctx.drawImage(img, crop.sx, crop.sy, crop.side, crop.side, 0, 0, w, h)
  else ctx.drawImage(img, 0, 0, w, h)
  return canvas
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new PhotoError('read'))), type, quality),
  )

let webpOk: boolean | undefined
/** Czy przeglądarka zapisuje WebP (Safari < 16 – nie; wtedy toBlob daje PNG). */
async function photoType(): Promise<PhotoType> {
  if (webpOk === undefined) {
    const c = document.createElement('canvas')
    c.width = c.height = 1
    try {
      webpOk = (await toBlob(c, 'image/webp', 0.8)).type === 'image/webp'
    } catch {
      webpOk = false
    }
  }
  return webpOk ? 'image/webp' : 'image/jpeg'
}

let counter = 0

/** Plik z aparatu / galerii → wersja pełna, kafelek i miniatura. */
export async function preparePhoto(file: Blob): Promise<PreparedPhoto> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const W = img.naturalWidth
    const H = img.naturalHeight
    if (!W || !H) throw new PhotoError('read')
    const type = await photoType()
    const size = fitSize(W, H, PHOTO_SIZES.full)
    const fullCanvas = draw(img, size.w, size.h)
    const crop = squareCrop(W, H)
    const tileCanvas = draw(img, PHOTO_SIZES.tile, PHOTO_SIZES.tile, crop)
    const thumbCanvas = draw(img, PHOTO_SIZES.thumb, PHOTO_SIZES.thumb, crop)
    const [full, tile, thumb] = await Promise.all([
      encodeWithin((q) => toBlob(fullCanvas, type, q), PHOTO_LIMITS.fullBytes),
      encodeWithin((q) => toBlob(tileCanvas, type, q), PHOTO_LIMITS.tileBytes),
      encodeWithin((q) => toBlob(thumbCanvas, type, q), PHOTO_LIMITS.thumbBytes),
    ])
    const tileBytes = await bytesOf(tile)
    return {
      key: `nowe-${++counter}`,
      type,
      full: await bytesOf(full),
      tile: tileBytes,
      thumb: toBase64(await bytesOf(thumb)),
      tileUrl: `data:${type};base64,${toBase64(tileBytes)}`,
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Miniatura na listę z kafelka (gdy pierwsze zdjęcie zostało usunięte). */
export async function thumbFromTile(tileUrl: string): Promise<string> {
  const img = await loadImage(tileUrl)
  const type = await photoType()
  const canvas = draw(
    img,
    PHOTO_SIZES.thumb,
    PHOTO_SIZES.thumb,
    squareCrop(img.naturalWidth, img.naturalHeight),
  )
  const blob = await encodeWithin((q) => toBlob(canvas, type, q), PHOTO_LIMITS.thumbBytes)
  return toBase64(await bytesOf(blob))
}

/**
 * Przycięcie zdjęcia do ramki (ułamki obrazka) – wynik w wysokiej jakości; potem i tak
 * przechodzi przez preparePhoto (zmniejszanie do 1080 px, kafelek, miniatura).
 */
export async function cropImage(source: Blob, rect: CropRect): Promise<Blob> {
  const url = URL.createObjectURL(source)
  try {
    const img = await loadImage(url)
    const { sx, sy, sw, sh } = cropPixels(rect, img.naturalWidth, img.naturalHeight)
    const canvas = document.createElement('canvas')
    canvas.width = sw
    canvas.height = sh
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new PhotoError('read')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
    return await toBlob(canvas, 'image/jpeg', 0.95)
  } finally {
    URL.revokeObjectURL(url)
  }
}
