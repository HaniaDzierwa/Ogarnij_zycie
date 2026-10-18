import { Link } from 'react-router'
import { screens } from '../app/screens.ts'
import { colors, fonts, radii, shadows } from '../theme'

/** Lista wszystkich ekranów – pomoc na czas budowy (etapy 0–1). */
export function MapScreen() {
  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
      <h1
        style={{ fontFamily: fonts.serif, fontSize: 24, fontWeight: 500, margin: '8px 4px 16px' }}
      >
        Mapa <em style={{ color: colors.brass700 }}>ekranów</em>
      </h1>
      <nav
        style={{
          background: colors.white,
          borderRadius: radii.card,
          boxShadow: shadows.card,
          overflow: 'hidden',
        }}
      >
        {screens.map((s, i) => (
          <Link
            key={s.id}
            to={s.path}
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              minHeight: 56,
              padding: '8px 16px',
              borderTop: i === 0 ? 'none' : `1px solid ${colors.line}`,
              color: colors.green900,
              textDecoration: 'none',
            }}
          >
            <span style={{ fontWeight: 700 }}>
              {s.number} {s.name}
            </span>
            <span style={{ fontSize: 13, color: colors.muted }}>{s.path}</span>
          </Link>
        ))}
      </nav>
    </main>
  )
}
