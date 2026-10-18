import { useState } from 'react'
import { Accent, Header } from '../components/Header.tsx'
import { Logo } from '../components/Logo.tsx'
import { TabBar } from '../components/TabBar.tsx'
import {
  Box,
  Card,
  Chip,
  Dot,
  Field,
  PrimaryButton,
  Screen,
  SectionLabel,
  Segmented,
  Sheet,
  SyncBadge,
  ToggleRow,
} from '../components/ui.tsx'
import { PlusIcon } from '../components/icons.tsx'
import { colors, defaultCategories, priorities, todayBadge } from '../theme'

/** Galeria elementów wspólnych – do porównania z projektem (etap 1, krok 1). */
export function ElementsScreen() {
  const [chip, setChip] = useState('Wszystkie')
  const [toggles, setToggles] = useState({ a: true, b: false })
  const [view, setView] = useState<'week' | 'month'>('week')
  const [group, setGroup] = useState<'cat' | 'prio'>('cat')
  const [sheet, setSheet] = useState(false)

  return (
    <Screen>
      <Header
        label={
          <>
            <Logo color={colors.green900} check={colors.brass500} />
            NAGŁÓWEK · DZIEŃ
          </>
        }
        tone="day"
        topRight={<SyncBadge tone="day" />}
        title={
          <>
            Dzień dobry, <Accent>Hania</Accent>
          </>
        }
      />
      <Header
        tone="night"
        label={
          <>
            <Logo color={colors.cream} />
            NAGŁÓWEK · NOC
          </>
        }
        topRight={<SyncBadge />}
        title={
          <>
            Dobry wieczór, <Accent>Hania</Accent>
          </>
        }
      />
      <Header
        label="ZADANIA · PIĄTEK 9 PAŹ"
        topRight={<SyncBadge />}
        title={
          <>
            Do <Accent>ogarnięcia</Accent>
          </>
        }
        aside={
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: '#5C2818',
              background: '#F3B9A4',
              padding: '5px 10px',
              borderRadius: 12,
            }}
          >
            4 pilne
          </span>
        }
      />
      <Header
        back={{ to: '/ustawienia', label: 'USTAWIENIA' }}
        topRight={
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '1.2px',
              color: colors.onDarkMuted2,
            }}
          >
            SYNCHRONIZACJA
          </span>
        }
        title={
          <>
            Wspólny <Accent>dom</Accent>
          </>
        }
        aside={
          <span style={{ fontSize: 12, fontWeight: 700, color: colors.onDarkMuted3 }}>
            z bliskimi
          </span>
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SectionLabel>Chipy</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {['Wszystkie', 'Pilne', 'Ważne', 'Przy okazji', 'Ogarnięte'].map((n) => (
            <Chip key={n} on={chip === n} onClick={() => setChip(n)}>
              {n}
            </Chip>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {defaultCategories.map((c) => (
            <Chip key={c.name} dot={<Dot color={c.color} />}>
              {c.name}
            </Chip>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SectionLabel>Priorytety i termin</SectionLabel>
        <Card>
          {Object.values(priorities).map((p, i) => (
            <div
              key={p.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 16px',
                borderTop: i === 0 ? 'none' : `1px solid ${colors.line}`,
              }}
            >
              <Box color={p.line} />
              <span style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>{p.label}</span>
              {i === 0 ? (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.6px',
                    color: todayBadge.fg,
                    background: todayBadge.bg,
                    padding: '4px 10px',
                    borderRadius: 10,
                  }}
                >
                  DZIŚ
                </span>
              ) : (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.6px',
                    color: colors.brass700,
                  }}
                >
                  {i === 1 ? 'JUTRO' : 'DO 15 PAŹ'}
                </span>
              )}
            </div>
          ))}
        </Card>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SectionLabel>Przełączniki</SectionLabel>
        <Card>
          <ToggleRow
            name="Terminy zadań"
            hint="Dzień przed terminem"
            on={toggles.a}
            onToggle={() => setToggles((t) => ({ ...t, a: !t.a }))}
          />
          <ToggleRow
            name="Poranne podsumowanie"
            hint="Codziennie o 8:00 – co pilne i co dziś"
            on={toggles.b}
            onToggle={() => setToggles((t) => ({ ...t, b: !t.b }))}
            last
          />
        </Card>
        <Segmented
          size="full"
          label="Widok kalendarza"
          value={view}
          onChange={setView}
          options={[
            { id: 'week', name: 'Tydzień' },
            { id: 'month', name: 'Miesiąc' },
          ]}
        />
        <div>
          <Segmented
            label="Grupuj"
            value={group}
            onChange={setGroup}
            options={[
              { id: 'cat', name: 'Kategoria' },
              { id: 'prio', name: 'Priorytet' },
            ]}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SectionLabel>Przycisk główny i arkusz</SectionLabel>
        <PrimaryButton onClick={() => setSheet(true)}>
          <span style={{ color: colors.brass300, display: 'flex' }}>
            <PlusIcon size={20} />
          </span>
          Otwórz arkusz
        </PrimaryButton>
      </div>

      <Sheet open={sheet} onClose={() => setSheet(false)} label="Przykładowy arkusz">
        <span style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 500 }}>
          Nowe <em style={{ color: colors.brass700 }}>zadanie</em>
        </span>
        <Field
          id="przyklad"
          label="CO TRZEBA ZROBIĆ?"
          placeholder="np. Odebrać paczkę z paczkomatu"
        />
        <PrimaryButton onClick={() => setSheet(false)}>Zamknij</PrimaryButton>
      </Sheet>

      <TabBar onAddTask={() => setSheet(true)} />
    </Screen>
  )
}
