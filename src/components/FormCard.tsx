// Zwarte arkusze (etap 8, układ 1c z kanwy „Zadania cykliczne”): nazwa na wierzchu, poniżej karta
// z wierszami „ikona · nazwa · wartość · ˅”, które rozwijają się po dotknięciu (jeden naraz).

import { type ReactNode } from 'react'
import { colors, fonts, shadows } from '../theme'
import { PlusIcon } from './icons.tsx'

/** Biała karta z wierszami. */
export function FormCard({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: colors.white,
        borderRadius: 20,
        boxShadow: shadows.card,
        overflow: 'hidden',
        flex: 'none',
      }}
    >
      {children}
    </div>
  )
}

/**
 * Wiersz karty: dotknięcie rozwija `children` pod spodem. `value` – obecny wybór (tekst albo
 * plakietka). Pierwszy wiersz bez kreski u góry.
 */
export function FormRow({
  icon,
  label,
  value,
  open,
  onToggle,
  first = false,
  children,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  open: boolean
  onToggle: () => void
  first?: boolean
  children: ReactNode
}) {
  return (
    <div style={{ borderTop: first ? 0 : `1px solid ${colors.line}` }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          minHeight: 56,
          padding: '0 16px',
          border: 0,
          background: 'transparent',
          color: colors.green900,
          textAlign: 'left',
        }}
      >
        <span style={{ display: 'flex', color: colors.brass700, flex: 'none' }}>{icon}</span>
        <span style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>{label}</span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            minWidth: 0,
            fontSize: 14,
            fontWeight: 800,
            color: colors.brass700,
            textAlign: 'right',
          }}
        >
          {value}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9AA59D"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{
            flex: 'none',
            transition: 'transform 150ms ease',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '2px 16px 16px' }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

/** Kolorowa plakietka wartości (priorytet, rodzaj): „WAŻNE”, „● URODZINY”. */
export function ValueBadge({
  bg,
  fg,
  dot,
  children,
}: {
  bg: string
  fg: string
  dot?: string
  children: ReactNode
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 22,
        padding: '0 9px',
        borderRadius: 11,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: '0.8px',
        background: bg,
        color: fg,
        whiteSpace: 'nowrap',
        maxWidth: 150,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {dot && (
        <span style={{ width: 7, height: 7, borderRadius: 4, background: dot, flex: 'none' }} />
      )}
      {children}
    </span>
  )
}

/** Nazwa na wierzchu: mały napis („NOWE ZADANIE”) i duże pole z linią pod spodem. */
export function TitleField({
  id,
  kicker,
  label,
  placeholder,
  value,
  onChange,
  onEnter,
  autoFocus = false,
}: {
  id: string
  /** Mały napis nad polem; brak – bez napisu (tryb edycji ma status u góry). */
  kicker?: string
  /** Etykieta dla czytnika ekranu. */
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  onEnter?: () => void
  autoFocus?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {kicker && (
        <span
          aria-hidden="true"
          style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.6px', color: colors.brass700 }}
        >
          {kicker}
        </span>
      )}
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="text"
        autoFocus={autoFocus}
        maxLength={200}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
        style={{
          height: 52,
          border: 0,
          borderBottom: `1px solid ${colors.border}`,
          padding: '0 2px',
          background: 'transparent',
          fontFamily: fonts.serif,
          fontSize: 24,
          fontWeight: 500,
          color: colors.green900,
          outline: 'none',
          minWidth: 0,
        }}
      />
    </div>
  )
}

/** „+ Kroki”, „+ Notatka” – dodatki schowane, dopóki nie są potrzebne. */
export function AddMore({ items }: { items: { label: string; onClick: () => void }[] }) {
  if (!items.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: -4 }}>
      {items.map((it) => (
        <button
          key={it.label}
          type="button"
          onClick={it.onClick}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 40,
            padding: '0 16px',
            borderRadius: 20,
            border: `1px dashed ${colors.brass500}`,
            background: 'transparent',
            color: colors.brass700,
            fontSize: 14,
            fontWeight: 800,
          }}
        >
          <PlusIcon size={16} strokeWidth={2.4} />
          {it.label}
        </button>
      ))}
    </div>
  )
}
