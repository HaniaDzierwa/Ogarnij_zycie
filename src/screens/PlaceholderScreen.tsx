import { Link, useSearchParams } from 'react-router'
import type { Screen as ScreenDef } from '../app/screens.ts'
import { Header } from '../components/Header.tsx'
import { Logo } from '../components/Logo.tsx'
import { TabBar } from '../components/TabBar.tsx'
import { Card, Screen, SectionLabel, OfflineBadge } from '../components/ui.tsx'
import { ChevronRightIcon } from '../components/icons.tsx'
import { colors } from '../theme'

/** Pusty ekran z nazwą i przejściami z projektu – do czasu, aż powstanie prawdziwy ekran (etap 1). */
export function PlaceholderScreen({ screen }: { screen: ScreenDef }) {
  const [params] = useSearchParams()
  const variants = [...params.entries()]

  return (
    <Screen withTabBar={!!screen.tab}>
      <Header
        back={screen.back}
        label={
          <>
            <Logo color={colors.cream} />
            EKRAN {screen.number}
          </>
        }
        topRight={screen.tab ? <OfflineBadge /> : undefined}
        title={screen.name}
      />

      {variants.length > 0 && (
        <p style={{ color: colors.muted, margin: '0 4px' }}>
          Wariant: {variants.map(([k, v]) => `${k} = ${v}`).join(', ')}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SectionLabel>Przejścia</SectionLabel>
        <Card>
          <nav>
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
                <span style={{ marginLeft: 'auto', color: colors.brass500, display: 'flex' }}>
                  <ChevronRightIcon />
                </span>
              </Link>
            ))}
          </nav>
        </Card>
      </div>

      <p style={{ color: colors.muted, fontSize: 13, margin: '0 4px' }}>
        Projekt: {screen.source} · <Link to="/mapa">Mapa ekranów</Link> ·{' '}
        <Link to="/elementy">Elementy</Link>
      </p>

      {screen.tab && <TabBar active={screen.tab} />}
    </Screen>
  )
}
