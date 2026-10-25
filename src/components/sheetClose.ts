import { createContext, useContext } from 'react'

/**
 * Zamknięcie arkusza z animacją (zjazd w dół + wygaszenie tła – uwaga Hani 2026-10-25):
 * `close(after)` animuje, a po animacji wywołuje `after` (np. zapis nowego zadania) albo
 * zwykłe zamknięcie arkusza.
 */
export const SheetCloseContext = createContext<((after?: () => void) => void) | null>(null)

/** Przyciski w arkuszu („Gotowe”, „Ogarnij”, „Dodaj zadanie”) – zamykają z animacją. */
export function useSheetClose(): (after?: () => void) => void {
  const close = useContext(SheetCloseContext)
  return close ?? ((after) => after?.())
}

/** Czas zjazdu arkusza; w testach od razu (bez czekania). */
export const SHEET_EXIT_MS = import.meta.env.MODE === 'test' ? 0 : 220

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
