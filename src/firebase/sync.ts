// Zapis zmian list do Firestore: ekrany podają nową wersję listy, a my wysyłamy tylko różnice.

import { doc, writeBatch, type Firestore } from 'firebase/firestore'

type WithId = { id: string }

/** Co zapisać (nowe i zmienione) i co usunąć na zawsze (zniknęło z listy). */
export function diffById<T extends WithId>(
  prev: T[],
  next: T[],
): { upserts: T[]; deletes: string[] } {
  const before = new Map(prev.map((x) => [x.id, x]))
  const upserts: T[] = []
  for (const x of next) {
    const old = before.get(x.id)
    if (!old || JSON.stringify(old) !== JSON.stringify(x)) upserts.push(x)
    before.delete(x.id)
  }
  return { upserts, deletes: [...before.keys()] }
}

/**
 * Zapisuje różnice jednym zapisem (writeBatch). Nie czeka na serwer: Firestore pokazuje zmianę od razu
 * z pamięci telefonu, a bez internetu wyśle ją, gdy wróci. Błąd (np. reguły) – `onError`.
 */
export function syncCollection<T extends WithId>(opts: {
  db: Firestore
  path: string
  prev: T[]
  next: T[]
  toDoc: (item: T) => Record<string, unknown>
  onError: (e: unknown) => void
}): void {
  const { upserts, deletes } = diffById(opts.prev, opts.next)
  if (!upserts.length && !deletes.length) return
  const batch = writeBatch(opts.db)
  for (const x of upserts) batch.set(doc(opts.db, opts.path, x.id), opts.toDoc(x))
  for (const id of deletes) batch.delete(doc(opts.db, opts.path, id))
  batch.commit().catch(opts.onError)
}
