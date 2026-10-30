import { CloseIcon, PlusIcon } from '../../components/icons.tsx'
import { useStore } from '../../data/store.ts'
import { MAX_SUMMARY_TIMES, type SummaryContent } from '../../data/types.ts'
import { colors, fonts } from '../../theme'

const CONTENT: { id: keyof SummaryContent; name: string }[] = [
  { id: 'urgent', name: 'Pilne' },
  { id: 'dueToday', name: 'Terminy na dziś (i po terminie)' },
  { id: 'dueTomorrow', name: 'Terminy na jutro' },
  { id: 'eventsToday', name: 'Wydarzenia dziś' },
  { id: 'eventsSoon', name: 'Wydarzenia jutro i za tydzień (wg przypomnienia)' },
]

const label = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: '1.4px',
  color: colors.muted,
} as const

/** Następna wolna pełna godzina po ostatniej („16:00” → „17:00”). */
function nextFreeTime(times: string[]): string {
  const last = times.length ? Number(times[times.length - 1].slice(0, 2)) : 7
  for (let i = 1; i <= 24; i++) {
    const t = `${String((last + i) % 24).padStart(2, '0')}:00`
    if (!times.includes(t)) return t
  }
  return '12:00'
}

/**
 * Ustawienia → Powiadomienia → pod „Podsumowania”: godziny (dowolne, co 15 min, 1–5) i „Co przychodzi”
 * – jeden zestaw kratek dla wszystkich godzin (decyzje Hani 2026-10-30).
 */
export function SummarySettings() {
  const { summaryTimes, summaryContent, setSummaryTimes, setSummaryContent } = useStore()
  const none = CONTENT.every((c) => !summaryContent[c.id])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '12px 18px 16px',
        borderBottom: `1px solid ${colors.line}`,
      }}
    >
      <span style={label}>GODZINY</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {summaryTimes.map((t, i) => (
          <span
            key={`${t}-${i}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
              padding: '0 4px 0 2px',
              border: `1px solid ${colors.border}`,
              borderRadius: 14,
              background: colors.white,
            }}
          >
            <input
              type="time"
              step={900}
              aria-label={`Godzina podsumowania ${i + 1}`}
              value={t}
              onChange={(e) =>
                e.target.value &&
                setSummaryTimes(summaryTimes.map((x, j) => (j === i ? e.target.value : x)))
              }
              style={{
                height: 42,
                border: 0,
                padding: '0 6px',
                background: 'transparent',
                fontFamily: fonts.serif,
                fontSize: 18,
                fontWeight: 600,
                color: colors.green900,
                outlineColor: colors.green900,
              }}
            />
            <button
              type="button"
              aria-label={`Usuń godzinę ${t}`}
              // zawsze zostaje co najmniej jedna – podsumowania wyłącza przełącznik (decyzja Hani)
              disabled={summaryTimes.length === 1}
              onClick={() => setSummaryTimes(summaryTimes.filter((_, j) => j !== i))}
              style={{
                width: 32,
                height: 42,
                border: 0,
                background: 'transparent',
                color: colors.muted,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: summaryTimes.length === 1 ? 0.3 : 1,
              }}
            >
              <CloseIcon />
            </button>
          </span>
        ))}
        {summaryTimes.length < MAX_SUMMARY_TIMES && (
          <button
            type="button"
            onClick={() => setSummaryTimes([...summaryTimes, nextFreeTime(summaryTimes)])}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 44,
              padding: '0 14px',
              border: `1px dashed ${colors.brass500}`,
              borderRadius: 14,
              background: 'transparent',
              color: colors.brass700,
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            <PlusIcon size={16} strokeWidth={2.4} />
            Dodaj godzinę
          </button>
        )}
      </div>

      <span style={{ ...label, marginTop: 4 }}>CO PRZYCHODZI</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {CONTENT.map((c) => (
          <label
            key={c.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              minHeight: 40,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={summaryContent[c.id]}
              onChange={() =>
                setSummaryContent({ ...summaryContent, [c.id]: !summaryContent[c.id] })
              }
              style={{ width: 20, height: 20, accentColor: colors.green900, flex: 'none' }}
            />
            <span style={{ fontSize: 15, color: colors.green900 }}>{c.name}</span>
          </label>
        ))}
      </div>
      {none && (
        <span role="note" style={{ fontSize: 13, color: '#A4492F', fontWeight: 700 }}>
          Zaznacz przynajmniej jedną rzecz – inaczej podsumowania będą puste.
        </span>
      )}
    </div>
  )
}
