import { useState } from 'react'
import { paths } from '../../app/screens.ts'
import { Accent, Header } from '../../components/Header.tsx'
import { TabBar } from '../../components/TabBar.tsx'
import { UndoToast } from '../../components/UndoToast.tsx'
import { Dot, Screen, Sheet } from '../../components/ui.tsx'
import { TrashIcon, UndoIcon } from '../../components/icons.tsx'
import { useStore } from '../../data/MockStore.tsx'
import { plural } from '../../data/plural.ts'
import { MONTHS_SHORT, parseKey } from '../../data/dates.ts'
import { restoreEvent } from '../../data/eventOps.ts'
import { restoreFromTrash } from '../../data/taskOps.ts'
import { colors, fonts, noCategory, priorities, shadows } from '../../theme'
import { trashCountLabel, trashItems, trashWhat, TRASH_DAYS, type TrashItem } from './tasksView.ts'

const dni = (n: number) => (n === 1 ? '1 dzień' : `${n} dni`)

/** 3a Kosz (Kosz.dc.html): usunięte zadania i wydarzenia czekają 30 dni na przywrócenie. */
export function TrashScreen() {
  const store = useStore()
  const { tasks, events, eventTypes, today, categories, members, currentUid } = store
  const [confirm, setConfirm] = useState(false)
  const items = trashItems(tasks, events, today)
  const n = items.length

  const others = members.filter((m) => m.uid !== currentUid)
  const alsoFor =
    others.length === 1
      ? ` – ${trashWhat(items)} znikną też u ${others[0].nameGenitive}`
      : others.length > 1
        ? ` – ${trashWhat(items)} znikną też u pozostałych domowników`
        : ''
  // „jest” / „są” wg pierwszej liczby w zdaniu (zadania stoją pierwsze): „są 3 zadania i 1 wydarzenie”
  const tasksIn = items.filter((i) => i.kind === 'task').length
  const first = tasksIn || n

  /** Kropka i nazwa: kategoria zadania albo rodzaj wydarzenia z datą. */
  const origin = (i: TrashItem) => {
    if (i.kind === 'task') {
      const cat = categories.find((c) => c.id === i.task.categoryId) ?? noCategory
      return { color: cat.color, label: cat.name.toUpperCase() }
    }
    const type = eventTypes.find((t) => t.id === i.event.typeId) ?? eventTypes[0]
    const d = parseKey(i.event.date)
    return {
      color: type.fg,
      label: `${type.name.toUpperCase()} · ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`,
    }
  }
  const restore = (i: TrashItem) =>
    i.kind === 'task'
      ? store.changeTasks(`Przywrócono do „Do zrobienia”: ${i.title}`, (list) =>
          list.map((t) => (t.id === i.id ? restoreFromTrash(t) : t)),
        )
      : store.changeEvents(`Przywrócono do kalendarza: ${i.title}`, (list) =>
          list.map((e) => (e.id === i.id ? restoreEvent(e) : e)),
        )

  return (
    <Screen gap={18}>
      <Header
        back={{ to: paths.zadaniaOgarniete, label: 'OGARNIĘTE' }}
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
            {n ? trashCountLabel(items, ' · ') : 'pusto'}
          </span>
        }
      />
      <span style={{ padding: '0 4px', fontSize: 14, lineHeight: 1.45, color: colors.muted2 }}>
        Usunięte zadania i wydarzenia czekają tu {TRASH_DAYS} dni. Możesz je przywrócić – potem
        znikną same, u wszystkich domowników.
      </span>

      {n === 0 ? (
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
            Kosz jest pusty
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
            {items.map((item) => {
              const { ago, left } = item
              const from = origin(item)
              const by = members.find((m) => m.uid === item.deletedBy)
              const verb = by?.verbForm === 'm' ? 'USUNĄŁ' : 'USUNĘŁA'
              const when =
                ago === 0 ? 'DZIŚ' : ago === 1 ? 'WCZORAJ' : `${dni(ago).toUpperCase()} TEMU`
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 12px 12px 18px',
                    minHeight: 72,
                    borderBottom: `1px solid ${colors.line}`,
                  }}
                >
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
                      <Dot color={from.color} />
                      {from.label} · {verb} {by?.name.toUpperCase()} · {when}
                    </span>
                    <span
                      style={{
                        fontFamily: fonts.serif,
                        fontStyle: 'italic',
                        fontSize: 13,
                        color: left <= 5 ? priorities.high.line : colors.brass700,
                      }}
                    >
                      zniknie za {dni(left)}
                    </span>
                  </span>
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
                </div>
              )
            })}
          </div>
          <button
            type="button"
            onClick={() => setConfirm(true)}
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
            }}
          >
            <TrashIcon />
            Opróżnij kosz
          </button>
        </>
      )}

      {confirm && n > 0 && (
        <Sheet open onClose={() => setConfirm(false)} label="Opróżnij kosz">
          <span style={{ fontFamily: fonts.serif, fontSize: 26, fontWeight: 500 }}>
            Usunąć <em style={{ color: priorities.high.line }}>na zawsze?</em>
          </span>
          <span style={{ fontSize: 15, lineHeight: 1.45, color: colors.muted2 }}>
            W koszu {first === 1 ? 'jest' : plural(first, ['jest', 'są', 'jest'])}{' '}
            {trashCountLabel(items)}. Tego nie da się cofnąć{alsoFor}.
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={() => setConfirm(false)}
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
                store.setTasks((list) => list.filter((t) => !t.deleted))
                store.setEvents((list) => list.filter((e) => !e.deleted))
                setConfirm(false)
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
      <TabBar active="zadania" />
    </Screen>
  )
}
