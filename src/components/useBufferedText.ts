import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Pole tekstowe zapisywane „po chwili”: na ekranie zmiana od razu, do bazy po `delay` ms przerwy
 * w pisaniu (zamiast zapisu po każdej literze), a najpóźniej przy `flush()` / zamknięciu ekranu.
 * Gdy nic nie piszemy, pole pokazuje bieżącą wartość z bazy (np. zmianę z drugiego telefonu).
 */
export function useBufferedText(value: string, commit: (v: string) => void, delay = 500) {
  const [draft, setDraft] = useState<string | null>(null)
  const pending = useRef<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const commitRef = useRef(commit)
  useEffect(() => {
    commitRef.current = commit
  })

  /** Zapisz od razu to, co czeka. */
  const flush = useCallback(() => {
    clearTimeout(timer.current)
    const v = pending.current
    if (v === null) return
    pending.current = null
    commitRef.current(v)
    setDraft(null)
  }, [])

  /** Porzuć to, co czeka (np. pusta nazwa – wraca poprzednia). */
  const discard = useCallback(() => {
    clearTimeout(timer.current)
    pending.current = null
    setDraft(null)
  }, [])

  const change = useCallback(
    (v: string) => {
      pending.current = v
      setDraft(v)
      clearTimeout(timer.current)
      timer.current = setTimeout(flush, delay)
    },
    [flush, delay],
  )

  // zamknięcie arkusza / wyjście z ekranu albo schowanie aplikacji – nic nie ginie
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && flush()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [flush])

  return { text: draft ?? value, change, flush, discard }
}
