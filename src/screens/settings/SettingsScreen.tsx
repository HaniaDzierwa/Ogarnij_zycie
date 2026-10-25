import { Fragment, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { paths } from '../../app/screens.ts'
import { useAuth } from '../../auth/auth.ts'
import { Accent, Header } from '../../components/Header.tsx'
import { ChevronRightIcon, TrashIcon, UsersIcon } from '../../components/icons.tsx'
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
  ToggleRow,
} from '../../components/ui.tsx'
import { useStore } from '../../data/store.ts'
import { useBufferedText } from '../../components/useBufferedText.ts'
import { DEFAULT_HOUSE_NAME } from '../../house/house.ts'
import { plural } from '../../data/plural.ts'
import type { CleanupDays, NotificationSettings } from '../../data/types.ts'
import { colors, fonts, priorities, shadows } from '../../theme'
import { PushStatusRow } from '../../push/PushStatusRow.tsx'
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
  const { userName, members, currentUid, notifications, cleanupDays, tasks, events, today } = store
  // imię i nazwa domu – zapis po chwili przerwy w pisaniu (nie po każdej literze)
  const nick = useBufferedText(userName, store.setUserName)
  const house = useBufferedText(store.houseName, store.setHouseName)
  const name = nick.text.trim()
  const others = members.filter((m) => m.uid !== currentUid)
  const other = others[0]
  const trash = trashItems(tasks, events, today)

  // powiadomienia na tym telefonie – zgoda przy włączaniu przełącznika (decyzja Hani 2026-10-18)
  const push = usePush()
  const notifs: { id: keyof NotificationSettings; name: string; hint: string }[] = [
    {
      id: 'tasks',
      name: 'Terminy zadań',
      hint: `Dzień przed terminem o ${store.taskReminderTime}`,
    },
    {
      id: 'events',
      name: 'Wydarzenia z kalendarza',
      hint: 'Zgodnie z przypomnieniem przy wydarzeniu',
    },
    { id: 'morning', name: 'Poranne podsumowanie', hint: 'Codziennie o 8:00 – co pilne i co dziś' },
    {
      id: 'house',
      name: 'Zmiany od domowników',
      hint: other ? `Gdy ${other.name} coś doda lub ogarnie` : 'Gdy domownik coś doda lub ogarnie',
    },
  ]

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

      <Section label="TY">
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              aria-hidden="true"
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                background: colors.green900,
                color: colors.brass300,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: fonts.serif,
                fontStyle: 'italic',
                fontSize: 22,
                flex: 'none',
              }}
            >
              {name ? name.charAt(0).toUpperCase() : '?'}
            </span>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label
                htmlFor="nick"
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '1.4px',
                  color: colors.muted,
                }}
              >
                IMIĘ LUB PSEUDONIM
              </label>
              <input
                id="nick"
                type="text"
                maxLength={20}
                placeholder="np. Hania, Mama, Szefowa"
                value={nick.text}
                onChange={(e) => nick.change(e.target.value)}
                onBlur={nick.flush}
                style={{
                  height: 44,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 14,
                  padding: '0 14px',
                  fontSize: 16,
                  fontWeight: 700,
                  color: colors.green900,
                  background: colors.white,
                  outlineColor: colors.green900,
                  minWidth: 0,
                }}
              />
            </div>
          </div>
          <span style={{ fontSize: 13, lineHeight: 1.45, color: colors.muted }}>
            Start przywita Cię:{' '}
            <em style={{ fontFamily: fonts.serif, fontSize: 15, color: colors.brass700 }}>
              „Dzień dobry, {name || 'Ty'}”
            </em>
            . {other ? `${other.name} zobaczy` : 'Domownicy zobaczą'} to imię przy Twoich zmianach.
          </span>
        </Card>
      </Section>

      <Section label="WSPÓLNY DOM">
        <Card radius={22}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              padding: '14px 18px',
              borderBottom: `1px solid ${colors.line}`,
            }}
          >
            <label
              htmlFor="nazwa-domu"
              style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.4px', color: colors.muted }}
            >
              NAZWA DOMU
            </label>
            <input
              id="nazwa-domu"
              type="text"
              maxLength={40}
              placeholder={DEFAULT_HOUSE_NAME}
              value={house.text}
              onChange={(e) => house.change(e.target.value)}
              // pusta nazwa nie zostaje
              onBlur={(e) => {
                if (e.target.value.trim()) house.flush()
                else {
                  house.discard()
                  store.setHouseName(DEFAULT_HOUSE_NAME)
                }
              }}
              style={{
                height: 44,
                border: `1px solid ${colors.border}`,
                borderRadius: 14,
                padding: '0 14px',
                fontSize: 16,
                fontWeight: 700,
                color: colors.green900,
                background: colors.white,
                outlineColor: colors.green900,
                minWidth: 0,
              }}
            />
          </div>
          <LinkRow
            to={paths.domownicy}
            icon={<UsersIcon />}
            iconBg={colors.successBg}
            iconFg={colors.green900}
            title="Domownicy"
            meta={
              others.length
                ? others
                    .map((m) => (m.lastSeen ? `${m.name} · ${m.lastSeen}` : m.name))
                    .join(', ')
                    .toUpperCase()
                : 'TYLKO TY · ZAPROŚ DOMOWNIKA'
            }
          />
        </Card>
      </Section>

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
        </Card>
      </Section>

      <Section label="POWIADOMIENIA">
        <Card radius={22}>
          <PushStatusRow push={push} />
          {notifs.map((n, i) => (
            <Fragment key={n.id}>
              <ToggleRow
                name={n.name}
                hint={n.hint}
                on={notifications[n.id]}
                onToggle={() => {
                  const turnOn = !notifications[n.id]
                  store.setNotifications((s) => ({ ...s, [n.id]: !s[n.id] }))
                  if (turnOn && push.state === 'off') push.enable()
                }}
                last={i === notifs.length - 1}
              />
              {/* godzina przypomnienia o terminach – pod przełącznikiem (decyzja Hani 2026-10-18) */}
              {n.id === 'tasks' && notifications.tasks && (
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '0 18px 12px',
                    borderBottom: `1px solid ${colors.line}`,
                  }}
                >
                  <span style={{ fontSize: 14, color: colors.muted2 }}>Godzina przypomnienia</span>
                  <input
                    type="time"
                    step={900}
                    value={store.taskReminderTime}
                    onChange={(e) => e.target.value && store.setTaskReminderTime(e.target.value)}
                    style={{
                      height: 44,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 14,
                      padding: '0 12px',
                      fontFamily: fonts.serif,
                      fontSize: 18,
                      fontWeight: 600,
                      color: colors.green900,
                      background: colors.white,
                      outlineColor: colors.green900,
                    }}
                  />
                </label>
              )}
            </Fragment>
          ))}
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
          ogarnij życie · wersja 1.0
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
