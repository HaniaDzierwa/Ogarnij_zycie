import type { CSSProperties, ReactNode } from 'react'
import { useOnline } from '../data/useOnline.ts'
import { colors, priorities, radii, shadows, sizes } from '../theme'

/** Układ ekranu: kremowe tło, odstępy 16 px, miejsce na dolny pasek. */
export function Screen({
  children,
  gap = 20,
  withTabBar = true,
}: {
  children: ReactNode
  gap?: number
  withTabBar?: boolean
}) {
  return (
    <main
      style={{
        maxWidth: 480,
        margin: '0 auto',
        minHeight: '100dvh',
        padding: `calc(16px + env(safe-area-inset-top)) 16px ${
          withTabBar ? `calc(${sizes.listBottomPadding}px + env(safe-area-inset-bottom))` : '32px'
        }`,
        display: 'flex',
        flexDirection: 'column',
        gap,
      }}
    >
      {children}
    </main>
  )
}

/**
 * Plakietka „OFFLINE” w nagłówku – tylko gdy telefon nie ma internetu (zmiany wyślą się same,
 * gdy wróci). Online nic nie pokazuje (Firebase synchronizuje sam – decyzja Hani 2026-10-18).
 */
export function OfflineBadge({
  tone = 'dark',
  online: onlineProp,
}: {
  tone?: 'dark' | 'day'
  /** Domyślnie – stan sieci z przeglądarki. */
  online?: boolean
}) {
  const day = tone === 'day'
  const network = useOnline()
  if (onlineProp ?? network) return null
  return (
    <span
      role="status"
      aria-label="Offline – zmiany wyślą się same, gdy wróci internet"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        height: 28,
        padding: '0 10px',
        borderRadius: 14,
        border: `1px solid ${day ? 'rgba(31,61,46,0.3)' : 'rgba(232,201,142,0.5)'}`,
        color: day ? colors.green900 : colors.brass300,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: '0.6px',
        flex: 'none',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 3, background: colors.brass500 }} />
      OFFLINE
    </span>
  )
}

/** Biała karta z cieniem. */
export function Card({
  children,
  style,
  radius = radii.cardLarge,
}: {
  children: ReactNode
  style?: CSSProperties
  radius?: number
}) {
  return (
    <div
      style={{
        background: colors.white,
        borderRadius: radius,
        boxShadow: shadows.card,
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/** Etykieta sekcji: 11 px, 800, WERSALIKI. */
export function SectionLabel({
  children,
  color = colors.brass700,
  style,
}: {
  children: ReactNode
  color?: string
  style?: CSSProperties
}) {
  return (
    <span
      style={{
        padding: '0 4px',
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: '1.6px',
        textTransform: 'uppercase',
        color,
        ...style,
      }}
    >
      {children}
    </span>
  )
}

/** Chip 36 px; aktywny = zielone tło, kremowy tekst. */
export function Chip({
  on = false,
  onClick,
  children,
  dot,
}: {
  on?: boolean
  onClick?: () => void
  children: ReactNode
  dot?: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: sizes.chipHeight,
        padding: '0 14px',
        borderRadius: radii.chip,
        fontSize: 14,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        border: `1px solid ${on ? colors.green900 : colors.border}`,
        background: on ? colors.green900 : 'transparent',
        color: on ? colors.cream : colors.green900,
      }}
    >
      {dot}
      {children}
    </button>
  )
}

/** Kropka koloru (kategoria, rodzaj wydarzenia). */
export function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background: color,
        flex: 'none',
        display: 'inline-block',
      }}
    />
  )
}

/** Kwadracik priorytetu / pole odhaczenia (obrys w kolorze). */
export function Box({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size / 3),
        border: `2px solid ${color}`,
        flex: 'none',
        display: 'inline-block',
      }}
    />
  )
}

/** Przełącznik 46 × 28 (zielony + mosiężna gałka, gdy włączony). */
export function Toggle({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: 'relative',
        width: 46,
        height: 28,
        borderRadius: 14,
        flex: 'none',
        transition: 'background 150ms ease',
        background: on ? colors.green900 : colors.border,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 21 : 3,
          width: 22,
          height: 22,
          borderRadius: 11,
          background: on ? colors.brass300 : colors.white,
          boxShadow: '0 1px 3px rgba(31,61,46,0.25)',
          transition: 'left 150ms ease',
        }}
      />
    </span>
  )
}

/** Wiersz z przełącznikiem (np. Powiadomienia w Ustawieniach). */
export function ToggleRow({
  name,
  hint,
  on,
  onToggle,
  last = false,
}: {
  name: string
  hint?: string
  on: boolean
  onToggle: () => void
  last?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '12px 18px',
        minHeight: 64,
        border: 0,
        background: 'transparent',
        borderBottom: last ? 'none' : `1px solid ${colors.line}`,
      }}
    >
      <span
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, textAlign: 'left' }}
      >
        <span style={{ fontSize: 16, fontWeight: 700, color: colors.green900 }}>{name}</span>
        {hint && <span style={{ fontSize: 13, color: colors.muted }}>{hint}</span>}
      </span>
      <Toggle on={on} />
    </button>
  )
}

/**
 * Przełącznik segmentowy. `size="small"` – Zadania (Kategoria / Priorytet),
 * `size="full"` – Kalendarz (Tydzień / Miesiąc, pełna szerokość).
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'small',
}: {
  options: { id: T; name: string }[]
  value: T
  onChange: (v: T) => void
  label: string
  size?: 'small' | 'full'
}) {
  const full = size === 'full'
  return (
    <div
      role="radiogroup"
      aria-label={label}
      style={{
        display: full ? 'grid' : 'inline-flex',
        alignSelf: full ? 'stretch' : 'flex-start',
        gridTemplateColumns: full ? `repeat(${options.length}, minmax(0, 1fr))` : undefined,
        padding: 3,
        borderRadius: full ? 20 : 18,
        background: colors.sand,
      }}
    >
      {options.map((o) => {
        const on = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            style={{
              height: full ? 36 : 32,
              padding: full ? 0 : '0 14px',
              border: 0,
              borderRadius: full ? 17 : 16,
              fontSize: full ? 14 : 13,
              fontWeight: 800,
              background: on ? colors.white : 'transparent',
              color: on ? colors.green900 : colors.muted,
              boxShadow: on ? '0 1px 3px rgba(31,61,46,0.15)' : 'none',
            }}
          >
            {o.name}
          </button>
        )
      })}
    </div>
  )
}

/** Przycisk główny: 56 px, promień 28, zielony. */
export function PrimaryButton({
  children,
  onClick,
  type = 'button',
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        height: sizes.buttonHeight,
        border: 0,
        borderRadius: radii.button,
        background: colors.green900,
        color: colors.cream,
        fontSize: 17,
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        width: '100%',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  )
}

/** Arkusz wysuwany od dołu (bottom sheet) z przyciemnieniem; zamyka kliknięcie obok. */
export function Sheet({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean
  onClose: () => void
  label: string
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      style={{ position: 'fixed', inset: 0, zIndex: 40 }}
    >
      <button
        type="button"
        aria-label="Zamknij"
        onClick={onClose}
        className="fade-in"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          border: 0,
          background: 'rgba(31,61,46,0.5)',
        }}
      />
      <div
        className="sheet-up sheet-body"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          maxWidth: 480,
          margin: '0 auto',
          // zawsze zostaje pas przyciemnienia nad arkuszem – dotknięcie go zamyka arkusz
          maxHeight: 'calc(100dvh - 88px - env(safe-area-inset-top))',
          overflowY: 'auto',
          background: colors.creamLight,
          borderRadius: `${radii.sheet}px ${radii.sheet}px 0 0`,
          padding: '12px 22px calc(28px + env(safe-area-inset-bottom))',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 40,
            height: 4,
            borderRadius: 4,
            background: colors.border,
            alignSelf: 'center',
          }}
        />
        {children}
      </div>
    </div>
  )
}

/** Pole tekstowe z etykietą (min. 16 px – bez zoomu na iPhonie), podpowiedzią, błędem i przyciskiem z prawej. */
export function Field({
  id,
  label,
  hint,
  error,
  trailing,
  ...input
}: {
  id: string
  label: string
  hint?: string
  error?: string
  trailing?: ReactNode
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const describedBy = error ? `${id}-blad` : hint ? `${id}-podpowiedz` : undefined
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        htmlFor={id}
        style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.4px', color: colors.muted }}
      >
        {label}
      </label>
      <div style={{ position: 'relative', display: 'flex' }}>
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...input}
          style={{
            flex: 1,
            minWidth: 0,
            height: 50,
            border: `${error ? 2 : 1}px solid ${error ? priorities.high.line : colors.border}`,
            borderRadius: 16,
            padding: trailing ? '0 52px 0 16px' : '0 16px',
            fontSize: 16,
            color: colors.green900,
            background: colors.white,
            outlineColor: colors.green900,
            ...input.style,
          }}
        />
        {trailing && (
          <span style={{ position: 'absolute', right: 4, top: 3, bottom: 3, display: 'flex' }}>
            {trailing}
          </span>
        )}
      </div>
      {error ? (
        <span
          id={`${id}-blad`}
          role="alert"
          style={{ fontSize: 13, fontWeight: 700, color: priorities.high.fg }}
        >
          {error}
        </span>
      ) : (
        hint && (
          <span id={`${id}-podpowiedz`} style={{ fontSize: 13, color: colors.muted }}>
            {hint}
          </span>
        )
      )}
    </div>
  )
}

/** Okienko z pytaniem (np. „Usunąć zadanie?”) – na środku ekranu, z przyciemnieniem. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  danger = false,
}: {
  title: string
  message?: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <button
        type="button"
        aria-label="Anuluj"
        tabIndex={-1}
        onClick={onCancel}
        className="fade-in"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          border: 0,
          background: 'rgba(31,61,46,0.5)',
        }}
      />
      <div
        className="pop-center"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 340,
          background: colors.creamLight,
          borderRadius: 24,
          padding: '22px 20px 18px',
          boxShadow: shadows.popover,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <span style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 500 }}>
          {title}
        </span>
        {message && (
          <span style={{ fontSize: 15, lineHeight: 1.45, color: colors.muted2 }}>{message}</span>
        )}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 8,
            marginTop: 8,
          }}
        >
          <button
            type="button"
            autoFocus
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
            onClick={onConfirm}
            style={{
              height: 48,
              border: 0,
              borderRadius: 24,
              background: danger ? priorities.high.line : colors.green900,
              color: danger ? colors.white : colors.cream,
              fontSize: 15,
              fontWeight: 800,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Przyklejony dolny pasek z przyciskami (ekrany bez menu: Zaproś, Dołącz). Ostatni w <Screen>. */
export function BottomActions({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        margin: 'auto -16px -32px',
        padding: '12px 16px calc(24px + env(safe-area-inset-bottom))',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        background: colors.cream,
        boxShadow: `0 -1px 0 ${colors.borderSoft}`,
      }}
    >
      {children}
    </div>
  )
}
