import { describe, expect, test } from 'vitest'
import { firestore } from './firestore.ts'

describe('zdjęcia w Workerze (etap 9)', () => {
  test('usunięcie zdjęć: kafelek, pełna wersja i oba liczniki w dół jedną paczką', async () => {
    const calls: { url: string; body: unknown }[] = []
    const fetchFn = (async (url: string, init?: RequestInit) => {
      calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null })
      return new Response('{}', { status: 200 })
    }) as typeof fetch
    const db = firestore('p', async () => 'tok', fetchFn)
    await db.removePhotos('d', 'houses/d', [
      { id: 'z1_0', size: 1000 },
      { id: 'z1_1', size: 500 },
    ])
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toMatch(/documents:commit$/)
    const writes = (calls[0].body as { writes: Record<string, unknown>[] }).writes
    const root = 'projects/p/databases/(default)/documents'
    expect(writes.slice(0, 4)).toEqual([
      { delete: `${root}/houses/d/photos/z1_0` },
      { delete: `${root}/houses/d/photoFull/z1_0` },
      { delete: `${root}/houses/d/photos/z1_1` },
      { delete: `${root}/houses/d/photoFull/z1_1` },
    ])
    expect(writes[4]).toMatchObject({
      update: { name: `${root}/houses/d` },
      updateTransforms: [{ fieldPath: 'photoBytes', increment: { integerValue: '-1500' } }],
      currentDocument: { exists: true },
    })
    expect(writes[5]).toMatchObject({ update: { name: `${root}/meta/photos` } })
    // nic do usunięcia – bez zapytania
    await db.removePhotos('d', 'houses/d', [])
    expect(calls).toHaveLength(1)
  })

  test('zdjęcia zadania: zapytanie bez kafelka', async () => {
    let body: { structuredQuery: Record<string, unknown> } | null = null
    const fetchFn = (async (_url: string, init?: RequestInit) => {
      body = JSON.parse(String(init?.body))
      const doc = {
        name: 'projects/p/databases/(default)/documents/houses/d/photos/z1_0',
        fields: { size: { integerValue: '1200' } },
        createTime: '2026-11-20T10:00:00Z',
        updateTime: '2026-11-20T10:00:00Z',
      }
      return new Response(JSON.stringify([{ document: doc }]), { status: 200 })
    }) as typeof fetch
    const db = firestore('p', async () => 'tok', fetchFn)
    expect(await db.photosWhere('houses/d', 'taskId', 'z1')).toEqual([{ id: 'z1_0', size: 1200 }])
    expect(body!.structuredQuery).toMatchObject({
      from: [{ collectionId: 'photos' }],
      select: { fields: [{ fieldPath: 'size' }] },
    })
  })
})

describe('pozostałości usuniętych domów', () => {
  const root = 'projects/p/databases/(default)/documents'

  test('brakujące dokumenty: tylko te bez czasu utworzenia (showMissing)', async () => {
    let url = ''
    const fetchFn = (async (u: string) => {
      url = u
      return new Response(
        JSON.stringify({
          documents: [
            { name: `${root}/houses/stary` },
            { name: `${root}/houses/dom1`, createTime: '2026-10-18T10:00:00Z' },
          ],
        }),
        { status: 200 },
      )
    }) as typeof fetch
    const db = firestore('p', async () => 'tok', fetchFn)
    expect(await db.missingIds('houses')).toEqual(['stary'])
    expect(url).toContain('showMissing=true')
  })

  test('usunięcie kolekcji: same nazwy, usuwane paczką', async () => {
    const bodies: unknown[] = []
    const fetchFn = (async (u: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        bodies.push(JSON.parse(String(init.body)))
        return new Response('{}', { status: 200 })
      }
      expect(u).toContain('mask.fieldPaths=')
      return new Response(
        JSON.stringify({ documents: [{ name: `${root}/a/1` }, { name: `${root}/a/2` }] }),
        { status: 200 },
      )
    }) as typeof fetch
    const db = firestore('p', async () => 'tok', fetchFn)
    expect(await db.removeCollection('a')).toBe(2)
    expect(bodies).toEqual([{ writes: [{ delete: `${root}/a/1` }, { delete: `${root}/a/2` }] }])
  })
})
