import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { paths } from '../app/screens.ts'
import { RIDGE_FAR, RIDGE_NEAR } from '../components/Header.tsx'
import { Logo } from '../components/Logo.tsx'
import { ChevronRightIcon } from '../components/icons.tsx'
import { useStore } from '../data/store.ts'
import { DEFAULT_HOUSE_NAME, useHouse } from '../house/house.ts'
import { colors, fonts, shadows } from '../theme'

/**
 * 1a Pierwsze uruchomienie (Pierwsze.dc.html, teksty #1–2 z docs/TEKSTY.md).
 * „Załóż nowy dom”: imię + nazwa domu (decyzja Hani 2026-10-18) → dom w Firestore → Start.
 */
export function FirstRunScreen() {
  const store = useStore()
  const house = useHouse()
  const navigate = useNavigate()
  const [isNew, setIsNew] = useState(true)
  const [name, setName] = useState(house.profile?.name ?? '')
  const [houseName, setHouseName] = useState('')
  const [nameError, setNameError] = useState<string>()
  const [formError, setFormError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const nameShow = name.trim() || 'Ty'

  const start = async () => {
    if (!name.trim()) {
      setNameError('Wpisz imię – domownicy zobaczą je przy Twoich zmianach.')
      return
    }
    setNameError(undefined)
    setFormError(undefined)
    setBusy(true)
    try {
      await house.createHouse(houseName, name)
      store.setUserName(name.trim())
      navigate(paths.start, { replace: true })
    } catch {
      setFormError('Nie udało się założyć domu. Sprawdź internet i spróbuj jeszcze raz.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        maxWidth: 480,
        margin: '0 auto',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <main
        style={{
          flex: 1,
          padding: 'calc(16px + env(safe-area-inset-top)) 16px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <Hero />

        <span style={{ padding: '0 4px', fontFamily: fonts.serif, fontSize: 22, fontWeight: 500 }}>
          Od czego <em>zaczynamy?</em>
        </span>

        <button
          type="button"
          aria-pressed={isNew}
          onClick={() => setIsNew((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            width: '100%',
            padding: 16,
            borderRadius: 22,
            textAlign: 'left',
            background: colors.white,
            border: isNew ? `2px solid ${colors.green900}` : `1px solid ${colors.borderSoft}`,
            boxShadow: isNew ? '0 6px 20px rgba(31,61,46,0.10)' : 'none',
          }}
        >
          <OptionIcon bg={colors.successBg}>
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.green900}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 11l8-7 8 7" />
              <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
              <path d="M12 12v5M9.5 14.5h5" />
            </svg>
          </OptionIcon>
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: colors.green900 }}>
              Załóż nowy dom
            </span>
            <span style={{ fontSize: 13, lineHeight: 1.4, color: colors.muted }}>
              Zaczynasz od zera. Domowników zaprosisz później.
            </span>
          </span>
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              flex: 'none',
              ...(isNew
                ? { border: `7px solid ${colors.green900}`, background: colors.brass300 }
                : { border: `2px solid ${colors.brass500}` }),
            }}
          />
        </button>

        {isNew && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: '16px 18px',
              marginTop: -8,
              borderRadius: 22,
              background: colors.white,
              boxShadow: shadows.card,
            }}
          >
            <label
              htmlFor="imie"
              style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.4px', color: colors.muted }}
            >
              JAK MASZ NA IMIĘ?
            </label>
            <input
              id="imie"
              type="text"
              maxLength={20}
              placeholder="np. Hania, Mama, Szefowa"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? 'imie-blad' : undefined}
              style={{
                height: 48,
                border: nameError ? '2px solid #A4492F' : `1px solid ${colors.border}`,
                borderRadius: 14,
                padding: '0 14px',
                fontSize: 17,
                fontWeight: 700,
                color: colors.green900,
                background: colors.white,
                outlineColor: colors.green900,
              }}
            />
            {nameError ? (
              <span
                id="imie-blad"
                role="alert"
                style={{ fontSize: 13, fontWeight: 700, color: '#8C3D27' }}
              >
                {nameError}
              </span>
            ) : (
              <span style={{ fontSize: 13, color: colors.muted }}>
                Start przywita Cię:{' '}
                <em style={{ fontFamily: fonts.serif, fontSize: 15, color: colors.brass700 }}>
                  „Dzień dobry, {nameShow}”
                </em>
              </span>
            )}
            <label
              htmlFor="nazwa-domu"
              style={{
                marginTop: 8,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '1.4px',
                color: colors.muted,
              }}
            >
              NAZWA DOMU
            </label>
            <input
              id="nazwa-domu"
              type="text"
              maxLength={40}
              placeholder={`np. Dom na Leśnej, Dzierwowie`}
              value={houseName}
              onChange={(e) => setHouseName(e.target.value)}
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
            <span style={{ fontSize: 13, color: colors.muted }}>
              Zobaczą ją domownicy, gdy będą dołączać. Puste pole – „{DEFAULT_HOUSE_NAME}”. Zmienisz
              ją w Ustawieniach.
            </span>
          </div>
        )}

        <Link
          to={paths.dolacz}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: 16,
            borderRadius: 22,
            background: colors.white,
            border: `1px solid ${colors.borderSoft}`,
            color: colors.green900,
            textDecoration: 'none',
          }}
        >
          <OptionIcon bg="#EFE3CC">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6E5220"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="8" r="3.5" />
              <path d="M3 20c.5-3.5 3-5.5 6-5.5s5.5 2 6 5.5" />
              <path d="M18 8v6M15 11h6" />
            </svg>
          </OptionIcon>
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 17, fontWeight: 800 }}>Dołącz do domu</span>
            <span style={{ fontSize: 13, lineHeight: 1.4, color: colors.muted }}>
              Ktoś Cię zaprosił – zeskanujesz kod albo otworzysz link.
            </span>
          </span>
          <span style={{ color: colors.brass500, display: 'flex' }}>
            <ChevronRightIcon />
          </span>
        </Link>

        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontSize: 12,
            color: colors.muted,
            textAlign: 'center',
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          Dane Waszego domu widzą tylko domownicy.
        </span>
      </main>

      {isNew && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            padding: '12px 16px calc(24px + env(safe-area-inset-bottom))',
            background: colors.cream,
            boxShadow: `0 -1px 0 ${colors.borderSoft}`,
          }}
        >
          {formError && (
            <span
              role="alert"
              style={{
                display: 'block',
                marginBottom: 10,
                fontSize: 14,
                fontWeight: 700,
                color: '#8C3D27',
                textAlign: 'center',
              }}
            >
              {formError}
            </span>
          )}
          <button
            type="button"
            onClick={start}
            disabled={busy}
            style={{
              opacity: busy ? 0.6 : 1,
              width: '100%',
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
            {busy ? 'Zakładam dom…' : 'Zaczynamy'}
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
        </div>
      )}
    </div>
  )
}

function OptionIcon({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 48,
        height: 48,
        borderRadius: '24px 24px 12px 12px',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 'none',
      }}
    >
      {children}
    </span>
  )
}

/** Baner 300 px: nocne niebo, logo, nazwa aplikacji. */
function Hero() {
  return (
    <div
      style={{
        position: 'relative',
        height: 300,
        borderRadius: 30,
        background: colors.green900,
        color: colors.cream,
        overflow: 'hidden',
        flex: 'none',
      }}
    >
      <svg
        width="100%"
        height="300"
        viewBox="0 0 358 300"
        preserveAspectRatio="xMidYMax slice"
        fill="none"
        aria-hidden="true"
        style={{ position: 'absolute', left: 0, top: 0 }}
      >
        <circle cx="300" cy="62" r="18" fill={colors.brass300} opacity="0.9" />
        <circle cx="308" cy="56" r="16" fill={colors.green900} />
        <circle cx="60" cy="48" r="1.6" fill={colors.brass300} />
        <circle cx="118" cy="30" r="1.2" fill={colors.brass300} />
        <circle cx="232" cy="40" r="1.4" fill={colors.brass300} />
        <circle cx="180" cy="70" r="1" fill={colors.brass300} />
        <g transform="translate(0,244)">
          <path d={RIDGE_FAR} fill={colors.green800} />
          <path d={RIDGE_NEAR} fill={colors.green700} />
        </g>
      </svg>
      <div
        style={{
          position: 'relative',
          height: '100%',
          padding: '54px 24px 70px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          textAlign: 'center',
        }}
      >
        <Logo size={72} color={colors.cream} />
        <h1
          style={{
            margin: 0,
            fontFamily: fonts.serif,
            fontSize: 36,
            lineHeight: 1.05,
            fontWeight: 500,
          }}
        >
          Ogarnij <em style={{ fontStyle: 'italic', color: colors.brass300 }}>życie</em>
        </h1>
        <span style={{ fontSize: 15, lineHeight: 1.4, color: colors.onDarkMuted }}>
          Zadania, zakupy i kalendarz całego domu
          <br />w jednym miejscu.
        </span>
      </div>
    </div>
  )
}
