import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, TrashIcon } from '../../components/icons.tsx'
import { TOAST_MS, useStore } from '../../data/store.ts'
import type { TaskPhoto } from '../../photos/draft.ts'
import { photoFileName, savePhotoToPhone } from '../../photos/share.ts'
import { colors } from '../../theme'

const BG = '#14251C'
const MAX_ZOOM = 4

type Props = {
  photos: TaskPhoto[]
  start: number
  /** Nazwa zadania – podpis i nazwa pliku. */
  title: string
  /** „dodane: Hania” */
  author: (p: TaskPhoto) => string
  /** Usunięcie (z opóźnieniem) – zwraca „cofnij”. */
  onDelete: (p: TaskPhoto) => () => void
  /** Zadanie cykliczne: „Przenieś do: przy każdym powtórzeniu / tylko tym razem”. */
  onChangeKind?: (p: TaskPhoto) => void
  onClose: () => void
}

/**
 * Podgląd zdjęcia na cały ekran (projekt „Zdjęcia w zadaniach”, ekran 4): ciemne tło, „1 / 3”,
 * przesuwanie w bok, powiększanie palcami (i podwójnym dotknięciem), „Zapisz na telefonie”,
 * „Usuń zdjęcie” z pytaniem i COFNIJ. Pełna wersja wczytuje się dopiero tutaj.
 */
export function PhotoViewer({
  photos,
  start,
  title,
  author,
  onDelete,
  onChangeKind,
  onClose,
}: Props) {
  const store = useStore()
  const [index, setIndex] = useState(Math.min(start, photos.length - 1))
  const [asking, setAsking] = useState(false)
  const [undo, setUndo] = useState<(() => void) | null>(null)
  const [full, setFull] = useState<{ id: string; url: string; blob: Blob } | null>(null)
  const [zoom, setZoom] = useState({ scale: 1, x: 0, y: 0 })
  // w trakcie gestu bez animacji (obraz idzie za palcem)
  const [dragging, setDragging] = useState(false)
  const photo = photos[Math.min(index, photos.length - 1)]

  // pełna wersja aktualnego zdjęcia
  const loadFull = store.photos.loadFull
  const photoId = photo?.id
  useEffect(() => {
    if (!photo) return
    let url = ''
    let active = true
    loadFull(photo)
      .then((blob) => {
        if (!active) return
        url = URL.createObjectURL(blob)
        setFull({ id: photo.id, url, blob })
      })
      .catch((e) => console.error('Nie udało się wczytać zdjęcia', e))
    return () => {
      active = false
      if (url) URL.revokeObjectURL(url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- wczytujemy od nowa tylko inne zdjęcie
  }, [photoId, loadFull])

  const go = (d: number) => {
    if (photos.length < 2) return
    setIndex((i) => (i + d + photos.length) % photos.length)
    setZoom({ scale: 1, x: 0, y: 0 })
    setAsking(false)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // wszystkie usunięte – podgląd się zamyka
  useEffect(() => {
    if (!photos.length) onClose()
  }, [photos.length, onClose])

  // gesty: jeden palec – przesunięcie (w bok = kolejne zdjęcie, w powiększeniu – przesuwanie),
  // dwa palce – powiększanie
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{
    dist: number
    scale: number
    startX: number
    x0: number
    y0: number
  } | null>(null)
  const lastTap = useRef(0)
  const onDown = (e: ReactPointerEvent) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    setDragging(true)
    const pts = [...pointers.current.values()]
    gesture.current = {
      dist: pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0,
      scale: zoom.scale,
      startX: e.clientX,
      x0: zoom.x - e.clientX,
      y0: zoom.y - e.clientY,
    }
  }
  const onMove = (e: ReactPointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pts = [...pointers.current.values()]
    const g = gesture.current
    if (pts.length === 2 && g.dist) {
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      const scale = Math.min(MAX_ZOOM, Math.max(1, (g.scale * d) / g.dist))
      setZoom((z) => (scale === 1 ? { scale, x: 0, y: 0 } : { ...z, scale }))
    } else if (pts.length === 1 && zoom.scale > 1) {
      setZoom((z) => ({ ...z, x: g.x0 + e.clientX, y: g.y0 + e.clientY }))
    }
  }
  const onUp = (e: ReactPointerEvent) => {
    const g = gesture.current
    const wasSingle = pointers.current.size === 1
    pointers.current.delete(e.pointerId)
    if (!pointers.current.size) setDragging(false)
    if (!g || !wasSingle) return
    const dx = e.clientX - g.startX
    if (zoom.scale === 1 && Math.abs(dx) > 60) go(dx < 0 ? 1 : -1)
    else if (Math.abs(dx) < 10) {
      const now = Date.now()
      if (now - lastTap.current < 300)
        setZoom((z) => (z.scale > 1 ? { scale: 1, x: 0, y: 0 } : { scale: 2.5, x: 0, y: 0 }))
      lastTap.current = now
    }
    gesture.current = null
  }

  const remove = () => {
    if (!photo) return
    const restore = onDelete(photo)
    setAsking(false)
    setZoom({ scale: 1, x: 0, y: 0 })
    setIndex((i) => Math.max(0, Math.min(i, photos.length - 2)))
    setUndo(() => restore)
    setTimeout(() => setUndo((u) => (u === restore ? null : u)), TOAST_MS)
  }

  if (!photo) return null
  const src = full?.id === photo.id ? full.url : photo.tileUrl
  const n = photos.length

  const round = {
    width: 44,
    height: 44,
    border: 0,
    borderRadius: 22,
    color: colors.onHeader,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as const

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Podgląd zdjęcia"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: BG,
        color: colors.onHeader,
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 12px 8px 16px',
        }}
      >
        <span
          style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1, color: colors.onDarkMuted }}
        >
          {index + 1} / {n}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Zamknij podgląd"
          style={{ ...round, background: 'rgba(246,241,231,0.12)' }}
        >
          <CloseIcon size={18} />
        </button>
      </div>

      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          touchAction: 'none',
        }}
      >
        <img
          src={src}
          alt={`Zdjęcie ${index + 1} z ${n}`}
          draggable={false}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`,
            transition: dragging ? 'none' : 'transform 150ms ease-out',
            userSelect: 'none',
          }}
        />
        {n > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Poprzednie zdjęcie"
              style={{ ...round, position: 'absolute', left: 8, background: 'rgba(20,37,28,0.55)' }}
            >
              <ChevronLeftIcon size={18} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Następne zdjęcie"
              style={{
                ...round,
                position: 'absolute',
                right: 8,
                background: 'rgba(20,37,28,0.55)',
              }}
            >
              <ChevronRightIcon size={18} />
            </button>
          </>
        )}
      </div>

      {n > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '10px 0 4px' }}>
          {photos.map((p, i) => (
            <span
              key={p.id}
              style={{
                width: i === index ? 18 : 7,
                height: 7,
                borderRadius: 4,
                background: i === index ? colors.headerAccent : 'rgba(246,241,231,0.35)',
              }}
            />
          ))}
        </div>
      )}

      <div style={{ padding: '10px 16px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span style={{ fontSize: 13, color: colors.onDarkMuted2, textAlign: 'center' }}>
          {title} · {author(photo)}
          {photo.kind === 'series' ? ' · przy każdym powtórzeniu' : ''}
        </span>
        {onChangeKind && (
          <button
            type="button"
            onClick={() => onChangeKind(photo)}
            style={{
              alignSelf: 'center',
              height: 40,
              padding: '0 16px',
              border: '1px solid rgba(246,241,231,0.35)',
              borderRadius: 20,
              background: 'transparent',
              color: colors.onHeader,
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            {photo.kind === 'series'
              ? 'Przenieś do: tylko tym razem'
              : 'Przenieś do: przy każdym powtórzeniu'}
          </button>
        )}
        <span style={{ fontSize: 12, color: colors.onDarkMuted2, textAlign: 'center' }}>
          Przesuń w bok – kolejne zdjęcie · rozsuń palce – powiększenie
        </span>

        {undo && (
          <div
            role="status"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              minHeight: 48,
              padding: '0 8px 0 16px',
              borderRadius: 16,
              background: colors.header,
            }}
          >
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>Usunięto zdjęcie</span>
            <button
              type="button"
              onClick={() => {
                undo()
                setUndo(null)
              }}
              style={{
                height: 40,
                padding: '0 12px',
                border: 0,
                background: 'transparent',
                color: colors.headerAccent,
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: 1,
              }}
            >
              COFNIJ
            </button>
          </div>
        )}

        {asking ? (
          <div
            role="alertdialog"
            aria-label="Usunąć zdjęcie?"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              padding: 16,
              borderRadius: 20,
              background: colors.creamLight,
              color: colors.green900,
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 800 }}>
              {photo.kind === 'series' ? 'Usunąć ze wszystkich powtórzeń?' : 'Usunąć to zdjęcie?'}
            </span>
            <span style={{ fontSize: 13, color: colors.muted2 }}>
              {photo.kind === 'series'
                ? 'Zniknie z każdego powtórzenia tego zadania. Możesz je przywrócić paskiem COFNIJ.'
                : 'Zniknie z zadania. Możesz je przywrócić paskiem COFNIJ.'}
            </span>
            <div
              style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}
            >
              <button
                type="button"
                onClick={() => setAsking(false)}
                style={{
                  height: 44,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 22,
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
                onClick={remove}
                style={{
                  height: 44,
                  border: 0,
                  borderRadius: 22,
                  background: colors.danger,
                  color: colors.onDanger,
                  fontSize: 15,
                  fontWeight: 800,
                }}
              >
                Usuń
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}
          >
            <button
              type="button"
              disabled={full?.id !== photo.id}
              onClick={() =>
                full &&
                void savePhotoToPhone(full.blob, photoFileName(title, index + 1, photo.type))
              }
              style={{
                height: 48,
                border: 0,
                borderRadius: 24,
                background: colors.onHeader,
                color: colors.header,
                fontSize: 15,
                fontWeight: 800,
                opacity: full?.id === photo.id ? 1 : 0.6,
              }}
            >
              Zapisz na telefonie
            </button>
            <button
              type="button"
              onClick={() => setAsking(true)}
              style={{
                height: 48,
                padding: '0 8px',
                border: '1px solid rgba(231,184,168,0.6)',
                borderRadius: 24,
                background: 'transparent',
                color: '#F3B9A4',
                fontSize: 15,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <TrashIcon size={18} />
              Usuń zdjęcie
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
