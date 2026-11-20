import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  dragRect,
  FULL_RECT,
  isFullRect,
  type CropHandle,
  type CropRect,
} from '../../photos/crop.ts'
import { colors, fonts } from '../../theme'

const BG = '#14251C'

/**
 * Przycinanie zdjęcia (poprawka Hani 2026-11-20): zdjęcie na ciemnym tle, jasna ramka –
 * przesuwana palcem i rozciągana za rogi; poza ramką przyciemnione. „Gotowe” zwraca ramkę
 * (ułamki obrazka), „Anuluj” – bez zmian.
 */
export function PhotoCropper({
  src,
  busy,
  onCancel,
  onDone,
}: {
  /** Adres obrazka (blob:, data:). */
  src: string
  /** Przycinanie w toku – przyciski nieaktywne. */
  busy?: boolean
  onCancel: () => void
  onDone: (rect: CropRect) => void
}) {
  const [rect, setRect] = useState<CropRect>(FULL_RECT)
  const box = useRef<HTMLDivElement>(null)
  const drag = useRef<{ handle: CropHandle; x: number; y: number; start: CropRect } | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const down = (handle: CropHandle, e: ReactPointerEvent) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    drag.current = { handle, x: e.clientX, y: e.clientY, start: rect }
  }
  const move = (e: ReactPointerEvent) => {
    const d = drag.current
    const b = box.current?.getBoundingClientRect()
    if (!d || !b || !b.width || !b.height) return
    setRect(dragRect(d.start, d.handle, (e.clientX - d.x) / b.width, (e.clientY - d.y) / b.height))
  }
  const up = () => {
    drag.current = null
  }

  const corner = (handle: Exclude<CropHandle, 'move'>, label: string) => {
    const left = handle.endsWith('w')
    const top = handle.startsWith('n')
    return (
      <span
        key={handle}
        role="button"
        aria-label={label}
        onPointerDown={(e) => down(handle, e)}
        style={{
          position: 'absolute',
          width: 44,
          height: 44,
          [left ? 'left' : 'right']: -22,
          [top ? 'top' : 'bottom']: -22,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          touchAction: 'none',
        }}
      >
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            background: colors.cream,
            boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
          }}
        />
      </span>
    )
  }

  const button = {
    height: 48,
    borderRadius: 24,
    fontSize: 15,
    fontWeight: 800,
    opacity: busy ? 0.6 : 1,
  } as const

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Przytnij zdjęcie"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        background: BG,
        color: colors.cream,
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div style={{ padding: '18px 16px 8px', display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontFamily: fonts.serif, fontSize: 21, fontWeight: 500, flex: 1 }}>
          Przytnij zdjęcie
        </span>
        <button
          type="button"
          disabled={busy || isFullRect(rect)}
          onClick={() => setRect(FULL_RECT)}
          style={{
            height: 36,
            border: 0,
            background: 'transparent',
            color: colors.brass300,
            fontSize: 13,
            fontWeight: 800,
            opacity: isFullRect(rect) ? 0.4 : 1,
          }}
        >
          Całe zdjęcie
        </button>
      </div>

      <div
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 28,
          touchAction: 'none',
        }}
      >
        <div ref={box} style={{ position: 'relative', lineHeight: 0, maxHeight: '100%' }}>
          <img
            src={src}
            alt="Zdjęcie do przycięcia"
            draggable={false}
            style={{
              display: 'block',
              maxWidth: '100%',
              maxHeight: 'calc(100dvh - 220px)',
              userSelect: 'none',
            }}
          />
          <div
            role="group"
            aria-label="Ramka przycięcia"
            onPointerDown={(e) => down('move', e)}
            style={{
              position: 'absolute',
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `${rect.w * 100}%`,
              height: `${rect.h * 100}%`,
              boxSizing: 'border-box',
              border: `2px solid ${colors.cream}`,
              boxShadow: '0 0 0 9999px rgba(10,20,15,0.6)',
              touchAction: 'none',
              cursor: 'move',
            }}
          >
            {corner('nw', 'Lewy górny róg ramki')}
            {corner('ne', 'Prawy górny róg ramki')}
            {corner('sw', 'Lewy dolny róg ramki')}
            {corner('se', 'Prawy dolny róg ramki')}
          </div>
        </div>
      </div>

      <div style={{ padding: '8px 16px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{ fontSize: 12, color: colors.onDarkMuted2, textAlign: 'center' }}>
          {busy ? 'Przycinam…' : 'Przesuń ramkę albo pociągnij za róg'}
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 8 }}>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            style={{
              ...button,
              border: '1px solid rgba(246,241,231,0.35)',
              background: 'transparent',
              color: colors.cream,
            }}
          >
            Anuluj
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => (isFullRect(rect) ? onCancel() : onDone(rect))}
            style={{ ...button, border: 0, background: colors.cream, color: colors.green900 }}
          >
            Gotowe
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
