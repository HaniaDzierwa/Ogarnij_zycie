import { colors } from '../../theme'

/**
 * Wybór jednej z kilku opcji w karcie Ustawień (Sprzątanie ogarniętych, Motyw):
 * tytuł, podpowiedź do wybranej opcji i przyciski w jednym rzędzie.
 */
export function ChoiceSegments<T extends string | number | null>({
  title,
  hint,
  options,
  value,
  onChange,
  divider = false,
}: {
  title: string
  hint: string
  options: { id: T; name: string }[]
  value: T
  onChange: (id: T) => void
  /** Linia pod spodem (gdy w karcie jest coś dalej). */
  divider?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '14px 18px',
        borderBottom: divider ? `1px solid ${colors.line}` : undefined,
      }}
    >
      <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ fontSize: 16, fontWeight: 700 }}>{title}</span>
        <span style={{ fontSize: 13, color: colors.muted }}>{hint}</span>
      </span>
      <div
        role="radiogroup"
        aria-label={title}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
          gap: 4,
          padding: 3,
          borderRadius: 16,
          background: colors.sand,
        }}
      >
        {options.map((o) => {
          const on = o.id === value
          return (
            <button
              key={o.name}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.id)}
              style={{
                height: 36,
                border: 0,
                borderRadius: 13,
                fontSize: 13,
                fontWeight: 800,
                background: on ? colors.segOn : 'transparent',
                color: on ? colors.green900 : colors.muted,
                boxShadow: on ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                transition: 'background 150ms ease',
              }}
            >
              {o.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
