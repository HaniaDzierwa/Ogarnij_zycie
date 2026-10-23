import { useState, type ReactNode } from 'react'
import { colors, newCategoryColors } from '../../theme'

const COLOR_NAMES = [
  'szałwiowy',
  'morski',
  'niebieski',
  'śliwkowy',
  'malinowy',
  'terakota',
  'mosiężny',
  'orzechowy',
]

/**
 * Formularz „Nowa kategoria” (arkusz „Nowe zadanie”, Ustawienia → Kategorie); z innymi napisami
 * także „Nowy priorytet” (Ustawienia → Priorytety, `children` – pole „Miejsce”).
 */
export function NewCategoryForm({
  id,
  onAdd,
  onCancel,
  title = 'NAZWA NOWEJ KATEGORII',
  placeholder = 'np. Pies, Ogród, Remont',
  submitLabel = 'Dodaj kategorię',
  colorLabel = 'Kolor kategorii',
  children,
}: {
  id: string
  onAdd: (name: string, color: string) => void
  onCancel: () => void
  title?: string
  placeholder?: string
  submitLabel?: string
  colorLabel?: string
  children?: ReactNode
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(newCategoryColors[0])
  const add = () => {
    const n = name.trim()
    if (n) onAdd(n, color)
  }
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: 12,
        borderRadius: 16,
        background: colors.cream,
      }}
    >
      <label
        htmlFor={id}
        style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.4px', color: colors.muted }}
      >
        {title}
      </label>
      <input
        id={id}
        type="text"
        autoFocus
        maxLength={40}
        placeholder={placeholder}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
        style={{
          height: 44,
          border: `1px solid ${colors.border}`,
          borderRadius: 14,
          padding: '0 14px',
          fontSize: 16,
          color: colors.green900,
          background: colors.white,
          outlineColor: colors.green900,
        }}
      />
      <ColorPicker label={colorLabel} value={color} onChange={setColor} ring={colors.cream} />
      {children}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            height: 42,
            border: `1px solid ${colors.border}`,
            borderRadius: 21,
            background: colors.white,
            color: colors.green900,
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          Anuluj
        </button>
        <button
          type="button"
          onClick={add}
          style={{
            height: 42,
            border: 0,
            borderRadius: 21,
            background: colors.green900,
            color: colors.cream,
            fontSize: 14,
            fontWeight: 800,
          }}
        >
          {submitLabel}
        </button>
      </div>
    </div>
  )
}

/** Wybór koloru: 8 kolorów nowych kategorii (DESIGN.md), z polską nazwą dla czytnika ekranu. */
export function ColorPicker({
  label,
  value,
  onChange,
  ring = colors.white,
}: {
  label: string
  value: string
  onChange: (color: string) => void
  /** Kolor tła pod wybranym (odstęp między kolorem a obwódką). */
  ring?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {newCategoryColors.map((c, i) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={c === value}
          aria-label={`Kolor ${COLOR_NAMES[i]}`}
          onClick={() => onChange(c)}
          style={{
            width: 30,
            height: 36,
            borderRadius: '15px 15px 6px 6px',
            border: 0,
            padding: 0,
            background: c,
            boxShadow: c === value ? `0 0 0 3px ${ring}, 0 0 0 5px ${colors.green900}` : 'none',
          }}
        />
      ))}
    </div>
  )
}

/** Przycisk „+ Nowa kategoria” (przerywana mosiężna ramka). */
export function NewCategoryButton({
  onClick,
  children = '+ Nowa kategoria',
}: {
  onClick: () => void
  children?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 36,
        padding: '0 14px',
        borderRadius: 18,
        border: `1px dashed ${colors.brass500}`,
        background: 'transparent',
        color: colors.brass700,
        fontSize: 13,
        fontWeight: 800,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}
