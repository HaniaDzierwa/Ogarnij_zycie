import { Bytes } from 'firebase/firestore'
import { describe, expect, test } from 'vitest'
import {
  PHOTO_LIMITS,
  addPhotoOps,
  closeHousePhotosOps,
  deletePhotoOps,
  freeSlot,
  nextPhotoSeq,
  movePhotoOps,
  photoId,
  type PhotoDoc,
  type PhotoOp,
} from './photos.ts'

const bytes = (n: number) => new Uint8Array(n).fill(1)
const dataOf = (op: PhotoOp) => ('data' in op ? op.data : {}) as unknown as PhotoDoc

describe('zdjęcia – id i miejsca', () => {
  test('„tylko tym razem” = {zadanie}_N, „przy każdym powtórzeniu” = {seria}_sN', () => {
    expect(photoId('task', 'z1', 0)).toBe('z1_0')
    expect(photoId('series', 'z1', 4)).toBe('z1_s4')
  })

  test('numer zmiany liczników: photoSeq domu + 1; stary dom bez pola – 1', () => {
    expect(nextPhotoSeq({ photoSeq: 7 })).toBe(8)
    expect(nextPhotoSeq({})).toBe(1)
    expect(nextPhotoSeq(undefined)).toBe(1)
  })

  test('pierwsze wolne miejsce 0–4; pełne – null', () => {
    expect(freeSlot([])).toBe(0)
    expect(freeSlot([0, 1, 3])).toBe(2)
    expect(freeSlot([0, 1, 2, 3, 4])).toBeNull()
  })

  test('limity: 150 MB na dom, 600 MB na aplikację, razem 5 zdjęć', () => {
    expect(PHOTO_LIMITS.houseBytes).toBe(157_286_400)
    expect(PHOTO_LIMITS.appBytes).toBe(629_145_600)
    expect(PHOTO_LIMITS.perTask).toBe(5)
  })
})

describe('zdjęcia – paczki zapisu', () => {
  const opts = {
    place: { houseId: 'dom1' },
    uid: 'hania',
    kind: 'task' as const,
    owner: 'z1',
    slot: 2,
    type: 'image/webp' as const,
    tile: bytes(100),
    full: bytes(900),
    seq: 4,
  }

  test('dodanie: kafelek, pełna wersja i oba liczniki wskazujące zdjęcie', () => {
    const { id, size, ops } = addPhotoOps(opts)
    expect(id).toBe('z1_2')
    expect(size).toBe(1000)
    expect(ops.map((o) => o.path)).toEqual([
      'houses/dom1/photos/z1_2',
      'houses/dom1/photoFull/z1_2',
      'houses/dom1',
      'meta/photos',
    ])
    const photo = dataOf(ops[0])
    expect(photo).toMatchObject({
      kind: 'task',
      taskId: 'z1',
      slot: 2,
      size: 1000,
      createdBy: 'hania',
    })
    expect('seriesId' in photo).toBe(false)
    expect(photo.tile).toBeInstanceOf(Bytes)
    expect(ops[2]).toMatchObject({ data: { photoOp: { uid: '', id: 'z1_2' }, photoSeq: 4 } })
    expect(ops[3]).toMatchObject({ data: { op: { house: 'dom1', seq: 4 } } })
  })

  test('„Tylko ja” – w części prywatnej autora; seria – seriesId', () => {
    const { ops } = addPhotoOps({
      ...opts,
      place: { houseId: 'dom1', privateUid: 'hania' },
      kind: 'series',
      owner: 's1',
    })
    expect(ops[0].path).toBe('houses/dom1/private/hania/photos/s1_s2')
    expect(dataOf(ops[0]).seriesId).toBe('s1')
    expect(ops[2]).toMatchObject({ data: { photoOp: { uid: 'hania', id: 's1_s2' } } })
  })

  test('usunięcie, przeniesienie i zamknięcie domu', () => {
    const del = deletePhotoOps({ houseId: 'dom1' }, 'z1_0', 500, 1)
    expect(del.slice(0, 2).every((o) => 'delete' in o)).toBe(true)
    expect(del).toHaveLength(4)
    const photo = dataOf(addPhotoOps(opts).ops[0])
    const move = movePhotoOps(
      { houseId: 'dom1' },
      { houseId: 'dom1', privateUid: 'hania' },
      'z1_2',
      photo,
      { full: Bytes.fromUint8Array(bytes(3)) },
    )
    expect(move.map((o) => o.path)).toEqual([
      'houses/dom1/private/hania/photos/z1_2',
      'houses/dom1/private/hania/photoFull/z1_2',
      'houses/dom1/photos/z1_2',
      'houses/dom1/photoFull/z1_2',
    ])
    expect(closeHousePhotosOps('dom1', 10, 2)[0]).toMatchObject({
      data: { photoBytes: 0, photoOp: { closing: true }, photoSeq: 2 },
    })
  })
})
