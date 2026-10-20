// Porównywanie list (zadań, wydarzeń…) po id – dla zapisu różnic do Firestore i dla „Cofnij”.

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
 * „Cofnij”: przywraca tylko to, co zmieniła akcja (`before` → `after`). Wszystko inne – np. zmiana
 * domownika albo drugiego telefonu z tych kilku sekund – zostaje takie, jak jest teraz (`current`).
 */
export function revertChanges<T extends WithId>(current: T[], before: T[], after: T[]): T[] {
  const { upserts, deletes } = diffById(before, after)
  const touched = new Set([...upserts.map((x) => x.id), ...deletes])
  if (!touched.size) return current
  const old = new Map(before.map((x) => [x.id, x]))
  const result: T[] = []
  for (const x of current) {
    if (!touched.has(x.id)) result.push(x)
    // zmienione akcją – wersja sprzed akcji; dodane akcją – znika
    else if (old.has(x.id)) result.push(old.get(x.id)!)
    touched.delete(x.id)
  }
  // usunięte akcją (już ich nie ma na liście) – wracają
  for (const id of touched) if (old.has(id)) result.push(old.get(id)!)
  return result
}
