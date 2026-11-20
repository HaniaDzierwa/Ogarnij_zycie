import { paths } from '../../app/screens.ts'
import { Accent, Header } from '../../components/Header.tsx'
import { TabBar } from '../../components/TabBar.tsx'
import { Card, Screen } from '../../components/ui.tsx'
import { useStore } from '../../data/store.ts'
import { colors } from '../../theme'
import { THEMES } from './appearance.ts'
import { ChoiceSegments } from './ChoiceSegments.tsx'

/**
 * Ustawienia → Wygląd (kanwa „Motyw jasny i ciemny”, decyzje Hani 2026-11-20): motyw
 * Systemowy (domyślnie) / Jasny / Ciemny; zmiana od razu, zapis na koncie – każdy domownik
 * ma swój motyw, ten sam na wszystkich swoich telefonach.
 */
export function AppearanceScreen() {
  const store = useStore()
  const current = THEMES.find((o) => o.id === store.theme) ?? THEMES[0]
  return (
    <Screen>
      <Header
        back={{ to: paths.ustawienia, label: 'USTAWIENIA' }}
        title={
          <>
            Wygląd <Accent>po swojemu</Accent>
          </>
        }
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Card radius={22}>
          <ChoiceSegments
            title="Motyw"
            hint={current.hint}
            options={THEMES}
            value={current.id}
            onChange={store.setTheme}
          />
        </Card>
        <span style={{ fontSize: 13, lineHeight: 1.45, color: colors.muted, padding: '0 6px' }}>
          Każdy domownik ma swój motyw.
        </span>
      </div>
      <TabBar active="ustawienia" />
    </Screen>
  )
}

/** Księżyc – ikona wiersza „Wygląd”. */
export function MoonIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
    </svg>
  )
}
