import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CameraIcon, CloseIcon } from '../../components/icons.tsx'
import { useStore } from '../../data/store.ts'
import type { Task } from '../../data/types.ts'
import { PHOTO_LIMITS } from '../../firebase/photos.ts'
import {
  canAddPhoto,
  draftBytes,
  visibleTiles,
  type PhotoDraft,
  type PhotoTile,
  type TaskPhoto,
} from '../../photos/draft.ts'
import { colors } from '../../theme'

/** Zdjęcia w formularzu zadania: zapisane w bazie + kopia robocza zmian. */
export type PhotoFieldProps = {
  saved: TaskPhoto[]
  draft: PhotoDraft
  onDraft: (fn: (d: PhotoDraft) => PhotoDraft) => void
}

/** Zapisane zdjęcia zadania na żywo (puste dla nowego zadania). */
export function useTaskPhotos(task: Task | null): TaskPhoto[] {
  const { photos } = useStore()
  const [list, setList] = useState<TaskPhoto[]>([])
  const id = task?.id
  const seriesId = task?.seriesId
  const isPrivate = task?.private
  const watch = photos.watch
  useEffect(() => {
    if (!task) return
    return watch(task, setList)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- słuchamy od nowa tylko przy zmianie miejsca
  }, [id, seriesId, isPrivate, watch])
  return task ? list : []
}

const HINT = 'Aparat albo galeria. Zdjęcie zmniejszamy do 1080 px, żeby szybko się wysłało.'

/**
 * Sekcja ZDJĘCIA (projekt „Zdjęcia w zadaniach”, ekran 1): kafelki 3 w rzędzie, licznik „N z 5”,
 * kafelek „Dodaj”, × (z COFNIJ), „Zmniejszam…” na świeżo dodanym. Zwraca ukryte pole wyboru pliku,
 * samą sekcję (gdy są zdjęcia) i przycisk „+ Zdjęcie” do rzędu „+ Kroki / + Notatka”.
 */
export function usePhotoField(p: PhotoFieldProps | undefined): {
  input: ReactNode
  section: ReactNode
  addItem: { label: string; onClick: () => void } | null
} {
  const store = useStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(0)
  const [error, setError] = useState<string | null>(null)
  if (!p) return { input: null, section: null, addItem: null }

  const tiles = visibleTiles(p.saved, p.draft)
  const full = !canAddPhoto(p.saved, p.draft, pending)
  const open = () => {
    setError(null)
    inputRef.current?.click()
  }

  const onFile = async (file: File) => {
    setPending((n) => n + 1)
    try {
      const photo = await store.photos.prepare(file)
      const size = photo.tile.length + photo.full.length
      const used = draftBytes(p.saved, p.draft) + size
      if (store.photos.usage.house + used > PHOTO_LIMITS.houseBytes)
        setError('Miejsce na zdjęcia w Waszym domu się skończyło – usuń stare zdjęcia.')
      else if (store.photos.usage.app + used > PHOTO_LIMITS.appBytes)
        setError('Miejsce na zdjęcia w aplikacji się skończyło.')
      else p.onDraft((d) => ({ ...d, added: [...d.added, photo] }))
    } catch {
      setError('Nie udało się wczytać zdjęcia. Spróbuj z innym.')
    } finally {
      setPending((n) => n - 1)
    }
  }

  const remove = (t: PhotoTile) => {
    const { saved, added } = t
    p.onDraft((d) =>
      saved
        ? { ...d, removed: [...d.removed, saved.id] }
        : { ...d, added: d.added.filter((a) => a.key !== t.key) },
    )
    store.showUndo('Usunięto zdjęcie', () =>
      p.onDraft((d) =>
        saved
          ? { ...d, removed: d.removed.filter((id) => id !== saved.id) }
          : added
            ? { ...d, added: [...d.added, added] }
            : d,
      ),
    )
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      hidden
      data-zdjecie=""
      onChange={(e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (file) void onFile(file)
      }}
    />
  )

  const show = tiles.length > 0 || pending > 0
  const section = show && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span
          style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.4px', color: colors.muted }}
        >
          ZDJĘCIA
        </span>
        <span style={{ fontSize: 12, fontWeight: 800, color: colors.muted }}>
          {tiles.length} z {PHOTO_LIMITS.perTask}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        {tiles.map((t, i) => (
          <div key={t.key} style={tileBox}>
            <img
              src={t.tileUrl}
              alt={`Zdjęcie ${i + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <button
              type="button"
              onClick={() => remove(t)}
              aria-label={`Usuń zdjęcie ${i + 1}`}
              style={{
                position: 'absolute',
                top: 2,
                right: 2,
                width: 36,
                height: 36,
                border: 0,
                padding: 0,
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  background: 'rgba(31,61,46,0.78)',
                  color: colors.white,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CloseIcon size={12} />
              </span>
            </button>
          </div>
        ))}
        {Array.from({ length: pending }, (_, i) => (
          <div
            key={`czeka-${i}`}
            role="status"
            style={{
              ...tileBox,
              background: colors.creamLight,
              border: `1px solid ${colors.borderSoft}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              color: colors.green900,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                boxSizing: 'border-box',
                border: `3px solid ${colors.borderSoft}`,
                borderTopColor: colors.green900,
                animation: 'loading-spin 0.9s linear infinite',
              }}
            />
            <span style={{ fontSize: 11, fontWeight: 800 }}>Zmniejszam…</span>
          </div>
        ))}
        {!full && (
          <button
            type="button"
            onClick={open}
            aria-label="Dodaj zdjęcie"
            style={{
              aspectRatio: '1',
              borderRadius: 14,
              border: `1.5px dashed ${colors.brass500}`,
              background: 'transparent',
              color: colors.brass700,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            <CameraIcon size={26} />
            Dodaj
          </button>
        )}
      </div>
      <span
        role={error ? 'alert' : undefined}
        style={{ fontSize: 12, lineHeight: 1.45, color: error ? '#8C3D27' : colors.muted }}
      >
        {error ?? (full ? 'To już 5 zdjęć – usuń jedno, żeby dodać kolejne.' : HINT)}
      </span>
    </div>
  )

  return {
    input,
    // błąd przed pierwszym zdjęciem (np. nie dało się wczytać) – sam komunikat
    section:
      section ||
      (error && (
        <span role="alert" style={{ fontSize: 12, lineHeight: 1.45, color: '#8C3D27' }}>
          {error}
        </span>
      )),
    addItem: show ? null : { label: 'Zdjęcie', onClick: open },
  }
}

const tileBox = {
  position: 'relative',
  aspectRatio: '1',
  borderRadius: 14,
  overflow: 'hidden',
  background: colors.sand,
} as const
