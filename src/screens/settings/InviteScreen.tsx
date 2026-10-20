import { useEffect, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { paths } from '../../app/screens.ts'
import { Accent, Header } from '../../components/Header.tsx'
import { CheckIcon } from '../../components/icons.tsx'
import { Logo } from '../../components/Logo.tsx'
import {
  BottomActions,
  Card,
  Chip,
  Dot,
  PrimaryButton,
  Screen,
  SectionLabel,
} from '../../components/ui.tsx'
import { useStore } from '../../data/store.ts'
import { colors, fonts, shadows } from '../../theme'
import { QR_PATH } from './qrMock.ts'

const VALID_MS = 10 * 60 * 1000

/** Jednorazowy kod: 6 cyfr („482 913”). Etap 1 – losowy; etap 4 – zapisany w Firestore. */
function newCode(): string {
  const n = String(Math.floor(100000 + Math.random() * 900000))
  return `${n.slice(0, 3)} ${n.slice(3)}`
}

const CALENDAR = { id: 'cal', name: 'Kalendarz', color: colors.brass300 }

/**
 * 5c–d Zaproś domownika (Zaproszenie.dc.html, ZaproszenieGotowe.dc.html) z tekstami z TEKSTY.md
 * (#10–15) i jednorazowym linkiem. Podgląd stanu „jest z Wami”: `?etap=dolaczyla`.
 */
export function InviteScreen() {
  const { categories, members } = useStore()
  const [params] = useSearchParams()
  const [joined, setJoined] = useState(params.get('etap') === 'dolaczyla')
  const [code, setCode] = useState(newCode)
  const [expiresAt, setExpiresAt] = useState(() => Date.now() + VALID_MS)
  const [now, setNow] = useState(() => Date.now())
  const [scopeAll, setScopeAll] = useState(true)
  const [picked, setPicked] = useState<Record<string, boolean>>({
    shop: true,
    home: true,
    cal: true,
  })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const left = Math.max(0, expiresAt - now)
  const expired = left === 0
  const mmss = `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}`

  const refresh = () => {
    setCode(newCode())
    setExpiresAt(Date.now() + VALID_MS)
    setNow(Date.now())
    setCopied(false)
  }

  const options = [...categories.map((c) => ({ id: c.id, name: c.name, color: c.color })), CALENDAR]
  const chosen = options.filter((o) => picked[o.id])
  const scopeShort = scopeAll
    ? 'WSZYSTKIE KATEGORIE I KALENDARZ'
    : chosen.map((o) => o.name.toUpperCase()).join(' · ')

  const link = `${window.location.origin}${paths.dolacz}?kod=${code.replace(' ', '')}`
  const sendLink = async () => {
    const text = `Dołącz do naszego domu w Ogarnij życie: ${link}`
    try {
      if (navigator.share) await navigator.share({ title: 'Ogarnij życie', text, url: link })
      else {
        await navigator.clipboard.writeText(link)
        setCopied(true)
      }
    } catch {
      // anulowane udostępnianie – nic nie robimy
    }
  }

  return (
    <Screen withTabBar={false} gap={18}>
      <Header
        back={{ to: paths.domownicy, label: 'DOMOWNICY' }}
        topRight={
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '1.2px',
              color: colors.onDarkMuted2,
            }}
          >
            JEDNORAZOWY KOD
          </span>
        }
        title={
          <>
            Zaproś <Accent>domownika</Accent>
          </>
        }
      />

      {!joined ? (
        <>
          <Card
            radius={26}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 14,
              padding: '20px 18px 18px',
            }}
          >
            <SectionLabel>ZESKANUJ NA DRUGIM TELEFONIE</SectionLabel>
            <span
              style={{
                position: 'relative',
                display: 'block',
                width: 200,
                height: 200,
                padding: 12,
                borderRadius: 22,
                background: colors.white,
                boxShadow: `inset 0 0 0 1px ${colors.borderSoft}`,
                boxSizing: 'content-box',
                opacity: expired ? 0.25 : 1,
              }}
            >
              <svg
                width="200"
                height="200"
                viewBox="0 0 25 25"
                shapeRendering="crispEdges"
                role="img"
                aria-label="Kod QR zaproszenia"
              >
                <path d={QR_PATH} fill={colors.green900} />
              </svg>
              <span
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: 52,
                  height: 52,
                  margin: '-26px 0 0 -26px',
                  borderRadius: 14,
                  background: colors.white,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Logo size={38} color={colors.green900} check={colors.brass500} />
              </span>
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 12, color: colors.muted }}>albo wpisz kod</span>
              <span
                data-testid="kod"
                style={{
                  fontFamily: fonts.serif,
                  fontSize: 34,
                  fontWeight: 500,
                  letterSpacing: 6,
                  lineHeight: 1.1,
                  textDecoration: expired ? 'line-through' : 'none',
                  color: expired ? colors.muted : colors.green900,
                }}
              >
                {code}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                paddingTop: 10,
                borderTop: `1px solid ${colors.line}`,
              }}
            >
              <span style={{ fontSize: 13, color: colors.muted }}>
                {expired ? (
                  <strong style={{ color: '#A4492F' }}>Kod wygasł</strong>
                ) : (
                  <>
                    Ważny jeszcze <strong style={{ color: colors.green900 }}>{mmss}</strong>
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={refresh}
                style={{
                  height: 36,
                  padding: '0 8px',
                  border: 0,
                  background: 'transparent',
                  color: colors.brass700,
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: '0.8px',
                }}
              >
                NOWY KOD
              </button>
            </div>
          </Card>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 18px',
              borderRadius: 20,
              background: colors.successBg,
            }}
          >
            <span
              className="pulse"
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                background: colors.success,
                flex: 'none',
              }}
            />
            <span style={{ flex: 1, fontSize: 14, lineHeight: 1.4, color: colors.green900 }}>
              <strong>Czekam na drugi telefon…</strong> Kod działa raz i wygasa po 10 minutach.
            </span>
          </div>

          <Section label="CO ZOBACZY DOMOWNIK">
            <Card style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14 }}>
              <div
                role="radiogroup"
                aria-label="Co zobaczy domownik"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 4,
                  padding: 3,
                  borderRadius: 18,
                  background: colors.sand,
                }}
              >
                {[
                  { all: true, name: 'Wszystko' },
                  { all: false, name: 'Wybrane' },
                ].map((o) => {
                  const on = scopeAll === o.all
                  return (
                    <button
                      key={o.name}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setScopeAll(o.all)}
                      style={{
                        height: 38,
                        border: 0,
                        borderRadius: 15,
                        fontSize: 14,
                        fontWeight: 800,
                        background: on ? colors.white : 'transparent',
                        color: on ? colors.green900 : colors.muted,
                        boxShadow: on ? '0 1px 3px rgba(31,61,46,0.15)' : 'none',
                      }}
                    >
                      {o.name}
                    </button>
                  )
                })}
              </div>
              {!scopeAll && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {options.map((o) => (
                    <Chip
                      key={o.id}
                      on={!!picked[o.id]}
                      onClick={() => setPicked((p) => ({ ...p, [o.id]: !p[o.id] }))}
                      dot={<Dot color={picked[o.id] ? colors.brass300 : o.color} />}
                    >
                      {o.name}
                    </Chip>
                  ))}
                </div>
              )}
              <span style={{ fontSize: 13, lineHeight: 1.45, color: colors.muted }}>
                {scopeAll
                  ? 'Wszystkie kategorie zadań i cały kalendarz. Możesz to zmienić później.'
                  : chosen.length
                    ? 'Domownik zobaczy tylko zaznaczone. Resztę zostawiasz dla siebie.'
                    : 'Zaznacz przynajmniej jedną rzecz.'}
              </span>
            </Card>
          </Section>

          <Section label="JAK DOŁĄCZYĆ">
            <Card
              style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 18px' }}
            >
              {[
                'Domownik otwiera Ogarnij życie w przeglądarce telefonu i zakłada konto.',
                'Przy pierwszym uruchomieniu wybiera „Dołącz do domu”.',
                'Skanuje kod, wpisuje 6 cyfr albo otwiera link – i gotowe.',
              ].map((text, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      background: '#EFE3CC',
                      color: '#6E5220',
                      fontFamily: fonts.serif,
                      fontSize: 14,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flex: 'none',
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 15, lineHeight: 1.45, paddingTop: 2 }}>{text}</span>
                </div>
              ))}
            </Card>
          </Section>
        </>
      ) : (
        <>
          <Card
            radius={26}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 14,
              padding: '28px 22px 24px',
              textAlign: 'center',
            }}
          >
            <span
              className="pop-center"
              style={{
                position: 'relative',
                width: 84,
                height: 84,
                borderRadius: 42,
                background: colors.green900,
                color: colors.brass300,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: fonts.serif,
                fontStyle: 'italic',
                fontSize: 38,
              }}
            >
              O
              <span
                style={{
                  position: 'absolute',
                  right: -2,
                  bottom: -2,
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  background: colors.brass300,
                  border: `3px solid ${colors.white}`,
                  color: colors.green900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckIcon size={14} strokeWidth={3.2} />
              </span>
            </span>
            <span
              style={{ fontFamily: fonts.serif, fontSize: 28, fontWeight: 500, lineHeight: 1.1 }}
            >
              Ola <em style={{ color: colors.brass700 }}>jest z Wami</em>
            </span>
            <span style={{ fontSize: 15, lineHeight: 1.45, color: colors.muted2 }}>
              Nowy domownik jest teraz w Waszym domu. Zmiany pojawią się u Was w kilka sekund –
              także te zrobione bez internetu.
            </span>
          </Card>
          <Card radius={22}>
            <Row label="Widzi">
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: '0.8px',
                  color: colors.muted,
                  textAlign: 'right',
                }}
              >
                {scopeShort}
              </span>
            </Row>
            <Row label="Domownicy" last>
              <span style={{ display: 'flex', gap: 4 }}>
                {[...members.map((m) => m.name), 'Ola'].map((n, i, all) => {
                  const isNew = i === all.length - 1
                  return (
                    <span
                      key={n}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        background: isNew ? colors.brass300 : colors.green900,
                        color: isNew ? colors.green900 : colors.brass300,
                        fontFamily: fonts.serif,
                        fontStyle: 'italic',
                        fontSize: 13,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {n.charAt(0)}
                    </span>
                  )
                })}
              </span>
            </Row>
          </Card>
        </>
      )}

      <BottomActions>
        {!joined ? (
          <>
            <PrimaryButton onClick={sendLink} disabled={expired}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.brass300}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 15V4M8 8l4-4 4 4" />
                <path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
              </svg>
              {copied ? 'Link skopiowany' : 'Wyślij link wiadomością'}
            </PrimaryButton>
            <BottomLink to={paths.domownicy}>ANULUJ ZAPROSZENIE</BottomLink>
          </>
        ) : (
          <>
            <Link
              to={paths.domownicy}
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
                gap: 10,
                textDecoration: 'none',
                boxShadow: shadows.card,
              }}
            >
              Gotowe
              <span style={{ color: colors.brass300, display: 'flex' }}>
                <CheckIcon size={20} strokeWidth={2.4} />
              </span>
            </Link>
            <button
              type="button"
              onClick={() => {
                refresh()
                setJoined(false)
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
              ZAPROŚ KOLEJNĄ OSOBĘ
            </button>
          </>
        )}
      </BottomActions>
    </Screen>
  )
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SectionLabel>{label}</SectionLabel>
      {children}
    </section>
  )
}

function Row({ label, last, children }: { label: string; last?: boolean; children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 18px',
        minHeight: 60,
        borderBottom: last ? 'none' : `1px solid ${colors.line}`,
      }}
    >
      <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>{label}</span>
      {children}
    </div>
  )
}

function BottomLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
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
      {children}
    </Link>
  )
}
