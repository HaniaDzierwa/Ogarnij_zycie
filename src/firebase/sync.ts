// Zapis zmian list do Firestore: ekrany podają nową wersję listy, a my wysyłamy tylko różnice.

import { doc, writeBatch, type Firestore } from 'firebase/firestore'
import { diffById } from '../data/listDiff.ts'

type WithId = { id: string }

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
