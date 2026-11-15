import { useState } from 'react'
import { Chip } from '../../components/ui.tsx'
import { DueBadge } from '../../components/DueBadge.tsx'
import { addDays, dueLabel, type DateKey } from '../../data/dates.ts'
import { colors } from '../../theme'
import { DUE_PRESETS, presetDue, presetOf, type DueValue } from './duePresets.ts'

/**
 * Wybór terminu w arkuszach zadania (dodawanie i edycja): przyciski, „Inna data” (kalendarz
 * telefonu) i podgląd plakietki, jaką zadanie dostanie na liście (decyzja Hani 2026-11-15).
 */
export function DueField({
  id,
  value,
  today,
  onChange,
}: {
  id: string
  value: DueValue
  today: DateKey
  onChange: (v: DueValue) => void
}) {
  const { due, dueWeek } = value
  const preset = presetOf(due, dueWeek, today)
  const [customOpen, setCustomOpen] = useState(false)
  const showCustom = customOpen || (!preset && due !== null)

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {DUE_PRESETS.map((p) => (
          <Chip
            key={p}
            on={!showCustom && preset === p}
            onClick={() => {
              setCustomOpen(false)
              onChange(presetDue(p, today))
            }}
          >
            {p}
          </Chip>
        ))}
        <Chip
          on={showCustom}
          onClick={() => {
            setCustomOpen(true)
            onChange({ due: due ?? addDays(today, 7), dueWeek: false })
          }}
        >
          {showCustom && due ? dueLabel(due, today) : 'Inna data'}
        </Chip>
      </div>
      {showCustom && (
        <>
          <label htmlFor={id} className="sr-only">
            Data terminu
          </label>
          <input
            id={id}
            type="date"
            value={due ?? ''}
            onChange={(e) => e.target.value && onChange({ due: e.target.value, dueWeek: false })}
            style={{
              height: 48,
              border: `1px solid ${colors.border}`,
              borderRadius: 14,
              padding: '0 14px',
              fontSize: 16,
              color: colors.green900,
              background: colors.white,
              outlineColor: colors.green900,
            }}
          />
        </>
      )}
      {due && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            fontWeight: 700,
            color: colors.muted,
          }}
        >
          Na liście:
          <DueBadge due={due} today={today} week={dueWeek} />
        </div>
      )}
    </>
  )
}
