import { Box } from '../../components/ui.tsx'
import { useStore } from '../../data/store.ts'
import { colors } from '../../theme'

/**
 * Wybór priorytetu (arkusz nowego zadania i arkusz zadania): wbudowane i własne priorytety domu
 * w kolejności, po 3 w rzędzie.
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
      style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              height: 48,
              padding: '0 8px',
              borderRadius: 16,
              fontSize: 15,
              fontWeight: 700,
              border: on ? `2px solid ${p.line}` : `1px solid ${colors.border}`,
              background: on ? p.bg : colors.white,
              color: on ? p.fg : colors.green900,
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            <Box color={p.line} size={14} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.label}</span>
          </button>
        )
      })}
    </div>
  )
}
