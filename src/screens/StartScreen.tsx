import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { paths } from '../app/screens.ts'
import { Accent, Header } from '../components/Header.tsx'
import { Logo } from '../components/Logo.tsx'
import { CheckIcon, TrashIcon } from '../components/icons.tsx'
import { SwipeRow } from '../components/SwipeRow.tsx'
import { TabBar } from '../components/TabBar.tsx'
import { UndoToast } from '../components/UndoToast.tsx'
import { Box, Card, Screen, OfflineBadge } from '../components/ui.tsx'
import {
  DAYS_SHORT,
  MONTHS_SHORT,
  addDays,
  diffDays,
  inDays,
  isDaytime,
  longDayLabel,
  parseKey,
} from '../data/dates.ts'
import { useStore } from '../data/store.ts'
import { plural } from '../data/plural.ts'
import {
  calendarItems,
  eventTypeOf,
  priorityOf,
  doneOn,
  openTasks,
  upcomingEvents,
  urgentOpen,
  weekDays,
} from '../data/selectors.ts'
import { PushCard } from '../push/PushCard.tsx'
import { RepeatBadge } from '../components/RepeatBadge.tsx'
import {
  colors,
  eventTint,
  fonts,
  palette,
  priorities,
  shadows,
  themed,
  useResolvedTheme,
} from '../theme'
import { DueBadge } from '../components/DueBadge.tsx'
import { useItemSheets } from './shared/useItemSheets.tsx'

/** 2 Start (Kategorie.dc.html, StartDzien / StartNoc). Podgląd pory: `?pora=dzien|noc`. */
export function StartScreen() {
  const {
    today,
    userName,
    tasks,
    events,
    categories,
    eventTypes,
    priorities: prioList,
  } = useStore()
  const [params] = useSearchParams()
  const pora = params.get('pora')
  // w ciemnym motywie nagłówek zawsze nocny
  const dark = useResolvedTheme() === 'dark'
  const day = dark ? false : pora === 'dzien' ? true : pora === 'noc' ? false : isDaytime()

  const categoryName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name ?? 'Bez kategorii'
  const typeOf = (id: string) => eventTypeOf(eventTypes, id)

  const open = openTasks(tasks)
  const urgent = urgentOpen(tasks)
  const urgentToday = urgent.filter((t) => t.due && diffDays(today, t.due) <= 0)
  // „Ogarnięte dziś” = ogarnięte dzisiaj (wg doneAt) / (te + niezrobione z terminem na dziś lub po terminie)
  const done = doneOn(tasks, today)
  const items = calendarItems(
    tasks,
    events,
    categoryName,
    (t) => priorityOf(prioList, t.priority).label,
    // „Ten tydzień” – powtórki wydarzeń cyklicznych do końca tygodnia
    { from: today, to: addDays(today, 7) },
  )
  const week = weekDays(today)
  const weekLeft = items.filter((i) => i.date >= today && i.date <= week[6])
  const dueNow = open.filter((t) => t.due && t.due <= today)
  const doneShare = done.length + dueNow.length
  const nearestUrgent = [...urgent]
    .sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'))
    .slice(0, 2)
  const nextEvents = upcomingEvents(events, today, 2)
  const name = userName.trim()
  // zadania i wydarzenia na Starcie – te same akcje co w Zadaniach i Kalendarzu (uwaga Hani 2026-10-20)
  const sheets$ = useItemSheets()

  return (
    <Screen>
      <Header
        tone={day ? 'day' : 'night'}
        label={
          <>
            <Logo
              color={day ? colors.green900 : colors.onHeader}
              check={day ? colors.brass500 : colors.headerAccent}
            />
            {longDayLabel(today)}
          </>
        }
        topRight={<OfflineBadge tone={day ? 'day' : 'dark'} />}
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
          // kafel green900 – w ciemnym jasny, więc ciemny podpis
          subColor={themed(colors.onDarkMuted, palette.muted[0])}
        />
        <Tile
          to={paths.zadaniaPilne}
          bg={priorities.high.bg}
          number={urgent.length}
          numberColor={priorities.high.fg}
          label="PILNE"
          labelColor={priorities.high.fg}
          sub={urgentToday.length > 0 ? `w tym ${urgentToday.length} na dziś` : 'nic na dziś'}
          subColor={priorities.high.fg}
        />
        <Tile
          to={paths.kalendarz}
          bg={priorities.mid.bg}
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

      <PushCard />

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
                          // dziś: na zielonym pastelowa kropka, w ciemnym (kremowe tło) – ciemna
                          background: isToday
                            ? themed(typeOf(t).dot, typeOf(t).fg)
                            : eventTint(typeOf(t)).fg,
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
              return (
                <div
                  key={t.id}
                  style={{ borderTop: i === 0 ? 'none' : `1px solid ${colors.line}` }}
                >
                  <SwipeRow
                    right={{
                      label: 'Ogarnij',
                      icon: <CheckIcon />,
                      bg: colors.green900,
                      fg: colors.brass300,
                      run: () => sheets$.toggleDone(t),
                    }}
                    left={{
                      label: 'Usuń',
                      icon: <TrashIcon />,
                      bg: priorities.high.line,
                      fg: colors.onDanger,
                      srLabel: `Przenieś do kosza: ${t.title}`,
                      run: () => sheets$.trashTask(t),
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'stretch' }}>
                      <button
                        type="button"
                        aria-label={`Ogarnij: ${t.title}`}
                        onClick={() => sheets$.toggleDone(t)}
                        style={{
                          width: 56,
                          flex: 'none',
                          border: 0,
                          padding: 0,
                          background: 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Box color={priorities.high.line} />
                      </button>
                      <button
                        type="button"
                        onClick={() => sheets$.openTask(t)}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          padding: '14px 16px 14px 0',
                          border: 0,
                          background: 'transparent',
                          textAlign: 'left',
                          color: colors.green900,
                        }}
                      >
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
                        {t.due && <DueBadge due={t.due} today={today} week={t.dueWeek} />}
                      </button>
                    </div>
                  </SwipeRow>
                </div>
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
            const tint = eventTint(type)
            const d = parseKey(e.date)
            const when = e.allDay
              ? 'CAŁY DZIEŃ'
              : `${DAYS_SHORT[d.getDay()]} ${e.from}${e.to ? `–${e.to}` : ''}`
            return (
              <div
                key={`${e.id}@${e.date}`}
                style={{ borderRadius: 20, boxShadow: shadows.card, overflow: 'hidden' }}
              >
                <SwipeRow
                  left={{
                    label: 'Usuń',
                    icon: <TrashIcon />,
                    bg: priorities.high.line,
                    fg: colors.onDanger,
                    srLabel: `Przenieś do kosza: ${e.title}`,
                    run: () => sheets$.removeEvent(e),
                  }}
                >
                  <button
                    type="button"
                    onClick={() => sheets$.openEvent(e)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      width: '100%',
                      padding: '10px 14px 10px 10px',
                      border: 0,
                      background: 'transparent',
                      textAlign: 'left',
                      color: colors.green900,
                    }}
                  >
                    <span
                      style={{
                        width: 46,
                        height: 52,
                        borderRadius: '23px 23px 10px 10px',
                        background: tint.bg,
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
                          color: tint.fg,
                        }}
                      >
                        {d.getDate()}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: '1px',
                          color: tint.fg,
                        }}
                      >
                        {MONTHS_SHORT[d.getMonth()]}
                      </span>
                    </span>
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                      }}
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
                        {e.repeat && (
                          <>
                            {' · '}
                            <RepeatBadge repeat={e.repeat} />
                          </>
                        )}
                      </span>
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: priorities.mid.fg,
                        background: priorities.mid.bg,
                        padding: '4px 10px',
                        borderRadius: 12,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {inDays(diffDays(today, e.date))}
                    </span>
                  </button>
                </SwipeRow>
              </div>
            )
          })}
        </div>
      </Section>

      {sheets$.sheets}
      <UndoToast />
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
