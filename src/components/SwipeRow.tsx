import { useRef, useState, type ReactNode } from 'react'

export type SwipeAction = {
  label: string
  icon: ReactNode
  bg: string
  fg: string
  /** Dla czytników ekranu: ukryty przycisk zamiast gestu (pomiń, gdy akcja ma już widoczny przycisk). */
  srLabel?: string
  run: () => void
}

type Props = {
  children: ReactNode
  /** Przeciągnięcie w prawo – tło odsłania się z lewej. */
  right: SwipeAction
  /** Przeciągnięcie w lewo – tło odsłania się z prawej. */
  left: SwipeAction
  /** Tło wiersza (zasłania akcje pod spodem). */
  background?: string
}

const START = 8 // px ruchu, od którego rozpoznajemy gest poziomy
const THRESHOLD = 90
const MAX = 150

/**
 * Wiersz z gestami (DESIGN.md → Lista zadań – interakcje): ruch poziomy po 8 px, przewijanie
 * pionowe ma pierwszeństwo, akcja po przekroczeniu ~90 px, po przeciągnięciu klik nie działa.
 */
export function SwipeRow({ children, right, left, background = '#FFFFFF' }: Props) {
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ x: number; y: number; id: number } | null>(null)
  const mode = useRef<'none' | 'swipe' | 'scroll'>('none')
  const dxRef = useRef(0)
  const suppressClick = useRef(false)

  const reset = () => {
    start.current = null
    mode.current = 'none'
    dxRef.current = 0
    setDragging(false)
    setDx(0)
  }

  const action = dx > 0 ? right : dx < 0 ? left : null
  const passed = Math.abs(dx) >= THRESHOLD

  return (
    <div
      style={{ position: 'relative', overflow: 'hidden' }}
      onClickCapture={(e) => {
        if (suppressClick.current) {
          suppressClick.current = false
          e.stopPropagation()
          e.preventDefault()
        }
      }}
    >
      {action && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: dx > 0 ? 'flex-start' : 'flex-end',
            padding: '0 22px',
            background: action.bg,
            color: action.fg,
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 15,
              fontWeight: 800,
              flexDirection: dx > 0 ? 'row' : 'row-reverse',
              transition: 'transform 150ms ease',
              transform: passed ? 'scale(1.08)' : 'scale(1)',
            }}
          >
            {action.icon}
            {action.label}
          </span>
        </div>
      )}
      <div
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return
          start.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
          mode.current = 'none'
        }}
        onPointerMove={(e) => {
          const s = start.current
          if (!s || s.id !== e.pointerId) return
          const mx = e.clientX - s.x
          const my = e.clientY - s.y
          if (mode.current === 'none') {
            if (Math.abs(mx) < START && Math.abs(my) < START) return
            if (Math.abs(my) > Math.abs(mx)) {
              mode.current = 'scroll'
              return
            }
            mode.current = 'swipe'
            setDragging(true)
            e.currentTarget.setPointerCapture?.(e.pointerId)
          }
          if (mode.current !== 'swipe') return
          const clamped = Math.max(-MAX, Math.min(MAX, mx))
          if (Math.abs(clamped) >= THRESHOLD && Math.abs(dxRef.current) < THRESHOLD) {
            navigator.vibrate?.(10)
          }
          dxRef.current = clamped
          setDx(clamped)
        }}
        onPointerUp={() => {
          if (mode.current !== 'swipe') return reset()
          suppressClick.current = true
          setTimeout(() => (suppressClick.current = false), 60)
          const final = dxRef.current
          reset()
          if (final >= THRESHOLD) right.run()
          else if (final <= -THRESHOLD) left.run()
        }}
        onPointerCancel={reset}
        style={{
          position: 'relative',
          background,
          touchAction: 'pan-y',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          transform: `translateX(${dx}px)`,
          transition: dragging ? 'none' : 'transform 180ms ease',
        }}
      >
        {children}
      </div>
      {[right, left]
        .filter((a) => a.srLabel)
        .map((a) => (
          <button key={a.srLabel} type="button" className="sr-only" onClick={a.run}>
            {a.srLabel}
          </button>
        ))}
    </div>
  )
}
