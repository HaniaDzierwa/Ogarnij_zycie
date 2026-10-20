import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { paths } from '../app/screens.ts'
import { Accent, Header } from '../components/Header.tsx'
import { Logo } from '../components/Logo.tsx'
import { BottomActions, Card, Screen } from '../components/ui.tsx'
import {
  JoinError,
  joinErrorMessage,
  useHouse,
  type InvitePreview,
  type Scope,
} from '../house/house.ts'
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

/** Co zobaczy domownik – z zaproszenia (nazw kategorii dołączający jeszcze nie zna). */
function scopeText(scope: Scope): string {
  if (scope.all) return 'wszystkie kategorie i kalendarz'
  const cats = scope.categoryIds.length
  if (!cats) return 'tylko kalendarz'
  const what = cats === 1 ? '1 kategoria' : `${cats} ${cats < 5 ? 'kategorie' : 'kategorii'}`
  return scope.calendar ? `${what} i kalendarz` : what
}

const messageOf = (e: unknown) => joinErrorMessage(e instanceof JoinError ? e.code : 'unknown')

/**
 * 5e–f Dołącz do domu (Dolacz.dc.html, DolaczZnaleziono.dc.html) z tekstami z TEKSTY.md (#16, B6),
 * bez skanera QR. 6 cyfr albo link z zaproszenia (`?kod=123456`) → zaproszenie z Firestore
 * („Znaleziono dom”) → „Dołącz jako …” zapisuje domownika i otwiera Start.
 */
export function JoinScreen() {
  const house = useHouse()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const fromLink = formatCode(params.get('kod') ?? '')
  const [code, setCode] = useState(fromLink)
  const [found, setFound] = useState<InvitePreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState(house.profile?.name ?? '')

  const find = async (formatted: string) => {
    setBusy(true)
    setError(null)
    try {
      setFound(await house.findInvite(formatted.replace(' ', '')))
    } catch (e) {
      setError(messageOf(e))
    } finally {
      setBusy(false)
    }
  }

  // link z zaproszenia – od razu szukamy domu
  const fromLinkDone = useRef(false)
  useEffect(() => {
    if (fromLinkDone.current || fromLink.length !== 7) return
    fromLinkDone.current = true
    void find(fromLink)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tylko raz, po otwarciu linku
  }, [])

  const join = async () => {
    if (!found || !name.trim()) return
    setBusy(true)
    setError(null)
    try {
      await house.joinHouse(found.code, name.trim())
      navigate(paths.start)
    } catch (e) {
      setError(messageOf(e))
      setBusy(false)
    }
  }

  const names = found?.memberNames ?? []
  const who = names.length > 1 ? `${names.slice(0, -1).join(', ')} i ${names.at(-1)}` : names[0]
  const shown = name.trim() || 'domownik'
  // „Dom na Leśnej” → Dom *na Leśnej*
  const [head, ...rest] = (found?.houseName ?? '').split(' ')
  const tail = rest.join(' ')

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
          <Card style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 18px' }}>
            <label htmlFor="kod" style={label}>
              WPISZ 6 CYFR
            </label>
            <input
              id="kod"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              placeholder="000 000"
              value={code}
              disabled={busy}
              onChange={(e) => {
                const v = formatCode(e.target.value)
                setCode(v)
                setError(null)
                if (v.length === 7) find(v)
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
            {(busy || error) && (
              <span
                role={error ? 'alert' : 'status'}
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  lineHeight: 1.4,
                  color: error ? '#A4492F' : colors.green900,
                }}
              >
                {error ?? 'Szukam domu…'}
              </span>
            )}
            <span style={{ fontSize: 13, lineHeight: 1.45, color: colors.muted }}>
              Kod widać u osoby, która Cię zaprasza: Ustawienia › Domownicy › Zaproś. Jest ważny 10
              minut.
            </span>
            <span style={{ fontSize: 13, lineHeight: 1.45, color: colors.muted }}>
              Masz link? Otwórz go na tym telefonie – dołączysz od razu.
            </span>
          </Card>
        </>
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
              {head} {tail && <em style={{ color: colors.brass700 }}>{tail}</em>}
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
                {found.memberNames.map((n, i) => (
                  <span
                    key={i}
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
                    {n.charAt(0)}
                  </span>
                ))}
              </span>
              {who} · {scopeText(found.scope)}
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
              disabled={busy}
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
            {error && (
              <span
                role="alert"
                style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: '#A4492F' }}
              >
                {error}
              </span>
            )}
          </Card>
        </>
      )}

      <BottomActions>
        {found ? (
          <>
            <button
              type="button"
              onClick={join}
              disabled={busy || !name.trim()}
              style={{
                opacity: busy || !name.trim() ? 0.5 : 1,
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
              {busy ? 'Dołączam…' : `Dołącz jako ${shown}`}
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
                setFound(null)
                setError(null)
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
