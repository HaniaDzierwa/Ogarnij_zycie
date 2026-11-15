import { useState } from 'react'
import {
  REPEAT_CHOICES,
  REPEAT_MAX_DAYS,
  REPEAT_MIN_DAYS,
  repeatHint,
  type Repeat,
} from '../data/repeat.ts'
import { colors } from '../theme'

/**
 * Wybór powtarzania (etap 8): 6 równych przycisków w dwóch kolumnach, przy „Co X dni” pole
 * „Co [ 3 ] dni”, pod spodem „Co tydzień w piątek. Kolejne: …”. `start` – termin / dzień
 * wydarzenia (bez niego nie ma podpowiedzi).
 */
export function RepeatField({
  id,
  value,
  start,
  onChange,
}: {
  id: string
  value: Repeat | undefined
  start: string | null
  onChange: (r: Repeat | undefined) => void
}) {
  // tekst w polu „Co [ ] dni” – poprawiany dopiero po wyjściu z pola (da się wpisać „15”)
  const [daysText, setDaysText] = useState(String(value?.n ?? 3))
  const typed = parseInt(daysText, 10)
  const days = Number.isNaN(typed)
    ? REPEAT_MIN_DAYS
    : Math.max(REPEAT_MIN_DAYS, Math.min(REPEAT_MAX_DAYS, typed))

  return (
    <>
      <div
        role="radiogroup"
        aria-label="Jak często"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}
      >
        {REPEAT_CHOICES.map((c) => {
          const on = (value?.every ?? null) === c.id
          return (
            <button
              key={c.name}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() =>
                onChange(
                  c.id === null
                    ? undefined
                    : c.id === 'days'
                      ? { every: 'days', n: days }
                      : { every: c.id },
                )
              }
              style={{
                height: 40,
                padding: '0 8px',
                borderRadius: 20,
                border: `1px solid ${on ? colors.green900 : colors.border}`,
                background: on ? colors.green900 : 'transparent',
                color: on ? colors.cream : colors.green900,
                fontSize: 14,
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              {c.name}
            </button>
          )
        })}
      </div>
      {value?.every === 'days' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            height: 48,
            boxSizing: 'border-box',
            padding: '0 16px',
            border: `1px solid ${colors.border}`,
            borderRadius: 14,
            background: colors.white,
          }}
        >
          <label htmlFor={id} style={{ fontSize: 16, fontWeight: 700, color: colors.muted }}>
            Co
          </label>
          <input
            id={id}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={3}
            aria-label="Co ile dni"
            value={daysText}
            onChange={(e) => {
              const t = e.target.value.replace(/[^0-9]/g, '').slice(0, 3)
              setDaysText(t)
              const n = parseInt(t, 10)
              if (!Number.isNaN(n) && n >= REPEAT_MIN_DAYS && n <= REPEAT_MAX_DAYS)
                onChange({ every: 'days', n })
            }}
            onBlur={() => {
              setDaysText(String(days))
              onChange({ every: 'days', n: days })
            }}
            style={{
              flex: 1,
              minWidth: 0,
              height: 46,
              border: 0,
              padding: 0,
              textAlign: 'center',
              fontSize: 18,
              fontWeight: 800,
              color: colors.green900,
              background: 'transparent',
              outline: 'none',
            }}
          />
          <span style={{ fontSize: 16, fontWeight: 700, color: colors.muted }}>dni</span>
        </div>
      )}
      {value && start && (
        <span style={{ fontSize: 13, lineHeight: 1.45, color: colors.muted }}>
          {repeatHint(value, start)}
        </span>
      )}
    </>
  )
}
