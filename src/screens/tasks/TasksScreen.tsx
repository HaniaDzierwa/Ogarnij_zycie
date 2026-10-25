import { newId } from '../../data/ids.ts'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Accent, Header } from '../../components/Header.tsx'
import { TabBar } from '../../components/TabBar.tsx'
import { UndoToast } from '../../components/UndoToast.tsx'
import { useConfirmDelete } from '../../components/useConfirmDelete.tsx'
import { Box, Dot, OfflineBadge } from '../../components/ui.tsx'
import { CloseIcon, SlidersIcon, TrashIcon } from '../../components/icons.tsx'
import { shortDayLabel, whenLabel } from '../../data/dates.ts'
import { useStore } from '../../data/store.ts'
import { plural } from '../../data/plural.ts'
import { moveToTrash } from '../../data/taskOps.ts'
import type { Task } from '../../data/types.ts'
import { colors, fonts, priorities, shadows, sizes } from '../../theme'
import { priorityOf } from '../../data/selectors.ts'
import { ClearSheet } from './ClearSheet.tsx'
import { FiltersPanel, TextButton } from './FiltersPanel.tsx'
import { TaskDetailSheet } from './TaskDetailSheet.tsx'
import { Chevron, TaskRow } from './TaskRow.tsx'
import { TaskSheet } from './TaskSheet.tsx'
import {
  categoriesWithNone,
  categoryKey,
  doneGroups,
  emptyLabel,
  showFromParam,
  tasksView,
  type GroupBy,
  type Show,
  type Tab,
} from './tasksView.ts'
import { useTaskActions } from './useTaskActions.ts'

/**
 * 3 Zadania (Zadania.dc.html). Adres: `?pokaz=pilne|wazne|przy-okazji`, `?zakladka=ogarniete`,
 * `?nowe=zadanie`.
 */
export function TasksScreen() {
  const store = useStore()
  const { today, tasks, categories, members, priorities: prioList } = store
  const [params, setParams] = useSearchParams()

  const [tab, setTab] = useState<Tab>(() =>
    params.get('zakladka') === 'ogarniete' ? 'done' : 'todo',
  )
  const [show, setShow] = useState<Show>(() => showFromParam(params.get('pokaz'), prioList))
  const [category, setCategory] = useState('all')
  const [groupBy, setGroupBy] = useState<GroupBy>('cat')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  // po otwarciu wszystkie podzadania zwinięte (uwaga Hani 2026-10-20)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [clearOpen, setClearOpen] = useState(false)

  const sheetOpen = params.get('nowe') === 'zadanie'
  const setSheetOpen = (open: boolean) =>
    setParams(
      (p) => {
        if (open) p.set('nowe', 'zadanie')
        else p.delete('nowe')
        return p
      },
      { replace: !open },
    )

  const cats = categoriesWithNone(categories, tasks)
  const view = tasksView(tasks, categories, { show, category, groupBy, priorities: prioList })
  const done = doneGroups(tasks, today)
  const categoryName = (t: Task) => cats.find((c) => c.id === categoryKey(t))?.name ?? ''
  const activeCount = (show !== 'all' ? 1 : 0) + (category !== 'all' ? 1 : 0)
  const allCollapsed = view.groups.length > 0 && view.groups.every((g) => collapsed[g.key])
  const detail = tasks.find((t) => t.id === detailId && !t.deleted)

  const member = (uid: string | null) => members.find((m) => m.uid === uid)
  /** Kto ogarnął – samo imię, bez rodzaju („HANIA · 9:10”). */
  const doneBy = (t: Task) => {
    const m = member(t.doneBy)
    return m?.name ?? ''
  }

  // Akcje z paskiem „Cofnij”
  const actions = useTaskActions()
  const toggleDone = actions.toggleDone
  const confirmDelete = useConfirmDelete()
  const trash = (t: Task) =>
    confirmDelete.ask('zadanie', t.title, () => {
      if (detailId === t.id) setDetailId(null)
      actions.trash(t)
    })

  const addCategory = (name: string, color: string) => {
    const id = newId('k')
    store.setCategories((list) => [...list, { id, name, color, order: list.length }])
    return id
  }

  const rowProps = (t: Task, kind: 'todo' | 'done') => ({
    task: t,
    kind,
    groupBy,
    categoryName: categoryName(t),
    today,
    doneByLabel: kind === 'done' ? doneBy(t).toUpperCase() : undefined,
    doneWhen: kind === 'done' && t.doneAt ? whenLabel(t.doneAt, today) : undefined,
    expanded: expanded === t.id,
    onExpand: () => setExpanded((e) => (e === t.id ? null : t.id)),
    onOpen: () => setDetailId(t.id),
    onToggleDone: () => toggleDone(t),
    onTrash: () => trash(t),
    onToggleSub: (sid: string) => actions.toggleSub(t, sid),
  })

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100dvh' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 6,
          background: colors.cream,
          padding: 'calc(16px + env(safe-area-inset-top)) 16px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {filtersOpen && (
          // Dotknięcie gdziekolwiek poza panelem (też nagłówka) zamyka filtry. Przycisk, nie div –
          // Safari na iPhonie nie przekazuje dotknięć zwykłym elementom.
          <button
            type="button"
            aria-label="Zamknij filtry"
            tabIndex={-1}
            onClick={() => setFiltersOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1,
              border: 0,
              padding: 0,
              background: 'rgba(31,61,46,0.04)',
            }}
          />
        )}
        <Header
          label={`ZADANIA · ${shortDayLabel(today)}`}
          topRight={<OfflineBadge />}
          title={
            <>
              Do <Accent>ogarnięcia</Accent>
            </>
          }
          aside={
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: colors.cream,
                  border: '1px solid rgba(246,241,231,0.35)',
                  padding: '4px 9px',
                  borderRadius: 12,
                  whiteSpace: 'nowrap',
                }}
              >
                {view.openCount} {plural(view.openCount, ['otwarte', 'otwarte', 'otwartych'])}
              </span>
              {view.highCount > 0 && (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: '#5C2818',
                    background: '#F3B9A4',
                    padding: '5px 10px',
                    borderRadius: 12,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {view.highCount} {plural(view.highCount, ['pilne', 'pilne', 'pilnych'])}
                </span>
              )}
            </span>
          }
        />

        <div
          role="tablist"
          aria-label="Widok zadań"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 4,
            padding: 3,
            borderRadius: 18,
            background: colors.sand,
          }}
        >
          <TabButton
            on={tab === 'todo'}
            count={view.openCount}
            onClick={() => {
              setTab('todo')
              setFiltersOpen(false)
            }}
          >
            Do zrobienia
          </TabButton>
          <TabButton
            on={tab === 'done'}
            count={view.doneCount}
            onClick={() => {
              setTab('done')
              setFiltersOpen(false)
            }}
          >
            Ogarnięte
          </TabButton>
        </div>

        {tab === 'todo' && (
          // Nad tłem zamykającym filtry: wiersz z „Filtry” i sam panel
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={() => setFiltersOpen((o) => !o)}
                aria-expanded={filtersOpen}
                aria-controls="panel-filtrow"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  height: sizes.chipHeight,
                  padding: '0 12px 0 10px',
                  borderRadius: 18,
                  fontSize: 13,
                  fontWeight: 800,
                  border: `1px solid ${filtersOpen || activeCount ? colors.green900 : colors.border}`,
                  background: filtersOpen || activeCount ? colors.green900 : 'transparent',
                  color: filtersOpen || activeCount ? colors.cream : colors.green900,
                }}
              >
                <SlidersIcon size={18} />
                <span>Filtry</span>
                {activeCount > 0 && (
                  <span
                    aria-label={`Aktywne filtry: ${activeCount}`}
                    style={{
                      minWidth: 20,
                      height: 20,
                      padding: '0 5px',
                      borderRadius: 10,
                      background: colors.brass300,
                      color: colors.green900,
                      fontSize: 12,
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {activeCount}
                  </span>
                )}
                <Chevron open={filtersOpen} size={16} />
              </button>
              {view.groups.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setCollapsed(Object.fromEntries(view.groups.map((g) => [g.key, !allCollapsed])))
                  }
                  style={{
                    marginLeft: 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    height: 36,
                    padding: '0 4px 0 8px',
                    border: 0,
                    background: 'transparent',
                    color: colors.brass700,
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: '0.6px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {allCollapsed ? 'ROZWIŃ WSZYSTKO' : 'ZWIŃ WSZYSTKO'}
                  <Chevron open={allCollapsed} size={16} up />
                </button>
              )}
            </div>

            {activeCount > 0 && !filtersOpen && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: -4,
                }}
              >
                {show !== 'all' && (
                  <ActiveChip
                    name={priorityOf(prioList, show).label}
                    mark={<Box color={priorityOf(prioList, show).line} size={12} />}
                    onRemove={() => setShow('all')}
                  />
                )}
                {category !== 'all' && (
                  <ActiveChip
                    name={cats.find((c) => c.id === category)?.name ?? ''}
                    mark={
                      <Dot color={cats.find((c) => c.id === category)?.color ?? colors.muted} />
                    }
                    onRemove={() => setCategory('all')}
                  />
                )}
                {activeCount === 2 && (
                  <TextButton
                    onClick={() => {
                      setShow('all')
                      setCategory('all')
                    }}
                  >
                    WYCZYŚĆ
                  </TextButton>
                )}
              </div>
            )}

            {filtersOpen && (
              <FiltersPanel
                show={show}
                onShow={setShow}
                category={category}
                onCategory={setCategory}
                categories={cats}
                counts={view.categoryCounts}
                groupBy={groupBy}
                onGroupBy={setGroupBy}
                priorities={prioList}
              />
            )}
          </div>
        )}

        {tab === 'done' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ paddingLeft: 4, fontSize: 13, color: colors.muted }}>
              Najnowsze na górze
            </span>
            <button
              type="button"
              onClick={() => setClearOpen(true)}
              style={{
                marginLeft: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 36,
                padding: '0 14px 0 10px',
                borderRadius: 18,
                border: `1px solid ${colors.border}`,
                background: 'transparent',
                color: colors.green900,
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              <TrashIcon />
              Wyczyść
            </button>
          </div>
        )}
      </div>

      <main
        style={{
          padding: `8px 16px calc(${sizes.listBottomPadding}px + env(safe-area-inset-bottom))`,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        {tab === 'todo' && (
          <>
            {view.groups.length === 0 && <Empty>{emptyLabel(show, prioList)}</Empty>}
            {view.groups.map((g) => {
              const open = !collapsed[g.key]
              const high = g.items.filter((t) => t.priority === 'high').length
              return (
                <section key={g.key} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setCollapsed((c) => ({ ...c, [g.key]: open }))}
                    aria-expanded={open}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      minHeight: 48,
                      border: 0,
                      textAlign: 'left',
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: '1.4px',
                      color: colors.green900,
                      ...(open
                        ? { padding: '0 6px', background: 'transparent', borderRadius: 14 }
                        : {
                            padding: '0 14px',
                            background: colors.white,
                            borderRadius: 18,
                            boxShadow: '0 4px 14px rgba(31,61,46,0.06)',
                          }),
                    }}
                  >
                    {g.kind === 'cat' ? <Dot color={g.color} /> : <Box color={g.color} size={12} />}
                    <span>{g.name}</span>
                    <Count>{g.items.length}</Count>
                    {!open && high > 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: '0.6px',
                          color: priorities.high.fg,
                          background: priorities.high.bg,
                          padding: '2px 8px',
                          borderRadius: 10,
                        }}
                      >
                        {high} PILNE
                      </span>
                    )}
                    <span style={{ marginLeft: 'auto', color: colors.brass700, display: 'flex' }}>
                      <Chevron open={open} size={18} />
                    </span>
                  </button>
                  {open && (
                    <ListCard>
                      {g.items.map((t) => (
                        <TaskRow key={t.id} {...rowProps(t, 'todo')} />
                      ))}
                    </ListCard>
                  )}
                </section>
              )
            })}
            {view.groups.length > 0 && (
              <span
                style={{
                  padding: '0 12px',
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: colors.muted,
                  textAlign: 'center',
                }}
              >
                Dotknij zadania, by je otworzyć. Przeciągnij w prawo – ogarnięte, w lewo – do kosza.
              </span>
            )}
          </>
        )}

        {tab === 'done' && (
          <>
            {done.length === 0 && (
              <Empty>Nic jeszcze nie ogarnięte – ale dzień się nie skończył.</Empty>
            )}
            {done.map((g) => (
              <section key={g.name} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    minHeight: 36,
                    padding: '0 6px',
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: '1.4px',
                    color: colors.green900,
                  }}
                >
                  <h2 style={{ margin: 0, font: 'inherit', letterSpacing: 'inherit' }}>{g.name}</h2>
                  <Count>{g.items.length}</Count>
                </div>
                <ListCard>
                  {g.items.map((t) => (
                    <TaskRow key={t.id} {...rowProps(t, 'done')} />
                  ))}
                </ListCard>
              </section>
            ))}
          </>
        )}
      </main>

      {sheetOpen && (
        <TaskSheet
          onClose={() => setSheetOpen(false)}
          categories={categories}
          today={today}
          onAddCategory={addCategory}
          onSave={(draft) => {
            const id = newId('t')
            const task: Task = {
              ...draft,
              id,
              done: false,
              createdBy: store.currentUid,
              doneAt: null,
              doneBy: null,
              deleted: false,
              deletedAt: null,
              deletedBy: null,
            }
            store.setTasks((list) => [task, ...list])
            if (task.subtasks.length) setExpanded(id)
            setTab('todo')
            setSheetOpen(false)
          }}
        />
      )}

      {detail && (
        <TaskDetailSheet
          key={detail.id}
          task={detail}
          categories={categories}
          today={today}
          status={
            detail.done && detail.doneAt
              ? `OGARNIĘTE · ${whenLabel(detail.doneAt, today).toUpperCase()}`
              : `DO ZROBIENIA · ${categoryName(detail).toUpperCase()}`
          }
          meta={
            detail.done
              ? `Ogarnięte: ${doneBy(detail)}`
              : `Dodane: ${member(detail.createdBy)?.name ?? ''}`
          }
          onSave={(e) => actions.save(detail, e)}
          onToggleDone={() => toggleDone(detail)}
          onToggleSub={(sid) => actions.toggleSub(detail, sid)}
          onTrash={() => trash(detail)}
          onClose={() => setDetailId(null)}
        />
      )}

      {clearOpen && (
        <ClearSheet
          tasks={tasks}
          today={today}
          onClose={() => setClearOpen(false)}
          onClear={(ids) => {
            setClearOpen(false)
            const n = ids.length
            store.changeTasks(
              `Przeniesiono do kosza: ${n} ${plural(n, ['zadanie', 'zadania', 'zadań'])}`,
              (list) => list.map((t) => (ids.includes(t.id) ? moveToTrash(t, store.who()) : t)),
            )
          }}
        />
      )}

      {confirmDelete.dialog}
      <UndoToast />
      <TabBar active="zadania" onAddTask={() => setSheetOpen(true)} />
    </div>
  )
}

/** Zmiana `?pokaz=` / `?zakladka=` (np. kafelek na Starcie) zaczyna widok od nowa. */
export function TasksRoute() {
  const [params] = useSearchParams()
  return <TasksScreen key={`${params.get('pokaz') ?? ''}|${params.get('zakladka') ?? ''}`} />
}

function TabButton({
  on,
  count,
  onClick,
  children,
}: {
  on: boolean
  count: number
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 40,
        border: 0,
        borderRadius: 15,
        fontSize: 14,
        fontWeight: 800,
        background: on ? colors.white : 'transparent',
        color: on ? colors.green900 : colors.muted,
        boxShadow: on ? '0 1px 3px rgba(31,61,46,0.15)' : 'none',
      }}
    >
      {children}
      <span
        style={{
          minWidth: 22,
          height: 22,
          padding: '0 7px',
          borderRadius: 11,
          fontSize: 12,
          fontWeight: 800,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: on ? colors.green900 : 'rgba(255,255,255,0.7)',
          color: on ? colors.brass300 : colors.muted,
        }}
      >
        {count}
      </span>
    </button>
  )
}

function ListCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: colors.white,
        borderRadius: 22,
        boxShadow: shadows.card,
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  )
}

function Count({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: fonts.serif,
        fontStyle: 'italic',
        fontSize: 14,
        fontWeight: 500,
        letterSpacing: 0,
        color: colors.brass700,
      }}
    >
      {children}
    </span>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '28px 20px',
        borderRadius: 22,
        background: colors.white,
        boxShadow: shadows.card,
        textAlign: 'center',
        fontFamily: fonts.serif,
        fontStyle: 'italic',
        fontSize: 17,
        color: colors.muted,
      }}
    >
      {children}
    </div>
  )
}

function ActiveChip({
  name,
  mark,
  onRemove,
}: {
  name: string
  mark: React.ReactNode
  onRemove: () => void
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Usuń filtr: ${name}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 32,
        padding: '0 8px 0 12px',
        borderRadius: 16,
        border: 0,
        background: colors.sand,
        color: colors.green900,
        fontSize: 13,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {mark}
      {name}
      <span style={{ color: colors.brass700, display: 'flex' }}>
        <CloseIcon size={14} />
      </span>
    </button>
  )
}
