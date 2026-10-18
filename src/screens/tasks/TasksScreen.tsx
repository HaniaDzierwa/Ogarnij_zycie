import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Accent, Header } from '../../components/Header.tsx'
import { TabBar } from '../../components/TabBar.tsx'
import { SwipeRow } from '../../components/SwipeRow.tsx'
import { Box, ConfirmDialog, Dot, SyncBadge } from '../../components/ui.tsx'
import { CloseIcon, SlidersIcon } from '../../components/icons.tsx'
import { shortDayLabel } from '../../data/dates.ts'
import { useStore } from '../../data/MockStore.tsx'
import { plural } from '../../data/plural.ts'
import { addSubtask, removeSubtask, toggleSubtask, toggleTask } from '../../data/taskOps.ts'
import type { Task } from '../../data/types.ts'
import { colors, fonts, priorities, sizes } from '../../theme'
import { FiltersPanel, TextButton } from './FiltersPanel.tsx'
import { TaskSheet } from './TaskSheet.tsx'
import { Chevron, TaskRow } from './TaskRow.tsx'
import {
  categoriesWithNone,
  categoryKey,
  deleteCategory,
  emptyLabel,
  SHOWS,
  showFromParam,
  tasksView,
  type GroupBy,
  type Show,
} from './tasksView.ts'

/** 3 Zadania (Zadania.dc.html). Adres: `?pokaz=pilne|wazne|przy-okazji|ogarniete`, `?nowe=zadanie`. */
export function TasksScreen() {
  const store = useStore()
  const { today, tasks, categories } = store
  const [params, setParams] = useSearchParams()

  const [show, setShow] = useState<Show>(() => showFromParam(params.get('pokaz')))
  const [category, setCategory] = useState('all')
  const [groupBy, setGroupBy] = useState<GroupBy>('cat')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<string | null>(() => tasks[0]?.id ?? null)
  const [showDoneToggle, setShowDoneToggle] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const editing = tasks.find((t) => t.id === editingId)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const deleting = tasks.find((t) => t.id === deletingId)

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
  const view = tasksView(tasks, categories, { show, category, groupBy })
  const showDone = show === 'done' || showDoneToggle
  const categoryName = (t: Task) => cats.find((c) => c.id === categoryKey(t))?.name ?? ''
  const activeCount = (show !== 'all' ? 1 : 0) + (category !== 'all' ? 1 : 0)
  const allCollapsed = view.groups.length > 0 && view.groups.every((g) => collapsed[g.key])

  const updateTask = (id: string, fn: (t: Task) => Task) =>
    store.setTasks((list) => list.map((t) => (t.id === id ? fn(t) : t)))

  const addCategory = (name: string, color: string) => {
    const id = `k${Date.now()}`
    store.setCategories((list) => [...list, { id, name, color, order: list.length }])
    return id
  }

  const closeFilters = () => setFiltersOpen(false)

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100dvh' }}>
      {filtersOpen && (
        <div
          aria-hidden="true"
          onClick={closeFilters}
          style={{ position: 'fixed', inset: 0, zIndex: 5, background: 'rgba(31,61,46,0.04)' }}
        />
      )}

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
        <Header
          label={`ZADANIA · ${shortDayLabel(today)}`}
          topRight={<SyncBadge />}
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
                name={SHOWS.find((s) => s.id === show)!.name}
                label="Usuń filtr"
                mark={show !== 'done' ? <Box color={priorities[show].line} size={12} /> : null}
                onRemove={() => setShow('all')}
              />
            )}
            {category !== 'all' && (
              <ActiveChip
                name={cats.find((c) => c.id === category)?.name ?? ''}
                label={`Usuń filtr ${cats.find((c) => c.id === category)?.name ?? ''}`}
                mark={<Dot color={cats.find((c) => c.id === category)?.color ?? colors.muted} />}
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
            onAddCategory={addCategory}
            onDeleteCategory={(id) => {
              const after = deleteCategory(categories, tasks, id)
              store.setCategories(() => after.categories)
              store.setTasks(() => after.tasks)
              if (category === id) setCategory('all')
            }}
          />
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
        {show !== 'done' && view.groups.length === 0 && (
          <div
            style={{
              padding: '28px 20px',
              borderRadius: 22,
              background: colors.white,
              boxShadow: '0 6px 20px rgba(31,61,46,0.07)',
              textAlign: 'center',
              fontFamily: fonts.serif,
              fontStyle: 'italic',
              fontSize: 17,
              color: colors.muted,
            }}
          >
            {emptyLabel(show)}
          </div>
        )}

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
                  {g.items.length}
                </span>
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
                <div
                  style={{
                    background: colors.white,
                    borderRadius: 22,
                    boxShadow: '0 6px 20px rgba(31,61,46,0.07)',
                    overflow: 'hidden',
                  }}
                >
                  {g.items.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      groupBy={groupBy}
                      categoryName={categoryName(t)}
                      today={today}
                      expanded={expanded === t.id}
                      onExpand={() => setExpanded((e) => (e === t.id ? null : t.id))}
                      onEdit={() => setEditingId(t.id)}
                      onDelete={() => setDeletingId(t.id)}
                      onToggleDone={() => updateTask(t.id, toggleTask)}
                      onToggleSub={(sid) => updateTask(t.id, (x) => toggleSubtask(x, sid))}
                      onRemoveSub={(sid) => updateTask(t.id, (x) => removeSubtask(x, sid))}
                      onAddSub={(title) =>
                        updateTask(t.id, (x) =>
                          addSubtask(x, { id: `${x.id}s${Date.now()}`, title, done: false }),
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          )
        })}

        {view.done.length > 0 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                setShowDoneToggle(!showDone)
                if (show === 'done') setShow('all')
              }}
              aria-expanded={showDone}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                height: 44,
                padding: '0 4px',
                border: 0,
                background: 'transparent',
                color: colors.green900,
              }}
            >
              <span style={{ fontFamily: fonts.serif, fontSize: 20, fontWeight: 500 }}>
                Już <em>ogarnięte</em>
              </span>
              <span
                style={{
                  fontFamily: fonts.serif,
                  fontStyle: 'italic',
                  fontSize: 15,
                  color: colors.brass700,
                }}
              >
                {view.done.length}
              </span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: '1px',
                  color: colors.brass700,
                }}
              >
                {showDone ? 'UKRYJ' : 'POKAŻ'}
              </span>
            </button>
            {showDone && (
              <div style={{ background: colors.sand, borderRadius: 22, overflow: 'hidden' }}>
                {view.done.map((t) => (
                  <SwipeRow
                    key={t.id}
                    background={colors.sand}
                    onSwipeLeft={() => setEditingId(t.id)}
                    onSwipeRight={() => setDeletingId(t.id)}
                    editLabel={`Edytuj zadanie: ${t.title}`}
                    deleteLabel={`Usuń zadanie: ${t.title}`}
                  >
                    <button
                      type="button"
                      onClick={() => updateTask(t.id, toggleTask)}
                      aria-label={`Przywróć zadanie: ${t.title}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        width: '100%',
                        padding: '4px 16px 4px 4px',
                        minHeight: 52,
                        border: 0,
                        borderBottom: `1px solid ${colors.borderSoft}`,
                        background: 'transparent',
                        color: colors.muted,
                        textAlign: 'left',
                      }}
                    >
                      <span
                        style={{
                          width: 44,
                          height: 44,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flex: 'none',
                        }}
                      >
                        <span
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 8,
                            background: colors.green900,
                            color: colors.brass300,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M5 12.5l4.5 4.5L19 7.5" />
                          </svg>
                        </span>
                      </span>
                      <span style={{ flex: 1, fontSize: 15, textDecoration: 'line-through' }}>
                        {t.title}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1px' }}>
                        {categoryName(t).toUpperCase()}
                      </span>
                    </button>
                  </SwipeRow>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {sheetOpen && (
        <TaskSheet
          onClose={() => setSheetOpen(false)}
          categories={categories}
          today={today}
          onAddCategory={addCategory}
          onSave={(task) => {
            const id = `t${Date.now()}`
            store.setTasks((list) => [{ ...task, id }, ...list])
            if (task.subtasks.length) setExpanded(id)
            setSheetOpen(false)
          }}
        />
      )}
      {editing && (
        <TaskSheet
          key={editing.id}
          task={editing}
          onClose={() => setEditingId(null)}
          categories={categories}
          today={today}
          onAddCategory={addCategory}
          onSave={(task) => {
            updateTask(editing.id, () => ({ ...task, id: editing.id }))
            setEditingId(null)
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Usunąć zadanie?"
          message={<>„{deleting.title}” zniknie z listy.</>}
          confirmLabel="Usuń"
          danger
          onCancel={() => setDeletingId(null)}
          onConfirm={() => {
            store.setTasks((list) => list.filter((x) => x.id !== deleting.id))
            setDeletingId(null)
          }}
        />
      )}

      <TabBar active="zadania" onAddTask={() => setSheetOpen(true)} />
    </div>
  )
}

function ActiveChip({
  name,
  label,
  mark,
  onRemove,
}: {
  name: string
  label: string
  mark: React.ReactNode
  onRemove: () => void
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`${label}: ${name}`}
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

/** Zmiana `?pokaz=` (np. kafelek na Starcie) zaczyna widok od nowa z tym filtrem. */
export function TasksRoute() {
  const [params] = useSearchParams()
  return <TasksScreen key={params.get('pokaz') ?? ''} />
}
