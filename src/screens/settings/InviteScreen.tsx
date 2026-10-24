import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { paths } from '../../app/screens.ts'
import { Accent, Header } from '../../components/Header.tsx'
import { CheckIcon } from '../../components/icons.tsx'
import { BottomActions, Card, PrimaryButton, Screen, SectionLabel } from '../../components/ui.tsx'
import { useStore } from '../../data/store.ts'
import { INVITE_MINUTES } from '../../firebase/model.ts'
import { JoinError, useHouse, type InviteState, type Scope } from '../../house/house.ts'
import { colors, fonts, shadows } from '../../theme'

const VALID_MS = INVITE_MINUTES * 60 * 1000

/** Domownik widzi wszystko, co wspólne – prywatne („Tylko ja”) ustawia każdy sam (decyzja Hani 2026-10-25). */
const ALL: Scope = { all: true, categoryIds: [], calendar: true }

/**
 * 5c–d Zaproś domownika (Zaproszenie.dc.html, ZaproszenieGotowe.dc.html) z tekstami z TEKSTY.md
 * (#10–15), bez kodu QR. Zaproszenie (6 cyfr + link) zapisane w Firestore; gdy ktoś go użyje –
 * „… jest z Wami”. „Nowy kod” zastępuje stare zaproszenie nowym.
 */
export function InviteScreen() {
  const { members, houseName } = useStore()
  const house = useHouse()
  const navigate = useNavigate()
  const [invite, setInvite] = useState<InviteState | null>(null)
  const [error, setError] = useState<string | null>(null)
  /** Każda zmiana = nowe zaproszenie („Nowy kod”, „Zaproś kolejną osobę”). */
  const [round, setRound] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // aktualne wartości dla zapisu zaproszenia (bez tworzenia nowego przy każdej zmianie imion)
  const latest = useRef({ houseName, memberNames: members.map((m) => m.name) })
  useEffect(() => {
    latest.current = { houseName, memberNames: members.map((m) => m.name) }
  }, [houseName, members])
  /** Kod, który trzeba usunąć, gdy powstaje nowy (niewykorzystany). */
  const open = useRef<string | null>(null)

  useEffect(() => {
    let alive = true
    let unwatch = () => {}
    const start = setTimeout(async () => {
      const old = open.current
      open.current = null
      if (old) house.cancelInvite(old).catch(() => {})
      setInvite(null)
      setError(null)
      setCopied(false)
      try {
        const code = await house.createInvite({ scope: ALL, ...latest.current })
        // w międzyczasie wyjście z ekranu albo „Nowy kod” – ten kod już niepotrzebny
        if (!alive) return void house.cancelInvite(code).catch(() => {})
        open.current = code
        unwatch = house.watchInvite(code, (s) => {
          if (!alive) return
          if (s?.usedBy) open.current = null
          setInvite(s)
          setNow(Date.now())
        })
      } catch (e) {
        if (alive)
          setError(
            e instanceof JoinError && e.code === 'offline'
              ? 'Brak internetu – zaproszenie wymaga połączenia'
              : 'Nie udało się utworzyć kodu',
          )
      }
    }, 0)
    return () => {
      alive = false
      clearTimeout(start)
      unwatch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nowy kod tylko przy „Nowy kod”
  }, [round, house.createInvite])

  const left = invite ? Math.max(0, invite.createdAt + VALID_MS - now) : VALID_MS
  const expired = !!invite && left === 0
  // pełne sekundy w górę – tuż po utworzeniu „10:00”, nie „9:59”
  const secs = Math.ceil(left / 1000)
  const mmss = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
  const joinedUid = invite?.usedBy ?? null
  const joined = !!joinedUid
  const joinedName = members.find((m) => m.uid === joinedUid)?.name ?? 'Nowy domownik'
  const code = invite?.code ?? ''
  const shownCode = code ? `${code.slice(0, 3)} ${code.slice(3)}` : '––– –––'

  const cancel = () => {
    if (open.current) house.cancelInvite(open.current).catch(() => {})
    open.current = null
    navigate(paths.domownicy)
  }

  const link = `${window.location.origin}${paths.dolacz}?kod=${code}`
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
            <SectionLabel>WPISZ NA DRUGIM TELEFONIE</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
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
                {shownCode}
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
                {error ? (
                  <strong style={{ color: '#A4492F' }}>{error}</strong>
                ) : !invite ? (
                  'Tworzę kod…'
                ) : expired ? (
                  <strong style={{ color: '#A4492F' }}>Kod wygasł</strong>
                ) : (
                  <>
                    Ważny jeszcze <strong style={{ color: colors.green900 }}>{mmss}</strong>
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={() => setRound((r) => r + 1)}
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

          <Section label="JAK DOŁĄCZYĆ">
            <Card
              style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 18px' }}
            >
              {[
                'Domownik otwiera Ogarnij życie w przeglądarce telefonu i zakłada konto.',
                'Przy pierwszym uruchomieniu wybiera „Dołącz do domu”.',
                'Wpisuje 6 cyfr albo otwiera link – i gotowe.',
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
              {joinedName.charAt(0)}
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
              {joinedName} <em style={{ color: colors.brass700 }}>jest z Wami</em>
            </span>
            <span style={{ fontSize: 15, lineHeight: 1.45, color: colors.muted2 }}>
              Nowy domownik jest teraz w Waszym domu. Zmiany pojawią się u Was w kilka sekund –
              także te zrobione bez internetu.
            </span>
          </Card>
          <Card radius={22}>
            <Row label="Domownicy" last>
              <span style={{ display: 'flex', gap: 4 }}>
                {[
                  ...members.filter((m) => m.uid !== joinedUid),
                  { uid: joinedUid, name: joinedName },
                ].map((m, i, all) => {
                  const isNew = i === all.length - 1
                  return (
                    <span
                      key={m.uid}
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
                      {m.name.charAt(0)}
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
            <PrimaryButton onClick={sendLink} disabled={!invite || expired}>
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
            <button type="button" onClick={cancel} style={bottomLink}>
              ANULUJ ZAPROSZENIE
            </button>
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
              onClick={() => setRound((r) => r + 1)}
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

const bottomLink = {
  height: 44,
  border: 0,
  background: 'transparent',
  color: 'inherit',
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '1.2px',
} as const
