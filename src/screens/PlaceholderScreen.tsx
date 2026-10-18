import { Link, useSearchParams } from 'react-router'
import type { Screen } from '../app/screens.ts'
import { Logo } from '../components/Logo.tsx'
import { colors, fonts, radii, sectionLabel, shadows } from '../theme'

/** Pusty ekran z nazwą i przejściami z projektu (etap 0; w etapie 1 zastąpią go prawdziwe ekrany). */
export function PlaceholderScreen({ screen }: { screen: Screen }) {
  const [params] = useSearchParams()
  const variants = [...params.entries()]

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: 16, paddingBottom: 48 }}>
      <header
        style={{
          height: 120,
          borderRadius: radii.header,
          background: colors.green900,
          color: colors.cream,
          padding: '14px 18px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Logo color={colors.cream} />
          <span style={{ ...sectionLabel, color: colors.brass300 }}>Ekran {screen.number}</span>
        </span>
        <h1 style={{ margin: 0, fontFamily: fonts.serif, fontSize: 24, fontWeight: 500 }}>
          {screen.name}
        </h1>
      </header>

      {variants.length > 0 && (
        <p style={{ color: colors.muted, margin: '16px 4px 0' }}>
          Wariant: {variants.map(([k, v]) => `${k} = ${v}`).join(', ')}
        </p>
      )}

      <h2 style={{ ...sectionLabel, color: colors.brass700, margin: '24px 4px 10px' }}>
        Przejścia
      </h2>
      <nav
        style={{
          background: colors.white,
          borderRadius: radii.card,
          boxShadow: shadows.card,
          overflow: 'hidden',
        }}
      >
        {screen.transitions.map((t, i) => (
          <Link
            key={t.to + t.label}
            to={t.to}
            style={{
              display: 'flex',
              alignItems: 'center',
              minHeight: 52,
              padding: '0 16px',
              borderTop: i === 0 ? 'none' : `1px solid ${colors.line}`,
              color: colors.green900,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            {t.label}
            <span aria-hidden="true" style={{ marginLeft: 'auto', color: colors.brass500 }}>
              ›
            </span>
          </Link>
        ))}
      </nav>

      <p style={{ color: colors.muted, fontSize: 13, margin: '16px 4px 0' }}>
        Projekt: {screen.source} · <Link to="/mapa">Mapa ekranów</Link>
      </p>
    </main>
  )
}
