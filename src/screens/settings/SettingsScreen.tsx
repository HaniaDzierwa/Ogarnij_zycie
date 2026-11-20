import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { paths } from '../../app/screens.ts'
import { useAuth } from '../../auth/auth.ts'
import { Accent, Header } from '../../components/Header.tsx'
import {
  BellIcon,
  CameraIcon,
  HouseIcon,
  ChevronRightIcon,
  TrashIcon,
} from '../../components/icons.tsx'
import { Logo } from '../../components/Logo.tsx'
import { TabBar } from '../../components/TabBar.tsx'
import {
  Box,
  Card,
  ConfirmDialog,
  Dot,
  OfflineBadge,
  Screen,
  SectionLabel,
} from '../../components/ui.tsx'
import { useStore } from '../../data/store.ts'
import { plural } from '../../data/plural.ts'
import type { CleanupDays, NotificationSettings } from '../../data/types.ts'
import { PHOTO_LIMITS } from '../../firebase/photos.ts'
import { formatMB } from '../../photos/usage.ts'
import { APP_VERSION_LABEL } from '../../version.ts'
import { colors, fonts, priorities, shadows } from '../../theme'
import type { PushState } from '../../push/push.ts'
import { usePush } from '../../push/usePush.ts'
import { trashItems, trashWhat } from '../tasks/tasksView.ts'

const CLEANUP: { id: CleanupDays; name: string; hint: string }[] = [
  { id: 7, name: 'Po 7 dniach', hint: 'Ogarnięte starsze niż 7 dni same trafiają do Kosza.' },
  { id: 30, name: 'Po 30 dniach', hint: 'Ogarnięte starsze niż 30 dni same trafiają do Kosza.' },
  { id: null, name: 'Nigdy', hint: 'Ogarnięte zostają, dopóki ich nie wyczyścisz.' },
]

/**
 * 5 Ustawienia (Ustawienia.dc.html): Ty, Wspólny dom, Porządki, Powiadomienia.
 * Wygląd (motyw) ukryty – na start tylko jasny (CLAUDE.md). Teksty wg docs/TEKSTY.md (#3, #17).
 */
export function SettingsScreen() {
  const store = useStore()
  const auth = useAuth()
  const navigate = useNavigate()
  const [askSignOut, setAskSignOut] = useState(false)
  const { members, notifications, summaryTimes, cleanupDays } = store
  const { tasks, events, today } = store
  // „2 OSOBY” – liczba, nie imiona (domowników może być więcej; imiona – na ekranie domu)
  const count = Math.max(1, members.length)
  const people = `${count} ${plural(count, ['osoba', 'osoby', 'osób'])}`
  const trash = trashItems(tasks, events, today)

  // stan na tym telefonie – do opisu wiersza „Powiadomienia”; szczegóły na osobnym ekranie
  const push = usePush()

  return (
    <Screen gap={22}>
      <Header
        label="USTAWIENIA"
        topRight={<OfflineBadge />}
        title={
          <>
            Po <Accent>swojemu</Accent>
          </>
        }
      />

      {/* nick i nazwa domu – na ekranie „Wspólny dom” (wariant A, decyzja Hani 2026-11-20) */}
      <Card radius={22}>
        <LinkRow
          to={paths.domownicy}
          icon={<HouseIcon size={20} />}
          iconBg={colors.successBg}
          iconFg={colors.green900}
          title="Wspólny dom"
          meta={`${store.houseName} · ${people}`.toUpperCase()}
        />
      </Card>

      <Section label="ZADANIA">
        <Card radius={22}>
          <div style={{ borderBottom: `1px solid ${colors.line}` }}>
            <LinkRow
              to={paths.kategorie}
              icon={
                <span style={{ display: 'flex', gap: 3 }}>
                  {store.categories.slice(0, 3).map((c) => (
                    <Dot key={c.id} color={c.color} size={8} />
                  ))}
                </span>
              }
              iconBg={colors.cream}
              iconFg={colors.green900}
              title="Kategorie"
              meta={`${store.categories.length} ${plural(store.categories.length, ['KATEGORIA', 'KATEGORIE', 'KATEGORII'])}`}
            />
          </div>
          <LinkRow
            to={paths.priorytety}
            icon={<Box color={priorities.high.line} size={18} />}
            iconBg={priorities.high.bg}
            iconFg={priorities.high.fg}
            title="Priorytety"
            meta={prioMeta(store.customPriorities.length)}
          />
        </Card>
      </Section>

      <Section label="PORZĄDKI">
        <Card radius={22}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              padding: '14px 18px',
              borderBottom: `1px solid ${colors.line}`,
            }}
          >
            <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>Sprzątanie ogarniętych</span>
              <span style={{ fontSize: 13, color: colors.muted }}>
                {CLEANUP.find((c) => c.id === cleanupDays)!.hint}
              </span>
            </span>
            <div
              role="radiogroup"
              aria-label="Sprzątanie ogarniętych"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 4,
                padding: 3,
                borderRadius: 16,
                background: colors.sand,
              }}
            >
              {CLEANUP.map((o) => {
                const on = o.id === cleanupDays
                return (
                  <button
                    key={o.name}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => store.setCleanupDays(o.id)}
                    style={{
                      height: 36,
                      border: 0,
                      borderRadius: 13,
                      fontSize: 13,
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
          </div>
          <LinkRow
            to={paths.kosz}
            icon={<TrashIcon size={20} />}
            iconBg={priorities.high.bg}
            iconFg={priorities.high.fg}
            title="Kosz"
            meta={
              trash.length
                ? `${trash.length} ${plural(trash.length, ['ELEMENT', 'ELEMENTY', 'ELEMENTÓW'])} · ${trashWhat(trash).toUpperCase()}`
                : 'PUSTO'
            }
          />
          <PhotoUsage house={store.photos.usage.house} app={store.photos.usage.app} />
        </Card>
      </Section>

      <Section label="POWIADOMIENIA">
        <Card radius={22}>
          <LinkRow
            to={paths.powiadomienia}
            icon={<BellIcon />}
            iconBg={colors.sand}
            iconFg={colors.brass700}
            title="Powiadomienia"
            meta={notifMeta(notifications, summaryTimes, push.state)}
          />
        </Card>
      </Section>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          paddingTop: 4,
        }}
      >
        <Logo size={26} color={colors.green900} check={colors.brass500} />
        <span
          style={{
            fontFamily: fonts.serif,
            fontStyle: 'italic',
            fontSize: 15,
            color: colors.muted,
          }}
        >
          {APP_VERSION_LABEL}
        </span>
        <span style={{ fontSize: 12, color: colors.muted }}>
          Dane w Firebase – widzą je tylko domownicy
        </span>
        <span style={{ fontSize: 12, color: colors.muted }}>
          {auth.user?.email}
          {' · '}
          <button
            type="button"
            onClick={() => setAskSignOut(true)}
            style={{
              border: 0,
              padding: '12px 4px',
              background: 'transparent',
              color: colors.brass700,
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            Wyloguj
          </button>
        </span>
        <Link
          to={paths.usunKonto}
          style={{
            padding: '8px 4px',
            color: priorities.high.line,
            fontSize: 12,
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Usuń konto
        </Link>
      </div>

      {askSignOut && (
        <ConfirmDialog
          title="Wylogować się?"
          message="Twoje zadania i kalendarz zostają na koncie – wrócą po zalogowaniu."
          confirmLabel="Wyloguj"
          onCancel={() => setAskSignOut(false)}
          onConfirm={async () => {
            setAskSignOut(false)
            await auth.signOut()
            navigate(paths.logowanie, { replace: true })
          }}
        />
      )}

      <TabBar active="ustawienia" />
    </Screen>
  )
}

/** „PODSUMOWANIA 8:00, 18:00 · ZMIANY OD DOMOWNIKÓW” – ogólnie, szczegóły na ekranie Powiadomienia. */
function notifMeta(n: NotificationSettings, times: string[], phone: PushState | null): string {
  const parts: string[] = []
  // null – jeszcze sprawdzamy telefon
  if (phone && phone !== 'on') parts.push('WYŁĄCZONE NA TYM TELEFONIE')
  if (n.morning) parts.push(`PODSUMOWANIA ${times.map((t) => t.replace(/^0/, '')).join(', ')}`)
  if (n.house) parts.push('ZMIANY OD DOMOWNIKÓW')
  if (!n.morning && !n.house) parts.push('WSZYSTKO WYŁĄCZONE')
  return parts.join(' · ')
}

/** „3 WBUDOWANE · 1 WŁASNY”. */
function prioMeta(own: number): string {
  return own
    ? `3 WBUDOWANE · ${own} ${plural(own, ['WŁASNY', 'WŁASNE', 'WŁASNYCH'])}`
    : '3 WBUDOWANE · DODAJ WŁASNY'
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SectionLabel>{label}</SectionLabel>
      {children}
    </section>
  )
}

/** Wiersz-link z ikonką, tytułem, opisem WERSALIKAMI i strzałką. */
function LinkRow({
  to,
  icon,
  iconBg,
  iconFg,
  title,
  meta,
  card = false,
}: {
  to: string
  icon: ReactNode
  iconBg: string
  iconFg: string
  title: string
  meta: string
  /** Samodzielna karta (z cieniem) zamiast wiersza w karcie. */
  card?: boolean
}) {
  return (
    <Link
      to={to}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 16px',
        minHeight: card ? 72 : 68,
        color: colors.green900,
        textDecoration: 'none',
        ...(card && { background: colors.white, borderRadius: 22, boxShadow: shadows.card }),
      }}
    >
      <span
        style={{
          width: 40,
          height: 40,
          borderRadius: 14,
          background: iconBg,
          color: iconFg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 'none',
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ fontSize: 16, fontWeight: 700 }}>{title}</span>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1px', color: colors.muted }}>
          {meta}
        </span>
      </span>
      <span style={{ color: colors.brass500, display: 'flex' }}>
        <ChevronRightIcon />
      </span>
    </Link>
  )
}

/**
 * Miejsce na zdjęcia (etap 9, projekt „Zdjęcia w zadaniach”, ekran 6): zajęte z limitu domu
 * (150 MB) z paskiem; po przekroczeniu – kolorem i opisem. Limit całej aplikacji (600 MB) – tylko
 * gdy się skończył.
 */
function PhotoUsage({ house, app }: { house: number; app: number }) {
  const houseMax = PHOTO_LIMITS.houseBytes
  const houseFull = house >= houseMax - PHOTO_LIMITS.fullBytes
  const appFull = app >= PHOTO_LIMITS.appBytes - PHOTO_LIMITS.fullBytes
  const pct = Math.min(100, Math.round((house / houseMax) * 100))
  const danger = '#A4492F'
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '14px 18px',
        borderTop: `1px solid ${colors.line}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          style={{
            width: 36,
            height: 36,
            flex: 'none',
            borderRadius: 12,
            background: colors.sand,
            color: colors.brass700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CameraIcon size={20} />
        </span>
        <span style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>Miejsce na zdjęcia</span>
        <span
          style={{ fontSize: 14, fontWeight: 800, color: houseFull ? danger : colors.brass700 }}
        >
          {formatMB(house)} z {formatMB(houseMax)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Zajęte miejsce na zdjęcia"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        style={{ height: 8, borderRadius: 4, background: colors.line, overflow: 'hidden' }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: 4,
            background: houseFull ? danger : colors.brass500,
          }}
        />
      </div>
      <span style={{ fontSize: 13, lineHeight: 1.45, color: colors.muted }}>
        {houseFull
          ? 'Miejsce na zdjęcia w Waszym domu się skończyło – usuń stare zdjęcia albo opróżnij Kosz, żeby dodać nowe. Zadania zapisują się normalnie.'
          : appFull
            ? 'Miejsce na zdjęcia w aplikacji się skończyło – na razie nie da się dodać nowych. Zadania zapisują się normalnie.'
            : 'Zdjęcia całego domu – wszystkich domowników. Zmieści się ok. 1000 zdjęć. Zadania i wydarzenia się tu nie liczą.'}
      </span>
    </div>
  )
}
