// Przycinanie zdjęcia (poprawka Hani 2026-11-20): ramka w ułamkach obrazka (0–1), przesuwana
// i rozciągana za rogi. Czyste funkcje – bez obrazka.

export type CropRect = { x: number; y: number; w: number; h: number }
export type CropHandle = 'move' | 'nw' | 'ne' | 'sw' | 'se'

export const FULL_RECT: CropRect = { x: 0, y: 0, w: 1, h: 1 }
/** Najmniejsza ramka – 10% boku. */
export const MIN_CROP = 0.1

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * Ramka po przeciągnięciu (dx, dy – przesunięcie palca w ułamkach obrazka): `move` przesuwa całą
 * ramkę, róg – zmienia rozmiar (przeciwny róg stoi w miejscu). Zawsze w obrazku i ≥ 10% boku.
 */
export function dragRect(r: CropRect, handle: CropHandle, dx: number, dy: number): CropRect {
  if (handle === 'move')
    return { ...r, x: clamp(r.x + dx, 0, 1 - r.w), y: clamp(r.y + dy, 0, 1 - r.h) }
  let left = r.x
  let top = r.y
  let right = r.x + r.w
  let bottom = r.y + r.h
  if (handle === 'nw' || handle === 'sw') left = clamp(left + dx, 0, right - MIN_CROP)
  if (handle === 'ne' || handle === 'se') right = clamp(right + dx, left + MIN_CROP, 1)
  if (handle === 'nw' || handle === 'ne') top = clamp(top + dy, 0, bottom - MIN_CROP)
  if (handle === 'sw' || handle === 'se') bottom = clamp(bottom + dy, top + MIN_CROP, 1)
  return { x: left, y: top, w: right - left, h: bottom - top }
}

/** Czy ramka to całe zdjęcie (wtedy „Gotowe” nic nie zmienia). */
export const isFullRect = (r: CropRect) => r.x < 0.001 && r.y < 0.001 && r.w > 0.999 && r.h > 0.999

/** Obszar w pikselach obrazka (zaokrąglony, co najmniej 1 px). */
export function cropPixels(r: CropRect, width: number, height: number) {
  const sx = Math.round(r.x * width)
  const sy = Math.round(r.y * height)
  return {
    sx,
    sy,
    sw: Math.max(1, Math.min(width - sx, Math.round(r.w * width))),
    sh: Math.max(1, Math.min(height - sy, Math.round(r.h * height))),
  }
}
