import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  CameraIcon,
  CloseIcon,
  CropIcon,
  GalleryIcon,
  RepeatIcon,
} from '../../components/icons.tsx'
import { useStore } from '../../data/store.ts'
import type { Task } from '../../data/types.ts'
import { PHOTO_LIMITS, type PhotoKind } from '../../firebase/photos.ts'
import {
  canAddPhoto,
  draftBytes,
  visibleTiles,
  type PhotoDraft,
  type PhotoTile,
  type TaskPhoto,
} from '../../photos/draft.ts'
import { colors, fonts } from '../../theme'
import { GalleryPicker } from './GalleryPicker.tsx'
import { PhotoCropper } from './PhotoCropper.tsx'
import type { CropRect } from '../../photos/crop.ts'

/** Zdjęcia w formularzu zadania: zapisane w bazie + kopia robocza zmian. */
export type PhotoFieldProps = {
  saved: TaskPhoto[]
  draft: PhotoDraft
  onDraft: (fn: (d: PhotoDraft) => PhotoDraft) => void
  /** Zadanie cykliczne – przy dodawaniu wybór „Tylko tym razem” / „Przy każdym powtórzeniu”. */
  repeating?: boolean
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

const HINT =
  'Aparat albo galeria – możesz zaznaczyć kilka zdjęć naraz. Zmniejszamy je do 1080 px, żeby szybko się wysłały.'
const HINT_REPEAT =
  'Zdjęcia „przy każdym powtórzeniu” zobaczysz też w następnych terminach. Usunięcie takiego zdjęcia usuwa je ze wszystkich powtórzeń.'
const ERROR = '#8C3D27'

const label: CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: '1.4px',
  color: colors.muted,
}

/**
 * Sekcja ZDJĘCIA (projekt „Zdjęcia w zadaniach”, ekrany 1 i 5): kafelki 3 w rzędzie, licznik
 * „N z 5”, kafelek „Dodaj”, × (z COFNIJ), „Zmniejszam…” na świeżo dodanym. Zadanie cykliczne –
 * dwie grupy („PRZY KAŻDYM POWTÓRZENIU” / „TYLKO TYM RAZEM”) i wybór przy dodawaniu. Zwraca ukryte
 * pole wyboru pliku, sekcję i przycisk „+ Zdjęcie” do rzędu „+ Kroki / + Notatka”.
 */
export function usePhotoField(p: PhotoFieldProps | undefined): {
  input: ReactNode
  section: ReactNode
  addItem: { label: string; onClick: () => void } | null
} {
  const store = useStore()
  // galeria (kilka naraz) i aparat (od razu zdjęcie) – poprawki Hani 2026-11-20
  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  // rodzaj zdjęcia, które właśnie się wybiera (pole pliku odpowiada później)
  const kindRef = useRef<PhotoKind>('task')
  const [pending, setPending] = useState<PhotoKind[]>([])
  const [error, setError] = useState<string | null>(null)
  const [choice, setChoice] = useState<PhotoKind | null>(null)
  // przycinanie od razu przy dodawaniu (poprawka Hani 2026-11-20) – pytanie o każde zdjęcie
  const [askCrop, setAskCrop] = useState<{
    url: string
    title: string
    answer: (rect: CropRect | null) => void
  } | null>(null)
  // kilka zdjęć z galerii – najpierw własny wybór z limitem i licznikiem „N z 5”
  const [picking, setPicking] = useState<File[] | null>(null)
  // „+ Zdjęcie” w zwykłym zadaniu – sekcja z „Aparat” / „Galeria”, zanim jest pierwsze zdjęcie
  const [opened, setOpened] = useState(false)
  // przycinane zdjęcie: kafelek, adres obrazka i czy właśnie się przycina
  const [cropping, setCropping] = useState<{ tile: PhotoTile; url: string; busy: boolean } | null>(
    null,
  )
  if (!p) return { input: null, section: null, addItem: null }

  const repeating = !!p.repeating
  const tiles = visibleTiles(p.saved, p.draft)
  const full = !canAddPhoto(p.saved, p.draft, pending.length)
  const pick = (kind: PhotoKind, from: 'camera' | 'gallery') => {
    kindRef.current = kind
    setChoice(null)
    setError(null)
    ;(from === 'camera' ? cameraRef : galleryRef).current?.click()
  }
  const open = () => {
    setError(null)
    // zadanie cykliczne – najpierw „Gdzie dodać zdjęcie?” (domyślnie „Tylko tym razem”)
    if (repeating) setChoice('task')
    else setOpened(true)
  }

  /** Ekran przycinania nowego zdjęcia – ramka albo null („Bez przycinania”). */
  const cropFirst = (file: Blob, title: string) =>
    new Promise<CropRect | null>((resolve) => {
      const url = URL.createObjectURL(file)
      setAskCrop({
        url,
        title,
        answer: (rect) => {
          URL.revokeObjectURL(url)
          setAskCrop(null)
          resolve(rect)
        },
      })
    })

  /** Przycinanie: obrazek z nowego zdjęcia albo pełna wersja zapisanego. */
  const startCrop = async (tile: PhotoTile) => {
    setError(null)
    try {
      const blob = tile.added
        ? new Blob([new Uint8Array(tile.added.full)], { type: tile.added.type })
        : await store.photos.loadFull(tile.saved!)
      setCropping({ tile, url: URL.createObjectURL(blob), busy: false })
    } catch {
      setError('Nie udało się otworzyć zdjęcia do przycięcia.')
    }
  }
  const endCrop = () => {
    if (cropping) URL.revokeObjectURL(cropping.url)
    setCropping(null)
  }
  const finishCrop = async (rect: CropRect) => {
    if (!cropping) return
    const { tile, url } = cropping
    setCropping({ ...cropping, busy: true })
    try {
      const source = await (await fetch(url)).blob()
      const cut = await store.photos.crop(source, rect)
      const photo = { ...(await store.photos.prepare(cut)), kind: tile.kind }
      // nowe – podmiana w miejscu; zapisane – stare usunięte, przycięte dodane (zapis przy „Zapisz”)
      p.onDraft((d) =>
        tile.added
          ? { ...d, added: d.added.map((a) => (a.key === tile.key ? photo : a)) }
          : { ...d, removed: [...d.removed, tile.saved!.id], added: [...d.added, photo] },
      )
    } catch {
      setError('Nie udało się przyciąć zdjęcia.')
    }
    endCrop()
  }

  /** Jedno albo kilka zdjęć naraz (poprawka Hani 2026-11-20) – razem najwyżej 5 przy zadaniu. */
  const onFiles = async (files: File[]) => {
    const kind = kindRef.current
    const room = PHOTO_LIMITS.perTask - tiles.length - pending.length
    const take = files.slice(0, Math.max(0, room))
    const skipped = files.length - take.length
    if (!take.length) return
    setPending((list) => [...list, ...take.map(() => kind)])
    let note: string | null =
      skipped > 0
        ? `Zmieszczą się jeszcze tylko ${take.length} – dodano pierwsze ${take.length}.`
        : null
    // po kolei – na telefonie kilka dużych zdjęć naraz to dużo pamięci
    let used = draftBytes(p.saved, p.draft)
    for (const [i, file] of take.entries()) {
      try {
        // najpierw przycinanie (albo „Bez przycinania”), potem zmniejszanie
        const rect = await cropFirst(
          file,
          take.length > 1 ? `Przytnij zdjęcie (${i + 1} z ${take.length})` : 'Przytnij zdjęcie',
        )
        const source = rect ? await store.photos.crop(file, rect) : file
        const photo = { ...(await store.photos.prepare(source)), kind }
        const size = photo.tile.length + photo.full.length
        if (store.photos.usage.house + used + size > PHOTO_LIMITS.houseBytes)
          note = 'Miejsce na zdjęcia w Waszym domu się skończyło – usuń stare zdjęcia.'
        else if (store.photos.usage.app + used + size > PHOTO_LIMITS.appBytes)
          note = 'Miejsce na zdjęcia w aplikacji się skończyło.'
        else {
          used += size
          p.onDraft((d) => ({ ...d, added: [...d.added, photo] }))
        }
      } catch {
        note = 'Nie udało się wczytać zdjęcia. Spróbuj z innym.'
      } finally {
        setPending((list) => {
          const i = list.indexOf(kind)
          return i < 0 ? list : [...list.slice(0, i), ...list.slice(i + 1)]
        })
      }
    }
    if (note) setError(note)
  }

  const remove = (t: PhotoTile) => {
    const { saved, added } = t
    p.onDraft((d) =>
      saved
        ? { ...d, removed: [...d.removed, saved.id] }
        : { ...d, added: d.added.filter((a) => a.key !== t.key) },
    )
    store.showUndo(
      t.kind === 'series' ? 'Usunięto zdjęcie ze wszystkich powtórzeń' : 'Usunięto zdjęcie',
      () =>
        p.onDraft((d) =>
          saved
            ? { ...d, removed: d.removed.filter((id) => id !== saved.id) }
            : added
              ? { ...d, added: [...d.added, added] }
              : d,
        ),
    )
  }

  const onChange = (e: { target: HTMLInputElement }) => {
    const files = [...(e.target.files ?? [])]
    e.target.value = ''
    if (files.length > 1) setPicking(files)
    else if (files.length) void onFiles(files)
  }
  const input = (
    <>
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        data-zrodlo="galeria"
        onChange={onChange}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        data-zrodlo="aparat"
        onChange={onChange}
      />
      {picking && (
        <GalleryPicker
          files={picking}
          already={tiles.length + pending.length}
          onCancel={() => setPicking(null)}
          onDone={(chosen) => {
            setPicking(null)
            void onFiles(chosen)
          }}
        />
      )}
      {askCrop && (
        <PhotoCropper
          key={askCrop.url}
          src={askCrop.url}
          title={askCrop.title}
          cancelLabel="Bez przycinania"
          onCancel={() => askCrop.answer(null)}
          onDone={(rect) => askCrop.answer(rect)}
        />
      )}
      {cropping && (
        <PhotoCropper
          src={cropping.url}
          busy={cropping.busy}
          onCancel={endCrop}
          onDone={(rect) => void finishCrop(rect)}
        />
      )}
    </>
  )

  // numeracja kafelków wspólna dla obu grup („Zdjęcie 3”)
  const numbered = tiles.map((t, i) => ({ t, n: i + 1 }))
  const tileView = ({ t, n }: { t: PhotoTile; n: number }) => (
    <div key={t.key} style={tileBox}>
      <img
        src={t.tileUrl}
        alt={`Zdjęcie ${n}`}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      {t.kind === 'series' && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 6,
            bottom: 6,
            width: 20,
            height: 20,
            borderRadius: 10,
            background: 'rgba(255,252,246,0.92)',
            color: colors.brass700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <RepeatIcon size={11} strokeWidth={2.8} />
        </span>
      )}
      <button
        type="button"
        onClick={() => void startCrop(t)}
        aria-label={`Przytnij zdjęcie ${n}`}
        style={{
          position: 'absolute',
          right: 2,
          bottom: 2,
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
          <CropIcon size={13} />
        </span>
      </button>
      <button
        type="button"
        onClick={() => remove(t)}
        aria-label={`Usuń zdjęcie ${n}`}
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
  )
  const pendingView = (key: string) => (
    <div
      key={key}
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
  )
  const addStyle = {
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
  } as const
  const addTile = full
    ? []
    : repeating
      ? [
          <button
            key="dodaj"
            type="button"
            onClick={open}
            aria-label="Dodaj zdjęcie"
            style={addStyle}
          >
            <CameraIcon size={26} />
            Dodaj
          </button>,
        ]
      : [
          <button
            key="aparat"
            type="button"
            onClick={() => pick('task', 'camera')}
            aria-label="Zrób zdjęcie"
            style={addStyle}
          >
            <CameraIcon size={26} />
            Aparat
          </button>,
          <button
            key="galeria"
            type="button"
            onClick={() => pick('task', 'gallery')}
            aria-label="Dodaj z galerii"
            style={addStyle}
          >
            <GalleryIcon size={26} />
            Galeria
          </button>,
        ]
  const grid = (children: ReactNode) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
      {children}
    </div>
  )
  const waiting = (kind: PhotoKind) =>
    pending.map((k, i) => (k === kind ? pendingView(`czeka-${i}`) : null))

  const series = numbered.filter((x) => x.t.kind === 'series')
  const once = numbered.filter((x) => x.t.kind === 'task')
  const grouped = repeating || series.length > 0
  const body = grouped ? (
    <>
      {(series.length > 0 || pending.includes('series')) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span
            style={{
              ...label,
              letterSpacing: '1px',
              color: colors.brass700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <RepeatIcon size={13} />
            PRZY KAŻDYM POWTÓRZENIU
          </span>
          {grid([...series.map(tileView), ...waiting('series')])}
        </div>
      )}
      {(once.length > 0 || pending.includes('task')) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ ...label, letterSpacing: '1px' }}>TYLKO TYM RAZEM</span>
          {grid([...once.map(tileView), ...waiting('task')])}
        </div>
      )}
      {addTile.length > 0 && grid(addTile)}
    </>
  ) : (
    grid([...numbered.map(tileView), ...waiting('task'), ...addTile])
  )

  const chooser = choice && (
    <div
      role="group"
      aria-label="Gdzie dodać zdjęcie?"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: 16,
        borderRadius: 20,
        background: colors.white,
        boxShadow: '0 6px 20px rgba(31,61,46,0.10)',
      }}
    >
      <span style={{ fontFamily: fonts.serif, fontSize: 19, fontWeight: 500 }}>
        Gdzie dodać zdjęcie?
      </span>
      {(
        [
          [
            'task',
            'Tylko tym razem',
            'Zostanie przy tym terminie. Następne powtórzenie – bez niego.',
          ],
          [
            'series',
            'Przy każdym powtórzeniu',
            'Widać je w każdym terminie, np. instrukcja albo „jak ma wyglądać”.',
          ],
        ] as const
      ).map(([kind, title, text]) => {
        const on = choice === kind
        return (
          <button
            key={kind}
            type="button"
            aria-pressed={on}
            onClick={() => setChoice(kind)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 16,
              border: on ? `2px solid ${colors.green900}` : `1px solid ${colors.border}`,
              background: on ? colors.white : 'transparent',
              color: colors.green900,
              textAlign: 'left',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 20,
                height: 20,
                flex: 'none',
                marginTop: 1,
                borderRadius: 10,
                boxSizing: 'border-box',
                border: on ? `6px solid ${colors.green900}` : `2px solid #9AA59D`,
                background: colors.white,
              }}
            />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 15, fontWeight: 800 }}>{title}</span>
              <span style={{ fontSize: 13, color: colors.muted }}>{text}</span>
            </span>
          </button>
        )
      })}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        {(
          [
            ['camera', 'Zrób zdjęcie', <CameraIcon key="i" size={18} />],
            ['gallery', 'Z galerii', <GalleryIcon key="i" size={18} />],
          ] as const
        ).map(([from, text, icon]) => (
          <button
            key={from}
            type="button"
            onClick={() => pick(choice, from)}
            style={{
              height: 44,
              border: 0,
              borderRadius: 22,
              background: colors.green900,
              color: colors.cream,
              fontSize: 15,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {icon}
            {text}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setChoice(null)}
        style={{
          height: 40,
          border: 0,
          background: 'transparent',
          color: colors.green900,
          fontSize: 15,
          fontWeight: 700,
        }}
      >
        Anuluj
      </button>
    </div>
  )

  const show = tiles.length > 0 || pending.length > 0 || (opened && !repeating)
  const hint =
    error ?? (full ? (grouped ? FULL_HINT_REPEAT : FULL_HINT) : repeating ? HINT_REPEAT : HINT)
  const section = (show || chooser || error) && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {show && (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={label}>ZDJĘCIA</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: colors.muted }}>
              {tiles.length} z {PHOTO_LIMITS.perTask}
              {grouped ? ' razem' : ''}
            </span>
          </div>
          {body}
        </>
      )}
      {chooser}
      {(show || error) && (
        <span
          role={error ? 'alert' : undefined}
          style={{ fontSize: 12, lineHeight: 1.45, color: error ? ERROR : colors.muted }}
        >
          {hint}
        </span>
      )}
    </div>
  )

  return {
    input,
    section,
    addItem: show || chooser ? null : { label: 'Zdjęcie', onClick: open },
  }
}

const FULL_HINT = 'To już 5 zdjęć – usuń jedno, żeby dodać kolejne.'
const FULL_HINT_REPEAT =
  'To już 5 zdjęć (razem z tymi przy każdym powtórzeniu) – usuń jedno, żeby dodać kolejne.'

const tileBox = {
  position: 'relative',
  aspectRatio: '1',
  borderRadius: 14,
  overflow: 'hidden',
  background: colors.sand,
} as const
