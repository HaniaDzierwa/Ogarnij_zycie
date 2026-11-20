import { useState } from 'react'
import { paths } from '../../app/screens.ts'
import { Accent, Header } from '../../components/Header.tsx'
import { TabBar } from '../../components/TabBar.tsx'
import { UndoToast } from '../../components/UndoToast.tsx'
import { Chip, Dot, Screen, Sheet } from '../../components/ui.tsx'
import { CalendarIcon, CheckIcon, TrashIcon, UndoIcon } from '../../components/icons.tsx'
import { DAYS_SHORT, MONTHS_SHORT, parseKey } from '../../data/dates.ts'
import { restoreEvent } from '../../data/eventOps.ts'
import { useStore } from '../../data/store.ts'
import { plural } from '../../data/plural.ts'
import { eventTypeOf } from '../../data/selectors.ts'
import { restoreFromTrash } from '../../data/taskOps.ts'
import { colors, fonts, noCategory, priorities, shadows } from '../../theme'
import { trashItems, trashWhat, TRASH_DAYS, type TrashItem } from './tasksView.ts'

const elementow = (n: number) => `${n} ${plural(n, ['element', 'elementy', 'elementów'])}`
const dni = (n: number) => (n === 1 ? '1 dzień' : `${n} dni`)

type Kind = 'all' | 'task' | 'event'

/**
 * 3a Kosz (Kosz.dc.html): jeden wspólny na zadania i wydarzenia, wejście z Ustawienia → Porządki.
 * Usunięte czekają 30 dni na przywrócenie.
 */
export function TrashScreen() {
  const store = useStore()
  const { tasks, events, eventTypes, today, categories, members, currentUid } = store
  const [kind, setKind] = useState<Kind>('all')
  // „Opróżnij kosz” (all) albo „Usuń zaznaczone” (selected)
  const [confirm, setConfirm] = useState<'all' | 'selected' | null>(null)
  // wybór kilku elementów do usunięcia na zawsze (poprawka Hani 2026-11-20)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const keyOf = (i: TrashItem) => `${i.kind}:${i.id}`
  const items = trashItems(tasks, events, today)
  const n = items.length
  const nTasks = items.filter((i) => i.kind === 'task').length
  const shown = items.filter((i) => kind === 'all' || i.kind === kind)
  const picked = shown.filter((i) => selected.has(keyOf(i)))
  const toggle = (i: TrashItem) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(keyOf(i))) next.delete(keyOf(i))
      else next.add(keyOf(i))
      return next
    })
  const stopSelecting = () => {
    setSelecting(false)
    setSelected(new Set())
  }

  const others = members.filter((m) => m.uid !== currentUid)
  const alsoFor =
    others.length === 1
      ? ' – znikną też u domownika'
      : others.length > 1
        ? ' – znikną też u pozostałych domowników'
        : ''

  /** Ikonka, kropka i opis: zadanie – kategoria · kto · kiedy; wydarzenie – rodzaj · data · kto. */
  const describe = (i: TrashItem) => {
    const by = members.find((m) => m.uid === i.deletedBy)
    const who = by?.name.toUpperCase() ?? ''
    if (i.kind === 'task') {
      const cat = categories.find((c) => c.id === i.task.categoryId) ?? noCategory
      const when =
        i.ago === 0 ? 'DZIŚ' : i.ago === 1 ? 'WCZORAJ' : `${dni(i.ago).toUpperCase()} TEMU`
      return {
        icon: (
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: 6,
              border: `2px solid ${cat.color}`,
            }}
          />
        ),
        iconBg: colors.cream,
        iconFg: colors.green900,
        dot: cat.color,
        meta: `${cat.name.toUpperCase()} · ${who} · ${when}`,
      }
    }
    const type = eventTypeOf(eventTypes, i.event.typeId)
    const d = parseKey(i.event.date)
    const date = `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
    const time = i.event.from ? ` · ${i.event.from}${i.event.to ? `–${i.event.to}` : ''}` : ''
    return {
      icon: <CalendarIcon size={18} />,
      iconBg: type.bg,
      iconFg: type.fg,
      dot: null,
      meta: `${type.name.toUpperCase()} · ${date}${time} · ${who}`,
    }
  }

  /** „Przywróć” odkłada element na miejsce: na listę zadań albo do kalendarza. */
  const restore = (i: TrashItem) =>
    i.kind === 'task'
      ? store.changeTasks(`Wróciło do zadań: ${i.title}`, (list) =>
          list.map((t) => (t.id === i.id ? restoreFromTrash(t) : t)),
        )
      : store.changeEvents(`Wróciło do kalendarza: ${i.title}`, (list) =>
          list.map((e) => (e.id === i.id ? restoreEvent(e) : e)),
        )

  const emptyLabel =
    n === 0
      ? 'Kosz jest pusty'
      : kind === 'task'
        ? 'Brak usuniętych zadań'
        : 'Brak usuniętych wydarzeń'

  return (
    <Screen gap={18}>
      <Header
        back={{ to: paths.ustawienia, label: 'USTAWIENIA' }}
        topRight={
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '1.2px',
              color: colors.onDarkMuted2,
            }}
          >
            {TRASH_DAYS} DNI NA ODZYSKANIE
          </span>
        }
        title={
          <>
            W <Accent>koszu</Accent>
          </>
        }
        aside={
          <span style={{ fontSize: 12, fontWeight: 700, color: colors.onDarkMuted3 }}>
            {n ? elementow(n) : 'pusto'}
          </span>
        }
      />
      <span style={{ padding: '0 4px', fontSize: 14, lineHeight: 1.45, color: colors.muted2 }}>
        Usunięte zadania i wydarzenia czekają tu {TRASH_DAYS} dni. Możesz je przywrócić – potem
        znikną same, u wszystkich domowników.
      </span>

      {n > 0 && (
        <div role="group" aria-label="Pokaż" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(
            [
              { id: 'all', name: 'Wszystko', count: n },
              { id: 'task', name: 'Zadania', count: nTasks },
              { id: 'event', name: 'Wydarzenia', count: n - nTasks },
            ] as const
          ).map((k) => (
            <Chip
              key={k.id}
              on={kind === k.id}
              onClick={() => {
                setKind(k.id)
                setSelected(new Set())
              }}
            >
              {k.name} <span style={{ opacity: 0.65, fontWeight: 600 }}>{k.count}</span>
            </Chip>
          ))}
          <span style={{ flex: 1 }} />
          <button
            type="button"
            onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
            style={{
              height: 36,
              padding: '0 6px',
              border: 0,
              background: 'transparent',
              color: colors.brass700,
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            {selecting ? 'Gotowe' : 'Wybierz'}
          </button>
        </div>
      )}

      {shown.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            padding: '36px 20px',
            borderRadius: 22,
            background: colors.white,
            boxShadow: shadows.card,
            textAlign: 'center',
            color: colors.muted,
          }}
        >
          <span
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              background: colors.sand,
              color: colors.brass700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrashIcon />
          </span>
          <span
            style={{
              fontFamily: fonts.serif,
              fontStyle: 'italic',
              fontSize: 18,
              color: colors.green900,
            }}
          >
            {emptyLabel}
          </span>
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: colors.white,
              borderRadius: 22,
              boxShadow: shadows.card,
              overflow: 'hidden',
            }}
          >
            {shown.map((item) => {
              const d = describe(item)
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 12px 12px 14px',
                    minHeight: 72,
                    borderBottom: `1px solid ${colors.line}`,
                  }}
                >
                  {selecting && (
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={selected.has(keyOf(item))}
                      aria-label={`Zaznacz: ${item.title}`}
                      onClick={() => toggle(item)}
                      style={{
                        width: 44,
                        height: 44,
                        margin: '-4px -6px -4px -8px',
                        flex: 'none',
                        border: 0,
                        padding: 0,
                        background: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          boxSizing: 'border-box',
                          borderRadius: 7,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: colors.white,
                          ...(selected.has(keyOf(item))
                            ? { background: priorities.high.line }
                            : { border: `2px solid ${colors.border}` }),
                        }}
                      >
                        {selected.has(keyOf(item)) && <CheckIcon size={14} strokeWidth={3} />}
                      </span>
                    </button>
                  )}
                  <span
                    aria-hidden="true"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      flex: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: d.iconBg,
                      color: d.iconFg,
                    }}
                  >
                    {d.icon}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 16, fontWeight: 700, color: colors.muted }}>
                      {item.title}
                    </span>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: '0.8px',
                        color: colors.muted,
                      }}
                    >
                      {d.dot && <Dot color={d.dot} />}
                      {d.meta}
                    </span>
                    <span
                      style={{
                        fontFamily: fonts.serif,
                        fontStyle: 'italic',
                        fontSize: 13,
                        color: item.left <= 5 ? priorities.high.line : colors.brass700,
                      }}
                    >
                      zniknie za {dni(item.left)}
                    </span>
                  </span>
                  {!selecting && (
                    <button
                      type="button"
                      aria-label={`Przywróć: ${item.title}`}
                      onClick={() => restore(item)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        height: 40,
                        padding: '0 14px',
                        borderRadius: 20,
                        border: `1px solid ${colors.brass500}`,
                        background: colors.white,
                        color: colors.brass700,
                        fontSize: 13,
                        fontWeight: 800,
                        flex: 'none',
                      }}
                    >
                      <UndoIcon size={16} strokeWidth={2.4} />
                      Przywróć
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          <button
            type="button"
            disabled={selecting && picked.length === 0}
            onClick={() => setConfirm(selecting ? 'selected' : 'all')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              height: 52,
              border: '1px solid #E7B8A8',
              borderRadius: 26,
              background: 'transparent',
              color: priorities.high.line,
              fontSize: 15,
              fontWeight: 800,
              opacity: selecting && picked.length === 0 ? 0.5 : 1,
            }}
          >
            <TrashIcon />
            {selecting
              ? picked.length
                ? `Usuń zaznaczone (${picked.length})`
                : 'Zaznacz, co usunąć'
              : 'Opróżnij kosz'}
          </button>
        </>
      )}

      {confirm && n > 0 && (
        <Sheet
          open
          onClose={() => setConfirm(null)}
          label={confirm === 'all' ? 'Opróżnij kosz' : 'Usuń zaznaczone'}
        >
          <span style={{ fontFamily: fonts.serif, fontSize: 26, fontWeight: 500 }}>
            Usunąć <em style={{ color: priorities.high.line }}>na zawsze?</em>
          </span>
          <span style={{ fontSize: 15, lineHeight: 1.45, color: colors.muted2 }}>
            {confirm === 'all' ? (
              <>
                W koszu{' '}
                {n === 1
                  ? 'jest 1 element'
                  : `${plural(n, ['jest', 'są', 'jest'])} ${elementow(n)} – ${trashWhat(items)}`}
              </>
            ) : (
              <>
                Zaznaczone: {elementow(picked.length)}
                {picked.length > 1 ? ` – ${trashWhat(picked)}` : ''}
              </>
            )}
            . Tego nie da się cofnąć{alsoFor}.
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={() => setConfirm(null)}
              style={{
                height: 54,
                border: `1px solid ${colors.border}`,
                borderRadius: 27,
                background: colors.white,
                color: colors.green900,
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm === 'all') {
                  store.setTasks((list) => list.filter((t) => !t.deleted))
                  store.setEvents((list) => list.filter((e) => !e.deleted))
                } else {
                  const keys = new Set(picked.map(keyOf))
                  store.setTasks((list) =>
                    list.filter((t) => !(t.deleted && keys.has(`task:${t.id}`))),
                  )
                  store.setEvents((list) =>
                    list.filter((e) => !(e.deleted && keys.has(`event:${e.id}`))),
                  )
                  stopSelecting()
                }
                setConfirm(null)
              }}
              style={{
                height: 54,
                border: 0,
                borderRadius: 27,
                background: priorities.high.line,
                color: colors.white,
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              Usuń na zawsze
            </button>
          </div>
        </Sheet>
      )}

      <UndoToast />
      <TabBar active="ustawienia" />
    </Screen>
  )
}
