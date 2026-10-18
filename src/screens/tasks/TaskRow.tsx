import { useState } from 'react'
import { Box } from '../../components/ui.tsx'
import { CloseIcon, PlusIcon } from '../../components/icons.tsx'
import { dueLabel, type DateKey } from '../../data/dates.ts'
import { subtaskProgress } from '../../data/selectors.ts'
import type { Task } from '../../data/types.ts'
import { colors, fonts, priorities, todayBadge } from '../../theme'
import type { GroupBy } from './tasksView.ts'

type Props = {
  task: Task
  groupBy: GroupBy
  categoryName: string
  today: DateKey
  expanded: boolean
  onExpand: () => void
  onEdit: () => void
  onToggleDone: () => void
  onToggleSub: (subId: string) => void
  onRemoveSub: (subId: string) => void
  onAddSub: (title: string) => void
}

/** Wiersz otwartego zadania: odhaczenie, tytuł, etykieta, termin, postęp kroków, rozwijane podzadania. */
export function TaskRow({
  task,
  groupBy,
  categoryName,
  today,
  expanded,
  onExpand,
  onEdit,
  onToggleDone,
  onToggleSub,
  onRemoveSub,
  onAddSub,
}: Props) {
  const p = priorities[task.priority]
  const pct = subtaskProgress(task)
  const subDone = task.subtasks.filter((s) => s.done).length
  const due = task.due ? dueLabel(task.due, today) : null
  const urgentDue = due === 'DZIŚ' || due === 'PO TERMINIE'
  const byCat = groupBy === 'cat'

  return (
    <div style={{ borderBottom: `1px solid ${colors.line}` }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 4px', minHeight: 64 }}
      >
        <button
          type="button"
          onClick={onToggleDone}
          aria-label={`Oznacz jako zrobione: ${task.title}`}
          style={{
            width: 44,
            height: 44,
            border: 0,
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 'none',
          }}
        >
          <Box color={p.line} />
        </button>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edytuj zadanie: ${task.title}`}
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
            padding: 0,
            border: 0,
            background: 'transparent',
            color: 'inherit',
            textAlign: 'left',
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{task.title}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 22,
                padding: '0 9px',
                borderRadius: 11,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.8px',
                background: byCat ? p.bg : colors.sand,
                color: byCat ? p.fg : colors.green900,
              }}
            >
              {(byCat ? p.label : categoryName).toUpperCase()}
            </span>
            {due &&
              (urgentDue ? (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.6px',
                    color: todayBadge.fg,
                    background: todayBadge.bg,
                    padding: '3px 9px',
                    borderRadius: 10,
                  }}
                >
                  {due}
                </span>
              ) : (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: '0.6px',
                    color: colors.brass700,
                  }}
                >
                  {due}
                </span>
              ))}
          </span>
          {pct !== null && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  display: 'block',
                  width: 110,
                  height: 3,
                  borderRadius: 3,
                  background: colors.borderSoft,
                }}
              >
                <span
                  style={{
                    display: 'block',
                    height: '100%',
                    borderRadius: 3,
                    background: colors.green900,
                    width: `${pct}%`,
                    transition: 'width 200ms ease',
                  }}
                />
              </span>
              <span style={{ fontFamily: fonts.serif, fontSize: 14, fontWeight: 600 }}>{pct}%</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: '0.8px',
                  color: colors.muted,
                }}
              >
                {subDone} / {task.subtasks.length} KROKI
              </span>
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={onExpand}
          aria-label={expanded ? 'Zwiń podzadania' : 'Pokaż podzadania'}
          aria-expanded={expanded}
          style={{
            width: 44,
            height: 44,
            border: 0,
            borderRadius: 14,
            background: 'transparent',
            color: colors.brass700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 'none',
          }}
        >
          <Chevron open={expanded} />
        </button>
      </div>
      {expanded && (
        <Subtasks task={task} onToggle={onToggleSub} onRemove={onRemoveSub} onAdd={onAddSub} />
      )}
    </div>
  )
}

function Subtasks({
  task,
  onToggle,
  onRemove,
  onAdd,
}: {
  task: Task
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onAdd: (title: string) => void
}) {
  const [draft, setDraft] = useState('')
  const inputId = `pod-${task.id}`
  const add = () => {
    const t = draft.trim()
    if (!t) return
    onAdd(t)
    setDraft('')
  }
  return (
    <div
      style={{
        margin: '0 14px 14px 48px',
        padding: '8px 10px 10px',
        borderLeft: `1px solid ${colors.borderSoft}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      {task.subtasks.map((s) => (
        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            type="button"
            onClick={() => onToggle(s.id)}
            aria-pressed={s.done}
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              minHeight: 44,
              padding: 0,
              border: 0,
              background: 'transparent',
              textAlign: 'left',
              color: colors.green900,
            }}
          >
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: 7,
                flex: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...(s.done
                  ? { background: colors.green900, border: 0 }
                  : { background: colors.white, border: `2px solid ${colors.brass500}` }),
              }}
            >
              {s.done && (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={colors.cream}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              )}
            </span>
            <span
              style={{
                fontSize: 15,
                lineHeight: 1.3,
                ...(s.done ? { color: '#8A968E', textDecoration: 'line-through' } : {}),
              }}
            >
              {s.title}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onRemove(s.id)}
            aria-label={`Usuń podzadanie: ${s.title}`}
            style={{
              width: 36,
              height: 44,
              border: 0,
              background: 'transparent',
              color: '#9AA59D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 'none',
            }}
          >
            <CloseIcon />
          </button>
        </div>
      ))}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 4,
          padding: '4px 4px 4px 14px',
          borderRadius: 22,
          background: colors.cream,
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          Nowe podzadanie
        </label>
        <input
          id={inputId}
          type="text"
          placeholder="Dodaj krok…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          style={{
            flex: 1,
            minWidth: 0,
            height: 40,
            border: 0,
            background: 'transparent',
            fontSize: 16,
            color: colors.green900,
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={add}
          aria-label="Dodaj podzadanie"
          style={{
            width: 40,
            height: 40,
            border: 0,
            borderRadius: 20,
            background: colors.green900,
            color: colors.brass300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 'none',
          }}
        >
          <PlusIcon size={18} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  )
}

export function Chevron({
  open,
  size = 20,
  up = false,
}: {
  open: boolean
  size?: number
  up?: boolean
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{
        transition: 'transform 150ms ease',
        transform: `rotate(${open ? 180 : 0}deg)`,
        flex: 'none',
      }}
    >
      <path d={up ? 'M7 15l5-5 5 5' : 'M6 9l6 6 6-6'} />
    </svg>
  )
}
