import { dueBadge, type DateKey, type DueLevel } from '../data/dates.ts'
import { dueBadgeColors } from '../theme'
import { ClockIcon } from './icons.tsx'

/**
 * Plakietka terminu zadania: obwódka + zegar (decyzja Hani 2026-11-15).
 * `done` – przy ogarniętym zadaniu termin już nie pogania (zawsze najspokojniejszy poziom).
 */
export function DueBadge({
  due,
  today,
  week = false,
  done = false,
}: {
  due: DateKey
  today: DateKey
  week?: boolean
  done?: boolean
}) {
  const badge = dueBadge(due, today, week)
  const level: DueLevel = done ? 'far' : badge.level
  const c = dueBadgeColors[level]
  return (
    <span
      data-level={level}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        height: 22,
        boxSizing: 'border-box',
        padding: '0 9px',
        borderRadius: 11,
        border: `1.5px solid ${c.border}`,
        background: c.bg,
        color: c.fg,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: '0.6px',
        whiteSpace: 'nowrap',
      }}
    >
      <ClockIcon />
      {badge.label}
    </span>
  )
}
