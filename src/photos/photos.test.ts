import { describe, expect, test } from 'vitest'
import { mockTasks } from '../data/mock.ts'
import {
  canAddPhoto,
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
