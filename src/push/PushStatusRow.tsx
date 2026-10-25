import { colors } from '../theme'
import type { PushState } from './push.ts'

const TEXT: Record<PushState, string> = {
  on: 'Włączone',
  off: 'Wyłączone',
  denied: 'Zablokowane w przeglądarce',
  unsupported: 'Ta przeglądarka ich nie obsługuje',
  'ios-install': 'Najpierw dodaj stronę do ekranu głównego',
}

/** Ustawienia → Powiadomienia: czy ten telefon je dostaje; „Włącz” (zgoda przeglądarki). */
export function PushStatusRow({
  push,
}: {
  push: { state: PushState | null; error: string | null; busy: boolean; enable: () => void }
}) {
  if (!push.state) return null
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '14px 18px',
        borderBottom: `1px solid ${colors.line}`,
        background: colors.cream,
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
      >
        <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: colors.green900 }}>
            Na tym telefonie
          </span>
          <span
            style={{
              fontSize: 13,
              color: push.state === 'on' ? colors.successText : colors.muted,
            }}
          >
            {TEXT[push.state]}
          </span>
        </span>
        {push.state === 'off' && (
          <button
            type="button"
            onClick={push.enable}
            disabled={push.busy}
            style={{
              height: 40,
              padding: '0 16px',
              border: 0,
              borderRadius: 20,
              background: colors.green900,
              color: colors.cream,
              fontSize: 14,
              fontWeight: 800,
              flex: 'none',
              opacity: push.busy ? 0.6 : 1,
            }}
          >
            {push.busy ? 'Włączam…' : 'Włącz'}
          </button>
        )}
      </div>
      {push.state === 'ios-install' && (
        <span style={{ fontSize: 13, lineHeight: 1.45, color: colors.muted2 }}>
          W Safari: „Udostępnij” → „Do ekranu początkowego” → „Dodaj”, potem otwórz aplikację z
          ikony.
        </span>
      )}
      {push.error && (
        <span role="alert" style={{ fontSize: 13, fontWeight: 700, color: '#A4492F' }}>
          {push.error}
        </span>
      )}
    </div>
  )
}
