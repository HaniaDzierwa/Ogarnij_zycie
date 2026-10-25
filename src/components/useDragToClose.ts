import { useEffect, useRef } from 'react'

/** Ile przeciągnąć w dół, żeby arkusz się zwinął (albo krócej, ale szybkim ruchem). */
export const CLOSE_DISTANCE = 110
const FLICK_SPEED = 0.6 // px/ms
const START_AFTER = 6

/**
 * Przeciągnięcie arkusza w dół zwija go (uwaga Hani 2026-10-25). Działa, gdy treść arkusza jest
 * przewinięta na samą górę – inaczej ruch w dół przewija treść. Arkusz jedzie za palcem; po
 * puszczeniu za blisko wraca na miejsce. Zwraca ref do elementu arkusza.
 */
export function useDragToClose<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null)
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let startY: number | null = null
    let startT = 0
    let dy = 0
    let dragging = false

    const move = (to: number, animate: boolean) => {
      el.style.transition = animate ? 'transform 200ms ease-out' : 'none'
      el.style.transform = to ? `translateY(${to}px)` : ''
    }
    const onStart = (e: TouchEvent) => {
      // pola tekstowe przewijają się same; arkusz przewinięty niżej – ruch przewija treść
      const target = e.target as HTMLElement
      if (el.scrollTop > 0 || target.closest('textarea')) return
      startY = e.touches[0].clientY
      startT = e.timeStamp
      dy = 0
      dragging = false
    }
    const onMove = (e: TouchEvent) => {
      if (startY === null) return
      dy = e.touches[0].clientY - startY
      if (!dragging) {
        if (dy < 0) {
          startY = null // ruch w górę – zwykłe przewijanie
          return
        }
        if (dy < START_AFTER) return
        dragging = true
      }
      if (e.cancelable) e.preventDefault()
      move(Math.max(0, dy), false)
    }
    const onEnd = (e: TouchEvent) => {
      if (startY === null) return
      startY = null
      if (!dragging) return
      dragging = false
      const speed = dy / Math.max(1, e.timeStamp - startT)
      move(0, true)
      if (dy > CLOSE_DISTANCE || (dy > 40 && speed > FLICK_SPEED)) close.current()
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    // nie pasywny – w trakcie przeciągania blokujemy przewijanie strony pod spodem
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [])

  return ref
}
