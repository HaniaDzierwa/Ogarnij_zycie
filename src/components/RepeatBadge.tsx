import { repeatBadge, type Repeat } from '../data/repeat.ts'
import { colors } from '../theme'
import { RepeatIcon } from './icons.tsx'

/** „↻ CO TYDZIEŃ” przy zadaniu na liście i wydarzeniu w kalendarzu (etap 8). */
export function RepeatBadge({ repeat }: { repeat: Repeat }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: '0.8px',
        color: colors.muted,
        whiteSpace: 'nowrap',
      }}
    >
      <RepeatIcon />
      {repeatBadge(repeat)}
    </span>
  )
}
