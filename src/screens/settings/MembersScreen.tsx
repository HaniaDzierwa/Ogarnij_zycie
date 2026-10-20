import { Link, useSearchParams } from 'react-router'
import { paths } from '../../app/screens.ts'
import { Accent, Header } from '../../components/Header.tsx'
import { PlusIcon } from '../../components/icons.tsx'
import { TabBar } from '../../components/TabBar.tsx'
import { Card, Screen, SectionLabel } from '../../components/ui.tsx'
import { useStore } from '../../data/store.ts'
import type { Category, Member } from '../../data/types.ts'
import { colors, fonts } from '../../theme'

/**
 * 5a Domownicy (z Synchronizacja.dc.html bez części o synchronizacji – Firebase synchronizuje sam,
 * decyzja Hani 2026-10-18): lista domowników i „Zaproś domownika”; gdy nikogo – „Na razie tylko Ty”
 * (teksty #4–6). Podgląd pustego domu: `?stan=sam`.
 */
export function MembersScreen() {
  const { members, currentUid, categories } = useStore()
  const [params] = useSearchParams()
  const others = params.get('stan') === 'sam' ? [] : members.filter((m) => m.uid !== currentUid)

  return (
    <Screen>
      <Header
        back={{ to: paths.ustawienia, label: 'USTAWIENIA' }}
        topRight={
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '1.2px',
              color: colors.onDarkMuted2,
            }}
          >
            DOMOWNICY
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

      {others.length === 0 && (
        <Card
          radius={26}
          style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 20 }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '1.6px',
              color: colors.brass700,
            }}
          >
            TYLKO TY
          </span>
          <span style={{ fontFamily: fonts.serif, fontSize: 24, fontWeight: 500 }}>
            Na razie <em>tylko Ty</em>
          </span>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, color: colors.muted2 }}>
            Zadania i kalendarz są zapisane na Twoim koncie. Zaproś domownika, żeby mieć wspólny dom
            z bliskimi.
          </p>
        </Card>
      )}

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SectionLabel>DOMOWNICY</SectionLabel>
        <Card radius={22}>
          {others.map((m) => (
            <div
              key={m.uid}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 18px',
                minHeight: 64,
                borderBottom: `1px solid ${colors.line}`,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  background: colors.green900,
                  color: colors.brass300,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: fonts.serif,
                  fontStyle: 'italic',
                  fontSize: 18,
                  flex: 'none',
                }}
              >
                {m.name.charAt(0)}
              </span>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{m.name}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '1px',
                    color: colors.muted,
                  }}
                >
                  {scopeLabel(m, categories)}
                </span>
              </span>
              <span style={{ fontFamily: fonts.serif, fontSize: 14, color: colors.brass700 }}>
                {m.lastSeen.replace(/^DZIŚ /, '')}
              </span>
            </div>
          ))}
          <Link
            to={paths.zapros}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '0 18px',
              height: 58,
              color: colors.brass700,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '1px',
              textDecoration: 'none',
            }}
          >
            <PlusIcon size={20} strokeWidth={2.2} />
            ZAPROŚ DOMOWNIKA
          </Link>
        </Card>
      </section>

      <TabBar active="ustawienia" />
    </Screen>
  )
}

/** „WSZYSTKIE KATEGORIE I KALENDARZ” albo wybrane kategorie (zakres – etap 8). */
function scopeLabel(m: Member, categories: Category[]): string {
  const cats = m.scope.all
    ? 'WSZYSTKIE KATEGORIE'
    : categories
        .filter((c) => m.scope.categoryIds.includes(c.id))
        .map((c) => c.name.toUpperCase())
        .join(', ') || 'BEZ KATEGORII'
  return m.scope.calendar ? `${cats} I KALENDARZ` : cats
}
