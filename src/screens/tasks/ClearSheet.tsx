import { useState } from 'react'
import { Sheet } from '../../components/ui.tsx'
import { TrashIcon } from '../../components/icons.tsx'
import type { DateKey } from '../../data/dates.ts'
import { plural } from '../../data/plural.ts'
import type { Task } from '../../data/types.ts'
import { colors, fonts, priorities, shadows } from '../../theme'
import { CLEAR_OPTIONS, clearCandidates, type ClearOption } from './tasksView.ts'

const zadan = (n: number) => `${n} ${plural(n, ['zadanie', 'zadania', 'zadań'])}`

/** Arkusz „Wyczyść ogarnięte” (ZadaniaWyczysc.dc.html): wybrane ogarnięte → do kosza. */
export function ClearSheet({
  tasks,
  today,
  onClear,
  onClose,
}: {
  tasks: Task[]
  today: DateKey
  onClear: (ids: string[]) => void
  onClose: () => void
}) {
  const [option, setOption] = useState<ClearOption>('week')
  const ids = clearCandidates(tasks, today, option).map((t) => t.id)

  return (
    <Sheet open onClose={onClose} label="Wyczyść ogarnięte">
      <span style={{ fontFamily: fonts.serif, fontSize: 28, fontWeight: 500 }}>
        Wyczyść <em style={{ color: colors.brass700 }}>ogarnięte</em>
      </span>
      <span style={{ fontSize: 14, lineHeight: 1.45, color: colors.muted2, marginTop: -6 }}>
        Zadania trafią do Kosza. Przez 30 dni możesz je przywrócić, potem znikną same.
      </span>
      <div
        role="radiogroup"
        aria-label="Które usunąć"
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: colors.white,
          borderRadius: 20,
          boxShadow: shadows.card,
          overflow: 'hidden',
        }}
      >
        {CLEAR_OPTIONS.map((o, i) => {
          const on = o.id === option
          const n = clearCandidates(tasks, today, o.id).length
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setOption(o.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                minHeight: 56,
                padding: '0 18px',
                border: 0,
                background: 'transparent',
                borderBottom: i < CLEAR_OPTIONS.length - 1 ? `1px solid ${colors.line}` : 'none',
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  flex: 'none',
                  ...(on
                    ? { border: `7px solid ${colors.green900}`, background: colors.brass300 }
                    : { border: `2px solid ${colors.brass500}` }),
                }}
              />
              <span
                style={{
                  flex: 1,
                  textAlign: 'left',
                  fontSize: 16,
                  fontWeight: 700,
                  color: colors.green900,
                }}
              >
                {o.name}
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: colors.muted }}>{zadan(n)}</span>
            </button>
          )
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 8, marginTop: 4 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            height: 54,
            border: `1px solid ${colors.border}`,
            borderRadius: 27,
            background: colors.white,
            color: colors.green900,
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          Anuluj
        </button>
        <button
          type="button"
          onClick={() => ids.length && onClear(ids)}
          disabled={!ids.length}
          style={{
            height: 54,
            border: 0,
            borderRadius: 27,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontSize: 16,
            fontWeight: 800,
            background: ids.length ? priorities.high.line : colors.borderSoft,
            color: ids.length ? colors.white : colors.muted,
          }}
        >
          <TrashIcon />
          {ids.length ? `Do kosza (${ids.length})` : 'Nic do usunięcia'}
        </button>
      </div>
    </Sheet>
  )
}
