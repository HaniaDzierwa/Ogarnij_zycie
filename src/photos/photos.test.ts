import { describe, expect, test } from 'vitest'
import { mockTasks } from '../data/mock.ts'
import {
  canAddPhoto,
  photosOfGoneTasks,
  draftBytes,
  planPhotos,
  seriesOf,
  visibleTiles,
  type PhotoDraft,
  type TaskPhoto,
} from './draft.ts'
import {
  encodeWithin,
  fitSize,
  PhotoError,
  squareCrop,
  toBase64,
  type PreparedPhoto,
} from './resize.ts'
import { photoFieldsAfter, withPhotoFields } from './taskFields.ts'
import { formatMB } from './usage.ts'
import { cropPixels, dragRect, FULL_RECT, isFullRect, MIN_CROP } from './crop.ts'

const saved = (id: string, slot: number, kind: TaskPhoto['kind'] = 'task'): TaskPhoto => ({
  id,
  kind,
  slot,
  size: 1000,
  type: 'image/webp',
  tileUrl: `url-${id}`,
  createdBy: 'hania',
  place: { houseId: 'dom1' },
})
const added = (key: string): PreparedPhoto => ({
  key,
  type: 'image/webp',
  full: new Uint8Array(900),
  tile: new Uint8Array(100),
  thumb: `mini-${key}`,
  tileUrl: `url-${key}`,
})
const draft = (over: Partial<PhotoDraft> = {}): PhotoDraft => ({ added: [], removed: [], ...over })

describe('zmniejszanie', () => {
  test('dłuższy bok do 1080 px, bez powiększania małych', () => {
    expect(fitSize(4032, 3024, 1080)).toEqual({ w: 1080, h: 810 })
    expect(fitSize(3024, 4032, 1080)).toEqual({ w: 810, h: 1080 })
    expect(fitSize(800, 600, 1080)).toEqual({ w: 800, h: 600 })
  })

  test('kafelek i miniatura – środkowy kwadrat', () => {
    expect(squareCrop(4000, 3000)).toEqual({ sx: 500, sy: 0, side: 3000 })
    expect(squareCrop(3000, 4000)).toEqual({ sx: 0, sy: 500, side: 3000 })
  })

  test('jakość w dół, aż plik zmieści się w limicie; za duży – błąd', async () => {
    const sizes: number[] = []
    const encode = async (q: number) => {
      sizes.push(q)
      return new Blob([new Uint8Array(Math.round(q * 1000))])
    }
    expect((await encodeWithin(encode, 650)).size).toBe(600)
    expect(sizes).toEqual([0.8, 0.7, 0.6])
    await expect(encodeWithin(encode, 10)).rejects.toBeInstanceOf(PhotoError)
  })

  test('base64', () => {
    expect(toBase64(new Uint8Array([1, 2, 3]))).toBe('AQID')
  })
})

describe('zdjęcia w arkuszu – kopia robocza', () => {
  test('widać zapisane (seria najpierw, bez usuniętych) i nowe; razem najwyżej 5', () => {
    const list = [saved('z1_1', 1), saved('z1_0', 0), saved('s_s0', 0, 'series')]
    const d = draft({ removed: ['z1_1'], added: [added('a')] })
    expect(visibleTiles(list, d).map((t) => t.key)).toEqual(['s_s0', 'z1_0', 'a'])
    expect(canAddPhoto(list, d)).toBe(true)
    expect(canAddPhoto(list, d, 2)).toBe(false)
    expect(draftBytes(list, d)).toBe(1000 - 1000)
  })

  test('nowe zdjęcia na wolne miejsca 0–4 (seria ma własne miejsca)', () => {
    const list = [saved('z1_0', 0), saved('z1_2', 2), saved('s_s1', 1, 'series')]
    const plan = planPhotos(list, draft({ removed: ['z1_2'], added: [added('a'), added('b')] }))
    expect(plan.removes.map((p) => p.id)).toEqual(['z1_2'])
    expect(plan.adds.map((a) => a.slot)).toEqual([1, 2])
    expect(plan.count).toBe(4)
    expect(plan.first?.key).toBe('s_s1')
  })

  test('zadanie cykliczne: osobne miejsca dla serii; zdjęcia serii pierwsze; liczba serii', () => {
    const list = [saved('z1_0', 0), saved('s_s0', 0, 'series')]
    const plan = planPhotos(list, draft({ added: [{ ...added('a'), kind: 'series' }, added('b')] }))
    expect(plan.adds.map((a) => [a.kind, a.slot])).toEqual([
      ['series', 1],
      ['task', 1],
    ])
    expect(plan.count).toBe(4)
    expect(plan.seriesCount).toBe(2)
    expect(
      visibleTiles(list, draft({ added: [{ ...added('a'), kind: 'series' }] })).map((t) => t.key),
    ).toEqual(['s_s0', 'a', 'z1_0'])
  })

  test('seria: pole seriesId albo id zadania', () => {
    expect(seriesOf({ id: 'z1' })).toBe('z1')
    expect(seriesOf({ id: 'z2', seriesId: 'z1' })).toBe('z1')
  })
})

describe('liczba zdjęć i miniatura przy zadaniu', () => {
  const task = { ...mockTasks('2026-10-09')[0], photos: 1, thumb: 'stara' }
  const fromTile = async (url: string) => `z-${url}`

  test('pierwsze nowe – jego miniatura; pierwsze zapisane bez zmian – stara miniatura', async () => {
    expect(await photoFieldsAfter(task, [], draft({ added: [added('a')] }), fromTile)).toEqual({
      photos: 1,
      thumb: 'mini-a',
    })
    expect(
      await photoFieldsAfter(task, [saved('z1_0', 0)], draft({ added: [added('a')] }), fromTile),
    ).toEqual({ photos: 2, thumb: 'stara' })
  })

  test('usunięte pierwsze – miniatura z kafelka następnego; wszystkie usunięte – bez pól', async () => {
    const list = [saved('z1_0', 0), saved('z1_1', 1)]
    expect(await photoFieldsAfter(task, list, draft({ removed: ['z1_0'] }), fromTile)).toEqual({
      photos: 1,
      thumb: 'z-url-z1_1',
    })
    const none = await photoFieldsAfter(task, list, draft({ removed: ['z1_0', 'z1_1'] }), fromTile)
    const t = withPhotoFields(task, none)
    expect('photos' in t || 'thumb' in t).toBe(false)
  })
})

describe('miejsce na zdjęcia', () => {
  test('MB po polsku: z przecinkiem do 10 MB, potem pełne', () => {
    expect(formatMB(0)).toBe('0 MB')
    expect(formatMB(3.44 * 1024 * 1024)).toBe('3,4 MB')
    expect(formatMB(12.6 * 1024 * 1024)).toBe('13 MB')
    expect(formatMB(150 * 1024 * 1024)).toBe('150 MB')
  })
})

describe('zdjęcia zadań usuniętych na zawsze', () => {
  const base = mockTasks('2026-10-09')[0]
  const task = (id: string, over: Partial<typeof base> = {}) => ({
    ...base,
    id,
    photos: 1,
    ...over,
  })

  test('usunięte ze zdjęciami – tak; bez zdjęć albo przeniesione do „Tylko ja” – nie', () => {
    const a = task('a')
    const b = task('b', { photos: undefined })
    const c = task('c')
    const res = photosOfGoneTasks([a, b, c], [{ ...c, private: true }])
    expect(res.map((r) => [r.task.id, r.series])).toEqual([['a', 'a']])
  })

  test('zdjęcia serii zostają, póki jest inne zadanie z serii', () => {
    const done = task('a1', { seriesId: 's' })
    const next = task('a2', { seriesId: 's' })
    expect(photosOfGoneTasks([done, next], [next])[0].series).toBeNull()
    expect(photosOfGoneTasks([done], [])[0].series).toBe('s')
  })
})

describe('przycinanie – ramka', () => {
  test('przesuwanie w obrębie zdjęcia', () => {
    const r = { x: 0.2, y: 0.2, w: 0.5, h: 0.5 }
    expect(dragRect(r, 'move', 0.1, -0.05)).toEqual({
      x: 0.30000000000000004,
      y: 0.15000000000000002,
      w: 0.5,
      h: 0.5,
    })
    expect(dragRect(r, 'move', 0.9, 0.9)).toEqual({ x: 0.5, y: 0.5, w: 0.5, h: 0.5 })
  })

  test('róg zmienia rozmiar, przeciwny stoi; co najmniej 10%', () => {
    const r = dragRect(FULL_RECT, 'se', -0.4, -0.3)
    expect(r.x).toBe(0)
    expect(r.w).toBeCloseTo(0.6)
    expect(r.h).toBeCloseTo(0.7)
    const tiny = dragRect(FULL_RECT, 'nw', 0.99, 0.99)
    expect(tiny.w).toBeCloseTo(MIN_CROP)
    expect(tiny.x + tiny.w).toBeCloseTo(1)
    expect(isFullRect(FULL_RECT)).toBe(true)
    expect(isFullRect(r)).toBe(false)
  })

  test('piksele obrazka', () => {
    expect(cropPixels({ x: 0.25, y: 0, w: 0.5, h: 1 }, 4000, 3000)).toEqual({
      sx: 1000,
      sy: 0,
      sw: 2000,
      sh: 3000,
    })
  })
})
