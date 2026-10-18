import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { paths } from '../app/screens.ts'
import { Accent, Header } from '../components/Header.tsx'
import { Logo } from '../components/Logo.tsx'
import { TabBar } from '../components/TabBar.tsx'
import { Box, Card, Screen, SyncBadge } from '../components/ui.tsx'
import {
  DAYS_SHORT,
  MONTHS_SHORT,
  diffDays,
  dueLabel,
  inDays,
  isDaytime,
  longDayLabel,
  parseKey,
} from '../data/dates.ts'
import { useStore } from '../data/MockStore.tsx'
import { plural } from '../data/plural.ts'
import {
  calendarItems,
  openTasks,
  upcomingEvents,
  urgentOpen,
  weekDays,
} from '../data/selectors.ts'
import { colors, fonts, priorities, shadows, todayBadge } from '../theme'

/** 2 Start (Kategorie.dc.html, StartDzien / StartNoc). Podgląd pory: `?pora=dzien|noc`. */
export function StartScreen() {
  const { today, userName, tasks, events, categories, eventTypes } = useStore()
  const [params] = useSearchParams()
  const pora = params.get('pora')
  const day = pora === 'dzien' ? true : pora === 'noc' ? false : isDaytime()

  const categoryName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name ?? 'Bez kategorii'
  const typeOf = (id: string) => eventTypes.find((t) => t.id === id) ?? eventTypes[0]

  const open = openTasks(tasks)
  const urgent = urgentOpen(tasks)
  const urgentToday = urgent.filter((t) => t.due && diffDays(today, t.due) <= 0)
  const done = tasks.filter((t) => t.done)
  const items = calendarItems(tasks, events, categoryName, (t) => priorities[t.priority].label)
  const week = weekDays(today)
  const weekLeft = items.filter((i) => i.date >= today && i.date <= week[6])
  const doneShare = done.length + urgent.length
  const nearestUrgent = [...urgent]
    .sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'))
    .slice(0, 2)
  const nextEvents = upcomingEvents(events, today, 2)
  const name = userName.trim()

  return (
    <Screen>
      <Header
        tone={day ? 'day' : 'night'}
        label={
          <>
            <Logo
              color={day ? colors.green900 : colors.cream}
              check={day ? colors.brass500 : colors.brass300}
            />
            {longDayLabel(today)}
          </>
        }
        topRight={<SyncBadge tone={day ? 'day' : 'dark'} />}
        title={
          <>
            {day ? 'Dzień dobry' : 'Dobry wieczór'}
            {name && (
              <>
                , <Accent>{name}</Accent>
              </>
            )}
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
        <Tile
          to={paths.zadania}
          bg={colors.green900}
          number={open.length}
          numberColor={colors.cream}
          label="DO ZROBIENIA"
          labelColor={colors.brass300}
          sub={`w ${new Set(open.map((t) => t.categoryId)).size} ${plural(
            new Set(open.map((t) => t.categoryId)).size,
            ['kategorii', 'kategoriach', 'kategoriach'],
          )}`}
          subColor={colors.onDarkMuted}
        />
        <Tile
          to={paths.zadaniaPilne}
          bg={priorities.high.bg}
          number={urgent.length}
          numberColor={priorities.high.fg}
          label="PILNE"
          labelColor={priorities.high.fg}
          sub={urgentToday.length > 0 ? `w tym ${urgentToday.length} na dziś` : 'nic na dziś'}
          subColor="#6E3220"
        />
        <Tile
          to={paths.kalendarz}
          bg="#EFE3CC"
          number={weekLeft.length}
          numberColor={priorities.mid.fg}
          label="W TYM TYGODNIU"
          labelColor={priorities.mid.fg}
          sub={`${plural(weekLeft.length, ['wpis', 'wpisy', 'wpisów'])} w kalendarzu`}
          subColor={colors.brass800}
        />
        <Tile
          to={paths.zadaniaOgarniete}
          bg={colors.white}
          shadow
          number={
            <>
              {done.length}
              <span style={{ fontSize: 20, color: colors.muted3 }}> / {doneShare}</span>
            </>
          }
          numberColor={colors.green900}
          label="OGARNIĘTE DZIŚ"
          labelColor={colors.successText}
          sub={
            <span
              style={{
                display: 'block',
                height: 4,
                borderRadius: 4,
                background: colors.borderSoft,
                marginTop: 6,
              }}
            >
              <span
                style={{
                  display: 'block',
                  width: `${doneShare ? Math.round((done.length / doneShare) * 100) : 0}%`,
                  height: '100%',
                  borderRadius: 4,
                  background: colors.green900,
                }}
              />
            </span>
          }
        />
      </div>

      <Link
        to={paths.kalendarz}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: '14px 14px 12px',
          borderRadius: 22,
          background: colors.white,
          boxShadow: shadows.card,
          color: colors.green900,
          textDecoration: 'none',
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            padding: '0 4px',
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '1.4px',
              color: colors.brass700,
            }}
          >
            TEN TYDZIEŃ
          </span>
          <span
            style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1px', color: colors.muted }}
          >
            {weekRange(week[0], week[6])}
          </span>
        </span>
        <span style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4 }}>
          {week.map((k) => {
            const isToday = k === today
            const past = k < today
            const types = [
              ...new Set(items.filter((i) => i.date === k).map((i) => i.typeId)),
            ].slice(0, 3)
            return (
              <span
                key={k}
                aria-label={isToday ? 'dziś' : undefined}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  padding: '6px 0',
                  borderRadius: 14,
                  background: isToday ? colors.green900 : 'transparent',
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: isToday ? colors.brass300 : past ? colors.muted3 : colors.muted,
                  }}
                >
                  {DAYS_SHORT[parseKey(k).getDay()]}
                </span>
                <span
                  style={{
                    fontFamily: fonts.serif,
                    fontSize: 17,
                    fontWeight: 600,
                    color: isToday ? colors.cream : past ? colors.muted3 : colors.green900,
                  }}
                >
                  {parseKey(k).getDate()}
                </span>
                <span style={{ display: 'flex', gap: 3, height: 5 }}>
                  {!past &&
                    types.map((t) => (
                      <span
                        key={t}
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: 3,
                          background: isToday ? typeOf(t).dot : typeOf(t).fg,
                        }}
                      />
                    ))}
                </span>
              </span>
            )
          })}
        </span>
      </Link>

      <Section title="Pilne" link={{ to: paths.zadaniaPilne, label: 'ZADANIA' }}>
        {nearestUrgent.length === 0 ? (
          <Card radius={20} style={{ padding: '16px 18px', color: colors.muted }}>
            Nic pilnego. Pięknie ogarnięte!
          </Card>
        ) : (
          <Card radius={20}>
            {nearestUrgent.map((t, i) => {
              const label = t.due ? dueLabel(t.due, today) : null
              return (
                <Link
                  key={t.id}
                  to={paths.zadaniaPilne}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 16px',
                    borderTop: i === 0 ? 'none' : `1px solid ${colors.line}`,
                    color: colors.green900,
                    textDecoration: 'none',
                  }}
                >
                  <Box color={priorities.high.line} />
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3,
                    }}
                  >
                    <span style={{ fontSize: 16, fontWeight: 700 }}>{t.title}</span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: '1px',
                        color: colors.muted,
                      }}
                    >
                      {categoryName(t.categoryId).toUpperCase()}
                    </span>
                  </span>
                  {label === 'DZIŚ' || label === 'PO TERMINIE' ? (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: '0.6px',
                        color: todayBadge.fg,
                        background: todayBadge.bg,
                        padding: '4px 10px',
                        borderRadius: 10,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {label}
                    </span>
                  ) : (
                    label && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: '0.6px',
                          color: colors.brass700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {label}
                      </span>
                    )
                  )}
                </Link>
              )
            })}
          </Card>
        )}
      </Section>

      <Section
        title={
          <>
            Najbliższe <em>wydarzenia</em>
          </>
        }
        link={{ to: paths.kalendarz, label: 'KALENDARZ' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {nextEvents.map((e) => {
            const type = typeOf(e.typeId)
            const d = parseKey(e.date)
            const when = e.allDay
              ? 'CAŁY DZIEŃ'
              : `${DAYS_SHORT[d.getDay()]} ${e.from}${e.to ? `–${e.to}` : ''}`
            return (
              <Link
                key={e.id}
                to={paths.kalendarzDzien(e.date)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '10px 14px 10px 10px',
                  borderRadius: 20,
                  background: colors.white,
                  boxShadow: shadows.card,
                  color: colors.green900,
                  textDecoration: 'none',
                }}
              >
                <span
                  style={{
                    width: 46,
                    height: 52,
                    borderRadius: '23px 23px 10px 10px',
                    background: type.bg,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    flex: 'none',
                  }}
                >
                  <span
                    style={{
                      fontFamily: fonts.serif,
                      fontSize: 21,
                      fontWeight: 600,
                      lineHeight: 1,
                      color: type.fg,
                    }}
                  >
                    {d.getDate()}
                  </span>
                  <span
                    style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1px', color: type.fg }}
                  >
                    {MONTHS_SHORT[d.getMonth()]}
                  </span>
                </span>
                <span
                  style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}
                >
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{e.title}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: '1px',
                      color: colors.muted,
                    }}
                  >
                    {type.name.toUpperCase()} · {when}
                  </span>
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: priorities.mid.fg,
                    background: '#EFE3CC',
                    padding: '4px 10px',
                    borderRadius: 12,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {inDays(diffDays(today, e.date))}
                </span>
              </Link>
            )
          })}
        </div>
      </Section>

      <TabBar active="start" />
    </Screen>
  )
}

function Tile({
  to,
  bg,
  shadow,
  number,
  numberColor,
  label,
  labelColor,
  sub,
  subColor,
}: {
  to: string
  bg: string
  shadow?: boolean
  number: ReactNode
  numberColor: string
  label: string
  labelColor: string
  sub: ReactNode
  subColor?: string
}) {
  return (
    <Link
      to={to}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '14px 16px',
        borderRadius: 22,
        background: bg,
        boxShadow: shadow ? shadows.card : undefined,
        color: colors.green900,
        textDecoration: 'none',
      }}
    >
      <span
        style={{
          fontFamily: fonts.serif,
          fontSize: 36,
          fontWeight: 500,
          lineHeight: 1,
          color: numberColor,
        }}
      >
        {number}
      </span>
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.2px', color: labelColor }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: subColor }}>{sub}</span>
    </Link>
  )
}

function Section({
  title,
  link,
  children,
}: {
  title: ReactNode
  link: { to: string; label: string }
  children: ReactNode
}) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 4px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontFamily: fonts.serif, fontSize: 21, fontWeight: 500 }}>
          {title}
        </h2>
        <Link
          to={link.to}
          style={{ fontSize: 12, fontWeight: 800, letterSpacing: '1px', textDecoration: 'none' }}
        >
          {link.label}
        </Link>
      </div>
      {children}
    </section>
  )
}

/** „5–11 PAŹ” albo „29 WRZ – 5 PAŹ”. */
function weekRange(from: string, to: string): string {
  const a = parseKey(from)
  const b = parseKey(to)
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} ${MONTHS_SHORT[b.getMonth()]}`
    : `${a.getDate()} ${MONTHS_SHORT[a.getMonth()]} – ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]}`
}
