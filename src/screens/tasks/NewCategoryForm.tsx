import { useState } from 'react'
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

/** Formularz „Nowa kategoria” (w panelu filtrów i w arkuszu „Nowe zadanie”). */
export function NewCategoryForm({
  id,
  onAdd,
  onCancel,
}: {
  id: string
  onAdd: (name: string, color: string) => void
  onCancel: () => void
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
        NAZWA NOWEJ KATEGORII
      </label>
      <input
        id={id}
        type="text"
        autoFocus
        placeholder="np. Pies, Ogród, Remont"
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
      <div
        role="radiogroup"
        aria-label="Kolor kategorii"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
      >
        {newCategoryColors.map((c, i) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={c === color}
            aria-label={`Kolor ${COLOR_NAMES[i]}`}
            onClick={() => setColor(c)}
            style={{
              width: 30,
              height: 36,
              borderRadius: '15px 15px 6px 6px',
              border: 0,
              padding: 0,
              background: c,
              boxShadow:
                c === color ? `0 0 0 3px ${colors.cream}, 0 0 0 5px ${colors.green900}` : 'none',
            }}
          />
        ))}
      </div>
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
          Dodaj kategorię
        </button>
      </div>
    </div>
  )
}

/** Przycisk „+ Nowa kategoria” (przerywana mosiężna ramka). */
export function NewCategoryButton({ onClick }: { onClick: () => void }) {
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
      + Nowa kategoria
    </button>
  )
}
