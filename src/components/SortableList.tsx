import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { colors } from '../theme'
import { GripIcon } from './icons.tsx'

type Props<T extends { id: string }> = {
  items: T[]
  /** Element `id` ma stanąć na miejscu `to` (indeks w liście bez niego). */
  onMove: (id: string, to: number) => void
  /** Treść wiersza (bez uchwytu). */
  renderItem: (item: T) => ReactNode
  /** Podpis uchwytu dla czytnika ekranu, np. „Przesuń: Auto”. */
  handleLabel: (item: T) => string
  /** Czy wiersz ma uchwyt (np. wbudowane priorytety – nie); domyślnie każdy. */
  canDrag?: (item: T) => boolean
}

/** Wysokość wiersza, gdy nie da się jej zmierzyć (testy). */
const FALLBACK_HEIGHT = 64

type Drag = { id: string; from: number; startY: number; heights: number[]; pointerId: number }

/**
 * Lista z przeciąganiem: wiersz chwyta się za uchwyt ⋮⋮ po prawej i przesuwa w górę / w dół,
 * pozostałe wiersze (także te bez uchwytu) robią miejsce. Strzałki ↑ ↓ na uchwycie – to samo
 * z klawiatury.
 */
export function SortableList<T extends { id: string }>({
  items,
  onMove,
  renderItem,
  handleLabel,
  canDrag = () => true,
}: Props<T>) {
  const rows = useRef<(HTMLDivElement | null)[]>([])
  const [drag, setDrag] = useState<Drag | null>(null)
  const [dy, setDy] = useState(0)
  const dragId = drag?.id ?? null

  const targetOf = (d: Drag, offset: number) => {
    const tops = d.heights.map((_, i) => d.heights.slice(0, i).reduce((a, b) => a + b, 0))
    const center = tops[d.from] + d.heights[d.from] / 2 + offset
    return d.heights.filter((h, j) => j !== d.from && tops[j] + h / 2 < center).length
  }

  const start = (e: PointerEvent<HTMLButtonElement>, id: string, from: number) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDrag({
      id,
      from,
      startY: e.clientY,
      pointerId: e.pointerId,
      heights: items.map(
        (_, i) => rows.current[i]?.getBoundingClientRect().height || FALLBACK_HEIGHT,
      ),
    })
    setDy(0)
    navigator.vibrate?.(10)
  }

  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag
    if (!d || d.pointerId !== e.pointerId) return
    const total = d.heights.reduce((a, b) => a + b, 0)
    const top = d.heights.slice(0, d.from).reduce((a, b) => a + b, 0)
    // nie dalej niż do brzegów listy
    setDy(Math.max(-top, Math.min(total - top - d.heights[d.from], e.clientY - d.startY)))
  }

  const end = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag
    if (!d || d.pointerId !== e.pointerId) return
    const to = targetOf(d, dy)
    cancel()
    if (to !== d.from) onMove(d.id, to)
  }

  const cancel = () => {
    setDrag(null)
    setDy(0)
  }

  const keys = (e: KeyboardEvent, id: string, i: number) => {
    const to = e.key === 'ArrowUp' ? i - 1 : e.key === 'ArrowDown' ? i + 1 : null
    if (to === null) return
    e.preventDefault()
    if (to >= 0 && to < items.length) onMove(id, to)
  }

  const d = drag
  const target = d ? targetOf(d, dy) : -1
  /** Przesunięcie wiersza `j`, żeby zrobić miejsce przeciąganemu. */
  const shift = (j: number) => {
    if (!d || j === d.from) return 0
    if (j < d.from) return j >= target ? d.heights[d.from] : 0
    return j - 1 < target ? -d.heights[d.from] : 0
  }

  return (
    <div style={{ position: 'relative' }}>
      {items.map((item, i) => {
        const dragged = item.id === dragId
        return (
          <div
            key={item.id}
            ref={(el) => {
              rows.current[i] = el
            }}
            data-dragging={dragged || undefined}
            style={{
              position: 'relative',
              zIndex: dragged ? 2 : 1,
              display: 'flex',
              alignItems: 'stretch',
              background: colors.white,
              borderBottom: i === items.length - 1 ? 'none' : `1px solid ${colors.line}`,
              transform: `translateY(${dragged ? dy : shift(i)}px)`,
              transition: dragged || !dragId ? 'none' : 'transform 150ms ease',
              boxShadow: dragged ? '0 8px 24px rgba(0,0,0,0.18)' : 'none',
              borderRadius: dragged ? 14 : 0,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>{renderItem(item)}</div>
            {!canDrag(item) ? (
              // bez uchwytu – puste miejsce, żeby wiersze się nie rozjeżdżały
              <span aria-hidden="true" style={{ width: 48, flex: 'none' }} />
            ) : (
              <button
                type="button"
                aria-label={handleLabel(item)}
                title="Przytrzymaj i przeciągnij"
                onPointerDown={(e) => start(e, item.id, i)}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={cancel}
                onKeyDown={(e) => keys(e, item.id, i)}
                style={{
                  width: 48,
                  flex: 'none',
                  border: 0,
                  padding: 0,
                  background: 'transparent',
                  color: colors.brass500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  cursor: dragged ? 'grabbing' : 'grab',
                }}
              >
                <GripIcon />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
