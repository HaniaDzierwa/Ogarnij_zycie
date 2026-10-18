import { useRef, useState, type ReactNode } from 'react'
import { colors, priorities } from '../theme'

type Props = {
  children: ReactNode
  /** Przesunięcie w lewo (odsłania „Edytuj” z prawej). */
  onSwipeLeft: () => void
  /** Przesunięcie w prawo (odsłania „Usuń” z lewej). */
  onSwipeRight: () => void
  /** Tło wiersza (zasłania podpowiedzi pod spodem). */
  background?: string
  /** Etykiety dla czytników ekranu – gesty mają też ukryte przyciski. */
  editLabel: string
  deleteLabel: string
}

const START = 8 // px ruchu, od którego rozpoznajemy gest poziomy

/**
 * Wiersz z gestami: w lewo → edycja, w prawo → usunięcie.
 * Pod spodem podpowiedzi, które po przekroczeniu progu zmieniają się na „Puść, aby …”.
 */
export function SwipeRow({
  children,
  onSwipeLeft,
  onSwipeRight,
  background = colors.white,
  editLabel,
  deleteLabel,
}: Props) {
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ x: number; y: number; id: number } | null>(null)
  const mode = useRef<'none' | 'swipe' | 'scroll'>('none')
  const [width, setWidth] = useState(358)
  const suppressClick = useRef(false)
  const passedRef = useRef(false)
  /** Ostatnie przesunięcie – czytane przy puszczeniu (stan może być jeszcze nieodświeżony). */
  const dxRef = useRef(0)

  const threshold = () => Math.min(120, width * 0.35)
  const passed = Math.abs(dx) >= threshold()

  const reset = () => {
    start.current = null
    mode.current = 'none'
    setDragging(false)
    setDx(0)
    passedRef.current = false
    dxRef.current = 0
  }

  return (
    <div
      style={{ position: 'relative', overflow: 'hidden', touchAction: 'pan-y' }}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return
        start.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
        mode.current = 'none'
        setWidth(e.currentTarget.getBoundingClientRect().width || 358)
      }}
      onPointerMove={(e) => {
        const s = start.current
        if (!s || s.id !== e.pointerId) return
        const mx = e.clientX - s.x
        const my = e.clientY - s.y
        if (mode.current === 'none') {
          if (Math.abs(my) > START && Math.abs(my) > Math.abs(mx)) {
            mode.current = 'scroll'
            return
          }
          if (Math.abs(mx) > START && Math.abs(mx) > Math.abs(my)) {
            mode.current = 'swipe'
            setDragging(true)
            e.currentTarget.setPointerCapture?.(e.pointerId)
          }
        }
        if (mode.current !== 'swipe') return
        // opór za progiem
        const t = threshold()
        const eased = Math.abs(mx) > t ? Math.sign(mx) * (t + (Math.abs(mx) - t) * 0.35) : mx
        const nowPassed = Math.abs(mx) >= t
        if (nowPassed && !passedRef.current) navigator.vibrate?.(10)
        passedRef.current = nowPassed
        dxRef.current = eased
        setDx(eased)
      }}
      onPointerUp={(e) => {
        if (mode.current === 'swipe') {
          suppressClick.current = true
          const done = passedRef.current
          const left = dxRef.current < 0
          reset()
          if (done) (left ? onSwipeLeft : onSwipeRight)()
          e.preventDefault()
        } else reset()
      }}
      onPointerCancel={reset}
      onClickCapture={(e) => {
        if (suppressClick.current) {
          suppressClick.current = false
          e.stopPropagation()
          e.preventDefault()
        }
      }}
    >
      {dx !== 0 && <Hint side={dx > 0 ? 'delete' : 'edit'} passed={passed} />}
      <div
        style={{
          position: 'relative',
          background,
          transform: `translateX(${dx}px)`,
          transition: dragging ? 'none' : 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        {children}
      </div>
      <button type="button" className="sr-only" onClick={onSwipeLeft}>
        {editLabel}
      </button>
      <button type="button" className="sr-only" onClick={onSwipeRight}>
        {deleteLabel}
      </button>
    </div>
  )
}

/** Podpowiedź pod wierszem: co się stanie po dokończeniu gestu (ikona nad krótkim napisem). */
function Hint({ side, passed }: { side: 'edit' | 'delete'; passed: boolean }) {
  const del = side === 'delete'
  const bg = del
    ? passed
      ? priorities.high.line
      : priorities.high.bg
    : passed
      ? colors.green900
      : colors.successBg
  const fg = del
    ? passed
      ? colors.white
      : priorities.high.fg
    : passed
      ? colors.brass300
      : colors.green900
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: del ? 'flex-start' : 'flex-end',
        background: bg,
        color: fg,
        transition: 'background 150ms ease, color 150ms ease',
      }}
    >
      <div
        style={{
          width: 112,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          textAlign: 'center',
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.4px',
          lineHeight: 1.25,
        }}
      >
        <span
          style={{
            display: 'flex',
            transition: 'transform 150ms ease',
            transform: passed ? 'scale(1.2)' : 'scale(1)',
          }}
        >
          {del ? <TrashIcon /> : <PencilIcon />}
        </span>
        {passed ? (
          <span>
            Puść, aby
            <br />
            {del ? 'usunąć' : 'edytować'}
          </span>
        ) : (
          <span>{del ? 'Usuń' : 'Edytuj'}</span>
        )}
      </div>
    </div>
  )
}

function TrashIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  )
}
