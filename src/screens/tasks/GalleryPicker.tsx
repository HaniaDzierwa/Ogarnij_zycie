import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckIcon } from '../../components/icons.tsx'
import { PHOTO_LIMITS } from '../../firebase/photos.ts'
import { colors, fonts, priorities, themed } from '../../theme'

/**
 * „Wybierz zdjęcia” (poprawka Hani 2026-11-20): po wyborze kilku zdjęć w galerii telefonu
 * (systemowej galerii strona nie umie ograniczyć) – własny ekran z miniaturami. Zaznaczonych
 * najwyżej tyle, ile się zmieści przy zadaniu; żeby wybrać inne, trzeba najpierw któreś odznaczyć.
 * Na dole licznik „N z 5” (z tymi, które już są przy zadaniu).
 */
export function GalleryPicker({
  files,
  already,
  onCancel,
  onDone,
}: {
  files: File[]
  /** Zdjęcia już przy zadaniu (w arkuszu). */
  already: number
  onCancel: () => void
  onDone: (chosen: File[]) => void
}) {
  const room = Math.max(0, PHOTO_LIMITS.perTask - already)
  // na start – pierwsze, które się mieszczą
  const [chosen, setChosen] = useState<number[]>(() => files.slice(0, room).map((_, i) => i))
  const [warn, setWarn] = useState(false)
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const full = chosen.length >= room
  const toggle = (i: number) => {
    if (chosen.includes(i)) {
      setChosen((c) => c.filter((x) => x !== i))
      setWarn(false)
    } else if (full) setWarn(true)
    else setChosen((c) => [...c, i])
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Wybierz zdjęcia"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        background: colors.cream,
        color: colors.green900,
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div style={{ padding: '18px 16px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontFamily: fonts.serif, fontSize: 22, fontWeight: 500 }}>
          Wybierz zdjęcia
        </span>
        <span style={{ fontSize: 13, color: colors.muted }}>
          Przy zadaniu zmieści się jeszcze {room}. Dotknij, żeby zaznaczyć albo odznaczyć.
        </span>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '4px 16px 16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 6,
          alignContent: 'start',
        }}
      >
        {files.map((f, i) => {
          const on = chosen.includes(i)
          const order = chosen.indexOf(i) + 1
          return (
            <button
              key={i}
              type="button"
              role="checkbox"
              aria-checked={on}
              aria-disabled={!on && full}
              aria-label={`Zdjęcie ${i + 1}${f.name ? ` (${f.name})` : ''}`}
              onClick={() => toggle(i)}
              style={{
                position: 'relative',
                aspectRatio: '1',
                padding: 0,
                border: 0,
                borderRadius: 12,
                overflow: 'hidden',
                background: colors.sand,
                outline: on ? `3px solid ${colors.green900}` : 'none',
                outlineOffset: -3,
                opacity: !on && full ? 0.45 : 1,
              }}
            >
              <img
                src={urls[i]}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 26,
                  height: 26,
                  boxSizing: 'border-box',
                  borderRadius: 13,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 800,
                  ...(on
                    ? { background: colors.green900, color: colors.cream }
                    : {
                        border: `2px solid ${colors.onPhoto}`,
                        background: 'rgba(31,61,46,0.25)',
                      }),
                }}
              >
                {on ? order : ''}
              </span>
            </button>
          )
        })}
      </div>

      <div
        style={{
          padding: '12px 16px 18px',
          background: colors.white,
          boxShadow: `0 -6px 20px ${themed('rgba(31,61,46,0.08)', 'rgba(0,0,0,0.35)')}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span role="status" style={{ fontFamily: fonts.serif, fontSize: 20, fontWeight: 600 }}>
            {already + chosen.length} z {PHOTO_LIMITS.perTask}
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: warn ? priorities.high.fg : colors.muted,
              textAlign: 'right',
            }}
          >
            {warn
              ? 'To już limit – odznacz jedno, żeby wybrać inne.'
              : full
                ? 'Limit zdjęć osiągnięty'
                : ''}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 8 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              height: 48,
              border: `1px solid ${colors.border}`,
              borderRadius: 24,
              background: colors.white,
              color: colors.green900,
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            Anuluj
          </button>
          <button
            type="button"
            disabled={!chosen.length}
            onClick={() => onDone(chosen.map((i) => files[i]))}
            style={{
              height: 48,
              border: 0,
              borderRadius: 24,
              background: colors.green900,
              color: colors.cream,
              fontSize: 15,
              fontWeight: 800,
              opacity: chosen.length ? 1 : 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <CheckIcon size={16} />
            Dodaj ({chosen.length})
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
