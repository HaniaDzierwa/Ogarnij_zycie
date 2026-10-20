import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { paths } from '../app/screens.ts'
import { Accent, Header } from '../components/Header.tsx'
import { Logo } from '../components/Logo.tsx'
import { BottomActions, Card, Screen } from '../components/ui.tsx'
import { useStore } from '../data/store.ts'
import { colors, fonts } from '../theme'

const label = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: '1.4px',
  color: colors.muted,
} as const

/** „482913” → „482 913” (tylko cyfry, najwyżej 6). */
function formatCode(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 6)
  return d.length > 3 ? `${d.slice(0, 3)} ${d.slice(3)}` : d
}

/**
 * 5e–f Dołącz do domu (Dolacz.dc.html, DolaczZnaleziono.dc.html) z tekstami z TEKSTY.md (#16, B6).
 * Etap 1: „Skanuj kod” i 6 cyfr od razu „znajdują” dom; link z zaproszenia: `?kod=123456`.
 * Prawdziwy aparat i sprawdzanie kodu w Firestore – etap 8.
 */
export function JoinScreen() {
  const { members, setUserName } = useStore()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const fromLink = formatCode(params.get('kod') ?? '')
  const [code, setCode] = useState(fromLink)
  const [found, setFound] = useState(fromLink.length === 7)
  const [name, setName] = useState('')

  // w etapie 2 lista domowników pochodzi z przykładowych danych (podgląd); bez nich – „w przygotowaniu”
  const owner = members.find((m) => m.role === 'owner') ?? members[0]
  const names = members.map((m) => m.name)
  const who = names.length > 1 ? `${names.slice(0, -1).join(', ')} i ${names.at(-1)}` : names[0]
  const shown = name.trim() || 'domownik'

  return (
    <Screen withTabBar={false} gap={18}>
      <Header
        back={{ to: paths.pierwsze, label: 'WITAJ' }}
        title={
          <>
            Dołącz <Accent>do domu</Accent>
          </>
        }
      />

      {!found ? (
        <>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 14,
              padding: '20px 18px',
              borderRadius: 26,
              background: colors.green900,
              color: colors.cream,
            }}
          >
            <span
              style={{
                position: 'relative',
                width: 200,
                height: 200,
                borderRadius: 22,
                background: colors.green800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <svg
                width="200"
                height="200"
                viewBox="0 0 200 200"
                fill="none"
                stroke={colors.brass300}
                strokeWidth="5"
                strokeLinecap="round"
                aria-hidden="true"
                style={{ position: 'absolute', left: 0, top: 0 }}
              >
                <path d="M24 64V36a12 12 0 0 1 12-12h28" />
                <path d="M136 24h28a12 12 0 0 1 12 12v28" />
                <path d="M176 136v28a12 12 0 0 1-12 12h-28" />
                <path d="M64 176H36a12 12 0 0 1-12-12v-28" />
              </svg>
              <span
                style={{
                  position: 'absolute',
                  left: 30,
                  right: 30,
                  top: 98,
                  height: 2,
                  background: 'rgba(232,201,142,0.8)',
                  boxShadow: '0 0 12px rgba(232,201,142,0.9)',
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: colors.onDarkMuted,
                  textAlign: 'center',
                  padding: '0 40px',
                  marginTop: 70,
                }}
              >
                Skieruj aparat na kod z telefonu domownika
              </span>
            </span>
            <button
              type="button"
              onClick={() => setFound(true)}
              style={{
                height: 48,
                padding: '0 22px',
                border: 0,
                borderRadius: 24,
                background: colors.brass300,
                color: colors.green900,
                fontSize: 15,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
                <path d="M4 12h16" />
              </svg>
              Skanuj kod
            </button>
          </div>

          <Card style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 18px' }}>
            <label htmlFor="kod" style={label}>
              ALBO WPISZ 6 CYFR
            </label>
            <input
              id="kod"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              placeholder="000 000"
              value={code}
              onChange={(e) => {
                const v = formatCode(e.target.value)
                setCode(v)
                if (v.length === 7) setFound(true)
              }}
              style={{
                height: 56,
                border: `1px solid ${colors.border}`,
                borderRadius: 16,
                padding: '0 16px',
                fontFamily: fonts.serif,
                fontSize: 28,
                letterSpacing: 8,
                textAlign: 'center',
                color: colors.green900,
                background: colors.white,
                outlineColor: colors.green900,
              }}
            />
            <span style={{ fontSize: 13, lineHeight: 1.45, color: colors.muted }}>
              Kod widać u osoby, która Cię zaprasza: Ustawienia › Domownicy › Zaproś. Jest ważny 10
              minut.
            </span>
            <span style={{ fontSize: 13, lineHeight: 1.45, color: colors.muted }}>
              Masz link? Otwórz go na tym telefonie – dołączysz od razu.
            </span>
          </Card>
        </>
      ) : !owner ? (
        // Prawdziwe dołączanie (kod w Firestore) – etap 8. Do tego czasu bez udawania „znalezionego domu”.
        <Card
          radius={26}
          style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '20px 20px' }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '1.6px',
              color: colors.brass700,
            }}
          >
            JUŻ NIEDŁUGO
          </span>
          <span style={{ fontFamily: fonts.serif, fontSize: 22, fontWeight: 500 }}>
            Dołączanie <em>w przygotowaniu</em>
          </span>
          <span style={{ fontSize: 15, lineHeight: 1.45, color: colors.muted2 }}>
            Dołączanie do domu kodem albo linkiem będzie gotowe w jednym z kolejnych kroków. Na
            razie załóż własny dom – domowników zaprosisz później.
          </span>
        </Card>
      ) : (
        <>
          <Card
            radius={26}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              padding: '24px 20px',
              textAlign: 'center',
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '1.6px',
                color: colors.success,
              }}
            >
              ZNALEZIONO DOM
            </span>
            <Logo size={56} color={colors.green900} check={colors.brass500} />
            <span
              style={{ fontFamily: fonts.serif, fontSize: 28, fontWeight: 500, lineHeight: 1.1 }}
            >
              Dom <em style={{ color: colors.brass700 }}>{owner.nameGenitive}</em>
            </span>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: colors.muted,
              }}
            >
              <span style={{ display: 'flex' }}>
                {members.map((m, i) => (
                  <span
                    key={m.uid}
                    style={{
                      width: 26,
                      height: 26,
                      marginLeft: i ? -8 : 0,
                      borderRadius: 13,
                      background: colors.green900,
                      color: colors.brass300,
                      fontFamily: fonts.serif,
                      fontStyle: 'italic',
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `2px solid ${colors.white}`,
                    }}
                  >
                    {m.name.charAt(0)}
                  </span>
                ))}
              </span>
              {who} · wszystkie kategorie i kalendarz
            </span>
          </Card>
          <Card style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '16px 18px' }}>
            <label htmlFor="imie" style={label}>
              JAK MAJĄ CIĘ WIDZIEĆ DOMOWNICY?
            </label>
            <input
              id="imie"
              type="text"
              maxLength={20}
              placeholder="np. Ola"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                height: 48,
                border: `1px solid ${colors.border}`,
                borderRadius: 14,
                padding: '0 14px',
                fontSize: 17,
                fontWeight: 700,
                color: colors.green900,
                background: colors.white,
                outlineColor: colors.green900,
              }}
            />
          </Card>
        </>
      )}

      <BottomActions>
        {found && !owner ? (
          <Link
            to={paths.pierwsze}
            style={{
              height: 56,
              borderRadius: 28,
              background: colors.green900,
              color: colors.cream,
              fontSize: 17,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
            }}
          >
            Załóż własny dom
          </Link>
        ) : found ? (
          <>
            <button
              type="button"
              onClick={() => {
                if (name.trim()) setUserName(name.trim())
                navigate(paths.start)
              }}
              style={{
                height: 56,
                border: 0,
                borderRadius: 28,
                background: colors.green900,
                color: colors.cream,
                fontSize: 17,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              Dołącz jako {shown}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.brass300}
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => {
                setFound(false)
                setCode('')
              }}
              style={{
                height: 44,
                border: 0,
                background: 'transparent',
                color: colors.brass700,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '1.2px',
              }}
            >
              TO NIE TEN DOM
            </button>
          </>
        ) : (
          <Link
            to={paths.start}
            style={{
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '1.2px',
              textDecoration: 'none',
            }}
          >
            ZACZNIJ BEZ DOMOWNIKÓW
          </Link>
        )}
      </BottomActions>
    </Screen>
  )
}
