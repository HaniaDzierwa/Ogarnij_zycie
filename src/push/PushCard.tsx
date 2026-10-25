import { useState } from 'react'
import { Card, PrimaryButton } from '../components/ui.tsx'
import { colors, fonts } from '../theme'
import { usePush } from './usePush.ts'

const DISMISSED = 'ogarnij:karta-powiadomien'

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED) === '1'
  } catch {
    return false
  }
}

/**
 * Start: „Włączyć przypomnienia?” – po pierwszym uruchomieniu, dopóki powiadomienia na tym
 * telefonie są wyłączone i karta nie została odłożona (decyzja Hani 2026-10-18). Na iPhonie
 * w Safari zamiast tego – jak dodać stronę do ekranu głównego.
 */
export function PushCard() {
  const push = usePush()
  const [hidden, setHidden] = useState(wasDismissed)
  if (hidden || (push.state !== 'off' && push.state !== 'ios-install')) return null

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED, '1')
    } catch {
      // bez pamięci przeglądarki – karta wróci przy następnym otwarciu
    }
    setHidden(true)
  }

  const ios = push.state === 'ios-install'
  return (
    <Card
      radius={22}
      style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '18px 18px 14px' }}
    >
      <span
        style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.6px', color: colors.brass700 }}
      >
        POWIADOMIENIA
      </span>
      <span style={{ fontFamily: fonts.serif, fontSize: 22, fontWeight: 500, lineHeight: 1.2 }}>
        {ios ? (
          <>
            Dodaj do <em style={{ color: colors.brass700 }}>ekranu głównego</em>
          </>
        ) : (
          <>
            Włączyć <em style={{ color: colors.brass700 }}>przypomnienia?</em>
          </>
        )}
      </span>
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, color: colors.muted2 }}>
        {ios
          ? 'Na iPhonie powiadomienia działają tylko z ikony na ekranie głównym. W Safari dotknij „Udostępnij” (kwadrat ze strzałką) → „Do ekranu początkowego” → „Dodaj”, a potem otwórz Ogarnij życie z tej ikony.'
          : 'Przypomnimy o terminach zadań i wydarzeniach, a rano – co pilne i co dziś. Dowiesz się też, gdy domownik coś doda lub ogarnie. Zmienisz to w Ustawieniach.'}
      </p>
      {push.error && (
        <span role="alert" style={{ fontSize: 14, fontWeight: 700, color: '#A4492F' }}>
          {push.error}
        </span>
      )}
      {!ios && (
        <PrimaryButton onClick={push.enable} disabled={push.busy}>
          {push.busy ? 'Włączam…' : 'Włącz powiadomienia'}
        </PrimaryButton>
      )}
      <button
        type="button"
        onClick={dismiss}
        style={{
          height: 40,
          border: 0,
          background: 'transparent',
          color: colors.brass700,
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: '1.2px',
        }}
      >
        {ios ? 'ROZUMIEM' : 'NIE TERAZ'}
      </button>
    </Card>
  )
}
