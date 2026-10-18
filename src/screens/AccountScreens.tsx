// 1b Konto: Zaloguj się, Załóż konto, Nie pamiętam hasła.
// Nowe ekrany (nie ma ich w docs/design/ekrany/) – w stylu Pierwszego uruchomienia i nagłówków.
// Od etapu 2 – Firebase Authentication (e‑mail + hasło) przez useAuth().

import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { paths } from '../app/screens.ts'
import { AuthError, authErrorMessage, useAuth } from '../auth/auth.ts'
import { Accent, Header, RIDGE_FAR, RIDGE_NEAR } from '../components/Header.tsx'
import { Logo } from '../components/Logo.tsx'
import { Card, Field, PrimaryButton } from '../components/ui.tsx'
import { colors, fonts } from '../theme'

const MIN_PASSWORD = 8

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

type FieldErrors = { email?: string; password?: string }

/** Dokąd po zalogowaniu: `?dalej=/adres` (np. link z zaproszenia) albo podany ekran. */
function nextPath(params: URLSearchParams, fallback: string): string {
  const next = params.get('dalej')
  return next && next.startsWith('/') && !next.startsWith('//') ? next : fallback
}

/** Błąd konta → komunikat przy polu albo pod formularzem. */
function showAuthError(
  err: unknown,
  setErrors: (e: FieldErrors) => void,
  setFormError: (m: string | undefined) => void,
) {
  const { field, message } = authErrorMessage(err instanceof AuthError ? err.code : 'unknown')
  if (field) setErrors({ [field]: message })
  else setFormError(message)
}

/** Komunikat pod formularzem (np. brak internetu). */
function FormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <span
      role="alert"
      style={{ padding: '0 4px', fontSize: 14, fontWeight: 700, color: '#8C3D27' }}
    >
      {message}
    </span>
  )
}

/** Zaloguj się – pierwszy ekran bez konta (po Ładowaniu). */
export function LoginScreen() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const next = {
      email: validEmail(email) ? undefined : 'Wpisz poprawny adres e‑mail.',
      password: password ? undefined : 'Wpisz hasło.',
    }
    setErrors(next)
    setFormError(undefined)
    if (next.email || next.password) return
    setBusy(true)
    try {
      await signIn(email, password)
      navigate(nextPath(params, paths.start), { replace: true })
    } catch (err) {
      showAuthError(err, setErrors, setFormError)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AccountLayout>
      <Hero />
      <span style={{ padding: '0 4px', fontFamily: fonts.serif, fontSize: 22, fontWeight: 500 }}>
        Zaloguj <em>się</em>
      </span>
      <form
        onSubmit={submit}
        noValidate
        style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
      >
        <Card
          style={{
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            overflow: 'visible',
          }}
        >
          <Field
            id="email"
            label="E‑MAIL"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            placeholder="np. hania@poczta.pl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />
          <PasswordField
            id="haslo"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            error={errors.password}
          />
          <Link
            to={paths.haslo}
            style={{
              alignSelf: 'flex-end',
              fontSize: 14,
              fontWeight: 800,
              textDecoration: 'none',
              padding: '6px 2px',
            }}
          >
            Nie pamiętam hasła
          </Link>
        </Card>
        <FormError message={formError} />
        <PrimaryButton type="submit" disabled={busy}>
          {busy ? 'Loguję…' : 'Zaloguj się'}
          {!busy && <ArrowIcon />}
        </PrimaryButton>
      </form>
      <p style={{ margin: 0, textAlign: 'center', fontSize: 15, color: colors.muted }}>
        Nie masz konta?{' '}
        <Link
          to={paths.rejestracja + (params.size ? `?${params}` : '')}
          style={{ fontWeight: 800, textDecoration: 'none' }}
        >
          Załóż konto
        </Link>
      </p>
      <PrivacyNote />
    </AccountLayout>
  )
}

/** Załóż konto – e‑mail i hasło; dalej Pierwsze uruchomienie (imię, nowy dom / dołącz). */
export function RegisterScreen() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const next = {
      email: validEmail(email) ? undefined : 'Wpisz poprawny adres e‑mail.',
      password:
        password.length >= MIN_PASSWORD
          ? undefined
          : `Hasło musi mieć co najmniej ${MIN_PASSWORD} znaków.`,
    }
    setErrors(next)
    setFormError(undefined)
    if (next.email || next.password) return
    setBusy(true)
    try {
      await signUp(email, password)
      // z linku zaproszenia – od razu „Dołącz do domu”, inaczej Pierwsze uruchomienie
      const next = nextPath(params, paths.pierwsze)
      navigate(next.startsWith(paths.dolacz) ? next : paths.pierwsze, { replace: true })
    } catch (err) {
      showAuthError(err, setErrors, setFormError)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AccountLayout>
      <Header
        back={{ to: paths.logowanie, label: 'ZALOGUJ SIĘ' }}
        title={
          <>
            Załóż <Accent>konto</Accent>
          </>
        }
      />
      <p style={{ margin: '0 4px', fontSize: 15, lineHeight: 1.45, color: colors.muted2 }}>
        Jednym kontem zalogujesz się na każdym telefonie. Po założeniu konta wybierzesz: nowy dom
        albo dołączenie do domu bliskich.
      </p>
      <form
        onSubmit={submit}
        noValidate
        style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
      >
        <Card
          style={{
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            overflow: 'visible',
          }}
        >
          <Field
            id="email"
            label="E‑MAIL"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            placeholder="np. hania@poczta.pl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />
          <PasswordField
            id="haslo"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            error={errors.password}
            hint={`Co najmniej ${MIN_PASSWORD} znaków.`}
          />
        </Card>
        <FormError message={formError} />
        <PrimaryButton type="submit" disabled={busy}>
          {busy ? 'Zakładam konto…' : 'Załóż konto'}
          {!busy && <ArrowIcon />}
        </PrimaryButton>
      </form>
      <p style={{ margin: 0, textAlign: 'center', fontSize: 15, color: colors.muted }}>
        Masz już konto?{' '}
        <Link
          to={paths.logowanie + (params.size ? `?${params}` : '')}
          style={{ fontWeight: 800, textDecoration: 'none' }}
        >
          Zaloguj się
        </Link>
      </p>
      <PrivacyNote />
    </AccountLayout>
  )
}

/** Nie pamiętam hasła – link do ustawienia nowego hasła na e‑mail. */
export function ResetPasswordScreen() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string>()
  const [formError, setFormError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validEmail(email)) {
      setError('Wpisz poprawny adres e‑mail.')
      return
    }
    setError(undefined)
    setFormError(undefined)
    setBusy(true)
    try {
      await resetPassword(email)
      setSentTo(email.trim())
    } catch (err) {
      // nie zdradzamy, czy konto istnieje – „brak konta” wygląda jak wysłany link
      if (err instanceof AuthError && err.code === 'auth/user-not-found') setSentTo(email.trim())
      else showAuthError(err, (e) => setError(e.email), setFormError)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AccountLayout>
      <Header
        back={{ to: paths.logowanie, label: 'ZALOGUJ SIĘ' }}
        title={
          <>
            Nowe <Accent>hasło</Accent>
          </>
        }
      />
      {sentTo ? (
        <>
          <div
            role="status"
            style={{
              display: 'flex',
              gap: 14,
              padding: '16px 18px',
              borderRadius: 22,
              background: colors.successBg,
              color: colors.successText,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                background: colors.success,
                color: colors.white,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 'none',
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 800 }}>Sprawdź skrzynkę</span>
              <span style={{ fontSize: 14, lineHeight: 1.45 }}>
                Link do ustawienia nowego hasła wysłaliśmy na <strong>{sentTo}</strong>. Nie widzisz
                go? Zajrzyj do spamu.
              </span>
            </span>
          </div>
          <Link
            to={paths.logowanie}
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
            Wróć do logowania
          </Link>
          <button
            type="button"
            onClick={() => setSentTo(null)}
            style={{
              border: 0,
              background: 'transparent',
              color: colors.brass700,
              fontSize: 14,
              fontWeight: 800,
              minHeight: 44,
            }}
          >
            Wyślij jeszcze raz
          </button>
        </>
      ) : (
        <>
          <p style={{ margin: '0 4px', fontSize: 15, lineHeight: 1.45, color: colors.muted2 }}>
            Podaj e‑mail swojego konta. Wyślemy na niego link do ustawienia nowego hasła.
          </p>
          <form
            onSubmit={submit}
            noValidate
            style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
          >
            <Card style={{ padding: '16px 18px', overflow: 'visible' }}>
              <Field
                id="email"
                label="E‑MAIL"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                placeholder="np. hania@poczta.pl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={error}
              />
            </Card>
            <FormError message={formError} />
            <PrimaryButton type="submit" disabled={busy}>
              {busy ? 'Wysyłam…' : 'Wyślij link'}
            </PrimaryButton>
          </form>
        </>
      )}
    </AccountLayout>
  )
}

function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <main
      style={{
        maxWidth: 480,
        margin: '0 auto',
        minHeight: '100dvh',
        padding:
          'calc(16px + env(safe-area-inset-top)) 16px calc(24px + env(safe-area-inset-bottom))',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      {children}
    </main>
  )
}

function PasswordField({
  id,
  value,
  onChange,
  error,
  hint,
  autoComplete,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  error?: string
  hint?: string
  autoComplete: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <Field
      id={id}
      label="HASŁO"
      type={visible ? 'text' : 'password'}
      autoComplete={autoComplete}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={error}
      hint={hint}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ukryj hasło' : 'Pokaż hasło'}
          aria-pressed={visible}
          style={{
            width: 44,
            border: 0,
            borderRadius: 14,
            background: 'transparent',
            color: colors.muted,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      }
    />
  )
}

function EyeIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.2 7.4C3.9 9 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="M3 3l18 18" />
    </svg>
  )
}

function ArrowIcon() {
  return (
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
  )
}

function PrivacyNote() {
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 'auto',
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
  )
}

/** Niższa wersja banera z Pierwszego uruchomienia (200 px). */
function Hero() {
  return (
    <div
      style={{
        position: 'relative',
        height: 200,
        borderRadius: 30,
        background: colors.green900,
        color: colors.cream,
        overflow: 'hidden',
        flex: 'none',
      }}
    >
      <svg
        width="100%"
        height="200"
        viewBox="0 0 358 200"
        preserveAspectRatio="xMidYMax slice"
        fill="none"
        aria-hidden="true"
        style={{ position: 'absolute', left: 0, top: 0 }}
      >
        <circle cx="300" cy="46" r="16" fill={colors.brass300} opacity="0.9" />
        <circle cx="307" cy="41" r="14" fill={colors.green900} />
        <circle cx="60" cy="40" r="1.6" fill={colors.brass300} />
        <circle cx="118" cy="24" r="1.2" fill={colors.brass300} />
        <circle cx="232" cy="32" r="1.4" fill={colors.brass300} />
        <g transform="translate(0,144)">
          <path d={RIDGE_FAR} fill={colors.green800} />
          <path d={RIDGE_NEAR} fill={colors.green700} />
        </g>
      </svg>
      <div
        style={{
          position: 'relative',
          height: '100%',
          padding: '20px 24px 56px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Logo size={56} color={colors.cream} />
        <span style={{ fontFamily: fonts.serif, fontSize: 32, lineHeight: 1.05, fontWeight: 500 }}>
          Ogarnij <em style={{ fontStyle: 'italic', color: colors.brass300 }}>życie</em>
        </span>
      </div>
    </div>
  )
}
