import { useEffect, useRef } from 'react'
import { autoCleanup } from '../screens/tasks/tasksView.ts'
import { useHouse } from '../house/house.ts'
import { useStore } from './store.ts'

/**
 * Zapasowe sprzątanie przy uruchomieniu (raz na otwarcie aplikacji i dom, gdy dane są wczytane):
 * ogarnięte starsze niż ustawienie z Porządków – do Kosza; z Kosza na zawsze po 30 dniach.
 * Na co dzień robi to Worker raz dziennie (etap 6, krok 4).
 */
export function AutoCleanup() {
  const store = useStore()
  const houseId = useHouse().profile?.houseId ?? null
  const doneFor = useRef<string | null>(null)
  useEffect(() => {
    if (!houseId || !store.ready || doneFor.current === houseId) return
    doneFor.current = houseId
    const result = autoCleanup(
      store.tasks,
      store.events,
      store.today,
      store.cleanupDays,
      store.who(),
    )
    if (!result) return
    store.setTasks(() => result.tasks)
    store.setEvents(() => result.events)
  }, [store, houseId])
  return null
}
