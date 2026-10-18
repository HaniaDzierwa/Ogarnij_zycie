import { useNavigate, useSearchParams } from 'react-router'
import { paths } from '../app/screens.ts'
import { RIDGE_FAR, RIDGE_NEAR } from '../components/Header.tsx'
import { Logo } from '../components/Logo.tsx'
import { isDaytime } from '../data/dates.ts'
import { colors, dayHeader, fonts } from '../theme'

/**
 * 1 Ładowanie. Słońce 6:00–18:00, księżyc 18:00–6:00 (podgląd: `?pora=dzien` / `?pora=noc`).
 * Projekt: styl banera z „Pierwszego uruchomienia” i nagłówka Startu (Powitanie.dc.html nie ma w eksporcie).
 * Na starcie aplikacji (`waiting`) widać go, dopóki wczytuje się konto, i znika sam.
 * Pod `/ladowanie` (podgląd) dotknięcie przechodzi do logowania.
 */
export function LoadingScreen({ waiting = false }: { waiting?: boolean }) {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const pora = params.get('pora')
  const day = pora === 'dzien' ? true : pora === 'noc' ? false : isDaytime()

  const bg = day ? dayHeader.bg : colors.green900
  const fg = day ? colors.green900 : colors.cream
  const accent = day ? colors.brass700 : colors.brass300

  return (
    <button
      type="button"
      aria-label={
        waiting
          ? 'Ogarnij życie – wczytywanie'
          : 'Ogarnij życie – wczytywanie. Dotknij, aby przejść dalej.'
      }
      onClick={() => !waiting && navigate(paths.logowanie)}
      style={{
        position: 'fixed',
        inset: 0,
        border: 0,
        padding: 0,
        background: bg,
        color: fg,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'default',
      }}
    >
      <Sky day={day} />

      <span
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          marginTop: -60,
          padding: '0 24px',
          textAlign: 'center',
        }}
      >
        <span className="loading-pop" style={{ display: 'flex' }}>
          <Logo
            size={96}
            color={day ? colors.green900 : colors.cream}
            check={day ? colors.brass500 : colors.brass300}
          />
        </span>
        <span
          className="loading-rise"
          style={{ fontFamily: fonts.serif, fontSize: 40, lineHeight: 1.05, fontWeight: 500 }}
        >
          Ogarnij <em style={{ fontStyle: 'italic', color: accent }}>życie</em>
        </span>
        <span
          className="loading-rise"
          style={{
            fontSize: 15,
            lineHeight: 1.4,
            color: day ? colors.muted2 : colors.onDarkMuted,
            animationDelay: '120ms',
          }}
        >
          Zadania, zakupy i kalendarz całego domu
          <br />w jednym miejscu.
        </span>
        <span aria-hidden="true" style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="loading-dot"
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                background: accent,
                animationDelay: `${i * 180}ms`,
              }}
            />
          ))}
        </span>
      </span>

      <svg
        aria-hidden="true"
        width="100%"
        height="100"
        viewBox="0 0 358 56"
        preserveAspectRatio="xMidYMax slice"
        style={{ position: 'absolute', left: 0, bottom: 0 }}
      >
        <path d={RIDGE_FAR} fill={day ? dayHeader.roofsFar : colors.green800} />
        <path d={RIDGE_NEAR} fill={day ? dayHeader.roofsNear : colors.green700} />
        {!day && (
          <>
            <rect
              className="loading-window"
              x="104"
              y="36"
              width="7"
              height="8"
              rx="1.2"
              fill={colors.brass300}
            />
            <rect
              className="loading-window"
              x="252"
              y="34"
              width="7"
              height="8"
              rx="1.2"
              fill={colors.brass300}
              style={{ animationDelay: '600ms' }}
            />
          </>
        )}
      </svg>
    </button>
  )
}

/** Słońce z promieniami albo księżyc z gwiazdkami (prawy górny róg). */
function Sky({ day }: { day: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="100%"
      height="260"
      viewBox="0 0 390 260"
      preserveAspectRatio="xMaxYMin meet"
      style={{ position: 'absolute', left: 0, top: 'env(safe-area-inset-top)' }}
    >
      {day ? (
        <g className="loading-sun" style={{ transformOrigin: '310px 110px' }}>
          <g
            className="loading-rays"
            stroke={dayHeader.sun}
            strokeWidth="4"
            strokeLinecap="round"
            style={{ transformOrigin: '310px 110px' }}
          >
            {Array.from({ length: 8 }, (_, i) => (
              <path key={i} d="M310 62v10" transform={`rotate(${i * 45} 310 110)`} />
            ))}
          </g>
          <circle cx="310" cy="110" r="24" fill={dayHeader.sun} />
        </g>
      ) : (
        <g>
          <g className="loading-moon">
            <circle cx="300" cy="104" r="26" fill={colors.brass300} />
            <circle cx="312" cy="96" r="23" fill={colors.green900} />
          </g>
          {[
            [60, 70, 1.8, 0],
            [118, 44, 1.3, 400],
            [232, 58, 1.5, 800],
            [180, 112, 1.1, 1200],
            [352, 160, 1.4, 600],
            [36, 168, 1.2, 1000],
          ].map(([cx, cy, r, delay]) => (
            <circle
              key={`${cx}-${cy}`}
              className="loading-star"
              cx={cx}
              cy={cy}
              r={r}
              fill={colors.brass300}
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </g>
      )}
    </svg>
  )
}
