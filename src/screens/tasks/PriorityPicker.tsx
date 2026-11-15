import { Box } from '../../components/ui.tsx'
import { useStore } from '../../data/store.ts'
import { colors } from '../../theme'

/**
 * Wybór priorytetu (arkusze zadania): wbudowane i własne priorytety domu w kolejności, jako
 * zawijane chipy z kwadracikiem w kolorze – mieści dowolnie wiele własnych (etap 8, ekran 1e).
 */
export function PriorityPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (id: string) => void
}) {
  const { priorities } = useStore()
  return (
    <div
      role="radiogroup"
      aria-label="Priorytet"
      style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
    >
      {priorities.map((p) => {
        const on = value === p.id
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(p.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              height: 36,
              padding: '0 14px',
              borderRadius: 18,
              fontSize: 14,
              fontWeight: 700,
              border: `1px solid ${on ? colors.green900 : colors.border}`,
              background: on ? colors.green900 : 'transparent',
              color: on ? colors.cream : colors.green900,
              whiteSpace: 'nowrap',
            }}
          >
            <Box color={on ? colors.brass300 : p.line} size={12} />
            {p.label}
          </button>
        )
      })}
    </div>
  )
}
