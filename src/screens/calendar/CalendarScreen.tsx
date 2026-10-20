import { newId } from '../../data/ids.ts'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { Accent, Header } from '../../components/Header.tsx'
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EventTypeIcon,
  TrashIcon,
} from '../../components/icons.tsx'
import { TabBar } from '../../components/TabBar.tsx'
import { Dot, Screen, Segmented } from '../../components/ui.tsx'
import {
  DAYS,
  DAYS_SHORT,
  MONTHS,
  MONTHS_GEN,
  MONTHS_SHORT,
  addDays,
  diffDays,
  inDays,
  parseKey,
  weekStart,
  type DateKey,
} from '../../data/dates.ts'
import { useStore } from '../../data/store.ts'
import { calendarItems, weekDays } from '../../data/selectors.ts'
import { colors, fonts, priorities, shadows } from '../../theme'
import {
  agendaFor,
  customType,
  dayCountLabel,
  laterItems,
  monthGrid,
  timeLabel,
  typesOn,
  weekCountLabel,
  weekRangeLabel,
} from './calendarView.ts'
import { SwipeRow, type SwipeAction } from '../../components/SwipeRow.tsx'
import { UndoToast } from '../../components/UndoToast.tsx'
import type { CalendarItem } from '../../data/selectors.ts'
import type { EventType } from '../../data/types.ts'
import { EventSheet } from './EventSheet.tsx'
import { useItemSheets } from '../shared/useItemSheets.tsx'

type View = 'week' | 'month'

const DATE_PARAM = /^\d{4}-\d{2}-\d{2}$/

/** 4 Kalendarz (Kalendarz.dc.html). Adres: `?dzien=RRRR-MM-DD`, `?nowe=wydarzenie`. */
export function CalendarScreen() {
  const store = useStore()
  const { today, tasks, events, categories, eventTypes } = store
  const [params, setParams] = useSearchParams()

  const [view, setView] = useState<View>('week')
  const [sel, setSel] = useState<DateKey>(() => {
    const d = params.get('dzien')
    return d && DATE_PARAM.test(d) ? d : today
  })
  // Miesiąc pokazany w widoku miesiąca (strzałki zmieniają go niezależnie od tygodnia).
  const [month, setMonth] = useState(() => {
    const d = parseKey(sel)
    return { y: d.getFullYear(), m: d.getMonth() }
  })

  const sheetOpen = params.get('nowe') === 'wydarzenie'
  const setSheetOpen = (open: boolean) =>
    setParams(
      (p) => {
        if (open) p.set('nowe', 'wydarzenie')
        else p.delete('nowe')
        return p
      },
      { replace: !open },
    )

  const categoryName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name ?? 'Bez kategorii'
  const typeOf = (id: string) => eventTypes.find((t) => t.id === id) ?? eventTypes[0]
  const items = calendarItems(tasks, events, categoryName, (t) => priorities[t.priority].label)

  const pick = (k: DateKey) => {
    const d = parseKey(k)
    setSel(k)
    setMonth({ y: d.getFullYear(), m: d.getMonth() })
  }
  const shift = (n: number) => {
    if (view === 'week') return pick(addDays(sel, 7 * n))
    const d = new Date(month.y, month.m + n, 1)
    pick(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`)
  }

  const week = weekDays(sel)
  const monday = weekStart(sel)
  const weekCount = items.filter((i) => i.date >= week[0] && i.date <= week[6]).length
  const agenda = agendaFor(items, sel)
  const later = laterItems(items, week[6])
  const selDate = parseKey(sel)
  const isWeek = view === 'week'

  // Arkusz wydarzenia albo zadania (termin zadania) – jak na liście zadań; po zamknięciu – dzień wpisu
  const items$ = useItemSheets({
    onCloseEvent: (e) => pick(e.date),
    onCloseTask: (t) => t.due && pick(t.due),
  })
  /** Wiersz w agendzie i w „Później”: dotknięcie = arkusz, w lewo = do kosza, w prawo = ogarnij (zadanie). */
  const rowActions = (e: CalendarItem) => {
    const task = e.taskId ? tasks.find((t) => t.id === e.taskId) : undefined
    const event = task ? undefined : events.find((x) => x.id === e.id)
    return {
      onOpen: () => (task ? items$.openTask(task) : event && items$.openEvent(event)),
      onDone: task && (() => items$.toggleDone(task)),
      onDelete: () => (task ? items$.trashTask(task) : event && items$.removeEvent(event)),
    }
  }

  const addType = (name: string, color: string) => {
    const id = newId('r')
    store.setEventTypes((list) => [...list, customType(id, name, color)])
    return id
  }

  const dots = (k: DateKey, on: boolean, size: number) =>
    typesOn(items, k).map((t) => (
      <Dot key={t} color={on ? typeOf(t).dot : typeOf(t).fg} size={size} />
    ))

  return (
    <Screen gap={16}>
      <Header
        label="KALENDARZ"
        topRight={
          <button
            type="button"
            onClick={() => pick(today)}
            style={{
              height: 30,
              padding: '0 12px',
              border: '1px solid rgba(232,201,142,0.5)',
              borderRadius: 15,
              background: 'transparent',
              color: colors.brass300,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.8px',
            }}
          >
            DZIŚ
          </button>
        }
        title={
          // Tytuł w jednej linii – przy długim miesiącu łamie się licznik obok.
          <span style={{ whiteSpace: 'nowrap' }}>
            {MONTHS[month.m]} <Accent>{month.y}</Accent>
          </span>
        }
        aside={
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: colors.onDarkMuted3,
              textAlign: 'right',
            }}
          >
            {weekCountLabel(weekCount)}
          </span>
        }
      />

      <Segmented
        size="full"
        label="Widok kalendarza"
        options={[
          { id: 'week', name: 'Tydzień' },
          { id: 'month', name: 'Miesiąc' },
        ]}
        value={view}
        onChange={(v) => {
          setView(v)
          pick(sel)
        }}
      />

      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
      >
        <RoundButton
          label={isWeek ? 'Poprzedni tydzień' : 'Poprzedni miesiąc'}
          onClick={() => shift(-1)}
        >
          <ChevronLeftIcon />
        </RoundButton>
        <span
          style={{ fontFamily: fonts.serif, fontSize: 18, fontWeight: 600, textAlign: 'center' }}
        >
          {isWeek ? weekRangeLabel(monday) : `${MONTHS[month.m]} ${month.y}`}
        </span>
        <RoundButton
          label={isWeek ? 'Następny tydzień' : 'Następny miesiąc'}
          onClick={() => shift(1)}
        >
          <ChevronRightIcon />
        </RoundButton>
      </div>

      {isWeek ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            gap: 4,
            padding: 8,
            borderRadius: 22,
            background: colors.white,
            boxShadow: shadows.card,
          }}
        >
          {week.map((k) => {
            const d = parseKey(k)
            const on = k === sel
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                aria-label={`${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`}
                onClick={() => pick(k)}
                style={dayCell(on, k === today, {
                  padding: '8px 0 7px',
                  borderRadius: 16,
                  minHeight: 64,
                })}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '0.8px',
                    color: on ? colors.brass300 : colors.muted3,
                  }}
                >
                  {DAYS_SHORT[d.getDay()]}
                </span>
                <span
                  style={{ fontFamily: fonts.serif, fontSize: 19, fontWeight: 600, lineHeight: 1 }}
                >
                  {d.getDate()}
                </span>
                <span style={{ display: 'flex', gap: 3, height: 5 }}>{dots(k, on, 5)}</span>
              </button>
            )
          })}
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: '10px 8px 12px',
            borderRadius: 22,
            background: colors.white,
            boxShadow: shadows.card,
          }}
        >
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 2 }}
          >
            {['PN', 'WT', 'ŚR', 'CZ', 'PT', 'SO', 'ND'].map((w) => (
              <span
                key={w}
                style={{
                  textAlign: 'center',
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '1px',
                  color: colors.muted3,
                }}
              >
                {w}
              </span>
            ))}
          </div>
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 2 }}
          >
            {monthGrid(month.y, month.m).map((k, i) => {
              if (!k) return <span key={`pusty-${i}`} style={{ height: 42 }} />
              const d = parseKey(k)
              const on = k === sel
              const isToday = k === today
              const has = typesOn(items, k).length > 0
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={on}
                  aria-label={`${d.getDate()} ${MONTHS_GEN[d.getMonth()]}${has ? ', są wpisy' : ''}`}
                  onClick={() => pick(k)}
                  style={dayCell(on, isToday, {
                    height: 42,
                    borderRadius: 21,
                    fontSize: 14,
                    fontWeight: on || isToday ? 800 : 600,
                  })}
                >
                  <span>{d.getDate()}</span>
                  <span style={{ display: 'flex', gap: 2, height: 4 }}>{dots(k, on, 4)}</span>
                </button>
              )
            })}
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px 12px',
              padding: '8px 6px 0',
              borderTop: `1px solid ${colors.line}`,
            }}
          >
            {eventTypes.map((t) => (
              <span
                key={t.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  color: colors.muted2,
                }}
              >
                <Dot color={t.fg} />
                {t.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontFamily: fonts.serif, fontSize: 21, fontWeight: 500 }}>
            {DAYS[selDate.getDay()]},{' '}
            <em>
              {selDate.getDate()} {MONTHS_GEN[selDate.getMonth()]}
              {sel === today && ' · dziś'}
            </em>
          </h2>
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '1.2px',
              color: colors.brass700,
            }}
          >
            {dayCountLabel(agenda.length)}
          </span>
        </div>
        {agenda.length === 0 && (
          <div
            style={{
              padding: 18,
              borderRadius: 20,
              border: `1px dashed ${colors.border}`,
              fontFamily: fonts.serif,
              fontStyle: 'italic',
              fontSize: 16,
              color: colors.muted,
              textAlign: 'center',
            }}
          >
            Spokojny dzień – nic zaplanowanego
          </div>
        )}
        {agenda.map((e) => (
          <AgendaRow key={e.id} item={e} type={typeOf(e.typeId)} {...rowActions(e)} />
        ))}
      </section>

      {isWeek && later.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 4px' }}>
          <h2 style={{ margin: 0, fontFamily: fonts.serif, fontSize: 21, fontWeight: 500 }}>
            Później
          </h2>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: colors.white,
              borderRadius: 20,
              boxShadow: shadows.card,
              overflow: 'hidden',
            }}
          >
            {later.map((e, i) => {
              const t = typeOf(e.typeId)
              const d = parseKey(e.date)
              const { onOpen, onDone, onDelete } = rowActions(e)
              return (
                <div
                  key={e.id}
                  style={{
                    borderBottom: i === later.length - 1 ? 0 : `1px solid ${colors.line}`,
                  }}
                >
                  <SwipeRow
                    right={onDone && doneAction(e, onDone)}
                    left={deleteAction(e, onDelete)}
                  >
                    <button
                      type="button"
                      onClick={onOpen}
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
                          width: 44,
                          height: 50,
                          borderRadius: '22px 22px 10px 10px',
                          background: t.bg,
                          color: t.fg,
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
                            fontSize: 19,
                            fontWeight: 600,
                            lineHeight: 1,
                          }}
                        >
                          {d.getDate()}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1px' }}>
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
                        <span style={{ fontSize: 15, fontWeight: 700 }}>{e.title}</span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            letterSpacing: '1px',
                            color: colors.muted,
                          }}
                        >
                          {(t.name + (e.from ? ` · ${timeLabel(e)}` : '')).toUpperCase()}
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
        </section>
      )}

      {sheetOpen && (
        <EventSheet
          day={sel}
          eventTypes={eventTypes}
          onAddType={addType}
          onClose={() => setSheetOpen(false)}
          onSave={(draft) => {
            store.setEvents((list) => [
              ...list,
              { ...draft, id: newId('e'), createdBy: store.currentUid },
            ])
            setSheetOpen(false)
          }}
        />
      )}

      {items$.sheets}
      <UndoToast />
      <TabBar active="kalendarz" onAddEvent={() => setSheetOpen(true)} />
    </Screen>
  )
}

/** Wejście z innego ekranu z nowym `?dzien=` zaczyna od tego dnia. */
export function CalendarRoute() {
  const [params] = useSearchParams()
  return <CalendarScreen key={params.get('dzien') ?? ''} />
}

/** Gest w prawo na terminie zadania. */
const doneAction = (item: CalendarItem, run: () => void): SwipeAction => ({
  label: 'Ogarnij',
  icon: <CheckIcon />,
  bg: colors.green900,
  fg: colors.brass300,
  srLabel: `Ogarnij: ${item.title}`,
  run,
})

/** Gest w lewo: do kosza (po pytaniu). */
const deleteAction = (item: CalendarItem, run: () => void): SwipeAction => ({
  label: 'Usuń',
  icon: <TrashIcon />,
  bg: priorities.high.line,
  fg: colors.white,
  srLabel: `Przenieś do kosza: ${item.title}`,
  run,
})

/**
 * Wpis w agendzie – jak wiersz zadania: dotknięcie otwiera arkusz, w lewo = usuń,
 * w prawo = ogarnij (tylko termin zadania).
 */
function AgendaRow({
  item,
  type,
  onOpen,
  onDone,
  onDelete,
}: {
  item: CalendarItem
  type: EventType
  onOpen: () => void
  onDone?: () => void
  onDelete: () => void
}) {
  return (
    <div style={{ borderRadius: 20, boxShadow: shadows.card, overflow: 'hidden' }}>
      <SwipeRow right={onDone && doneAction(item, onDone)} left={deleteAction(item, onDelete)}>
        <button
          type="button"
          onClick={onOpen}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            width: '100%',
            padding: '12px 16px 12px 12px',
            border: 0,
            background: 'transparent',
            textAlign: 'left',
            color: colors.green900,
          }}
        >
          <span
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: type.bg,
              color: type.fg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 'none',
            }}
          >
            <EventTypeIcon icon={type.icon} />
          </span>
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{item.title}</span>
            <span
              style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1px', color: colors.muted }}
            >
              {(type.name + (item.note ? ` · ${item.note}` : '')).toUpperCase()}
            </span>
          </span>
          <span
            style={{
              fontFamily: fonts.serif,
              fontSize: 16,
              fontWeight: 600,
              color: colors.green900,
              whiteSpace: 'nowrap',
            }}
          >
            {timeLabel(item)}
          </span>
        </button>
      </SwipeRow>
    </div>
  )
}

/** Dzień w siatce: wybrany = zielone tło, dziś = mosiężna obwódka. */
function dayCell(on: boolean, isToday: boolean, extra: CSSProperties): CSSProperties {
  return {
    border: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    background: on ? colors.green900 : 'transparent',
    color: on ? colors.cream : colors.green900,
    boxShadow: isToday && !on ? `inset 0 0 0 1.5px ${colors.brass500}` : 'none',
    ...extra,
  }
}

function RoundButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        width: 44,
        height: 44,
        border: `1px solid ${colors.border}`,
        borderRadius: 22,
        background: colors.white,
        color: colors.green900,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 'none',
      }}
    >
      {children}
    </button>
  )
}
