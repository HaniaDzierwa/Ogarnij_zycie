import { useState } from 'react'
import { SwipeRow } from '../../components/SwipeRow.tsx'
import { Box } from '../../components/ui.tsx'
import { CheckIcon, TrashIcon, UndoIcon } from '../../components/icons.tsx'
import { dueLabel, type DateKey } from '../../data/dates.ts'
import { priorityOf, subtaskProgress } from '../../data/selectors.ts'
import { useStore } from '../../data/store.ts'
import type { Task } from '../../data/types.ts'
import { colors, fonts, priorities, todayBadge } from '../../theme'
import type { GroupBy } from './tasksView.ts'

type Props = {
  task: Task
  /** Zakładka: „Do zrobienia” albo „Ogarnięte”. */
  kind: 'todo' | 'done'
  groupBy: GroupBy
  categoryName: string
  today: DateKey
  /** „OGARNĘŁA HANIA” – w zakładce Ogarnięte. */
  doneByLabel?: string
  /** „9:10”, „wczoraj”, „wt 6 paź” – w zakładce Ogarnięte. */
  doneWhen?: string
  expanded: boolean
  onExpand: () => void
  onOpen: () => void
  onToggleDone: () => void
  onTrash: () => void
  onToggleSub: (subId: string) => void
}

/**
 * Wiersz zadania (Zadania.dc.html): kwadracik 56 px = ogarnij / przywróć, klik w treść = arkusz,
 * „˅” tylko gdy są kroki; w prawo = ogarnij (przywróć), w lewo = do kosza.
 */
export function TaskRow({
  task,
  kind,
  groupBy,
  categoryName,
  today,
  doneByLabel,
  doneWhen,
  expanded,
  onExpand,
  onOpen,
  onToggleDone,
  onTrash,
  onToggleSub,
}: Props) {
  const p = priorityOf(useStore().priorities, task.priority)
  const pct = subtaskProgress(task)
  const subDone = task.subtasks.filter((s) => s.done).length
  const due = task.due ? dueLabel(task.due, today) : null
  const urgentDue = !task.done && (due === 'DZIŚ' || due === 'PO TERMINIE')
  const byCat = groupBy === 'cat'
  const hasSteps = !task.done && task.subtasks.length > 0
  const done = kind === 'done'
  const [completing, setCompleting] = useState(false)

  /** Kwadracik: najpierw widać ptaszek, po chwili zadanie przechodzi do Ogarniętych. */
  const clickBox = () => {
    if (task.done) return onToggleDone()
    if (completing) return
    setCompleting(true)
    setTimeout(onToggleDone, 350)
  }

  return (
    <div style={{ borderBottom: `1px solid ${colors.line}` }}>
      <SwipeRow
        right={
          done
            ? {
                label: 'Przywróć',
                icon: <UndoIcon />,
                bg: colors.brass300,
                fg: colors.green900,
                run: onToggleDone,
              }
            : {
                label: 'Ogarnij',
                icon: <CheckIcon />,
                bg: colors.green900,
                fg: colors.brass300,
                run: onToggleDone,
              }
        }
        left={{
          label: 'Usuń',
          icon: <TrashIcon />,
          bg: priorities.high.line,
          fg: colors.white,
          srLabel: `Przenieś do kosza: ${task.title}`,
          run: onTrash,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'stretch', minHeight: 64 }}>
          <button
            type="button"
            onClick={clickBox}
            aria-label={
              task.done
                ? `Przywróć do „Do zrobienia”: ${task.title}`
                : `Oznacz jako ogarnięte: ${task.title}`
            }
            style={{
              width: 56,
              flex: 'none',
              padding: 0,
              border: 0,
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {task.done || completing ? (
              <span className={completing ? 'pop-center' : undefined} style={{ display: 'flex' }}>
                <DoneBox />
              </span>
            ) : (
              <Box color={p.line} />
            )}
          </button>
          <button
            type="button"
            onClick={onOpen}
            aria-label={`Otwórz zadanie ${task.title}`}
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 5,
              padding: '10px 4px 10px 0',
              border: 0,
              background: 'transparent',
              textAlign: 'left',
              color: colors.green900,
              transition: 'opacity 250ms ease',
              opacity: completing ? 0.5 : 1,
            }}
          >
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                lineHeight: 1.3,
                ...(task.done ? { color: colors.muted, textDecoration: 'line-through' } : {}),
              }}
            >
              {task.title}
            </span>
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
              {task.done && doneByLabel && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.8px',
                    color: colors.muted,
                  }}
                >
                  {doneByLabel}
                </span>
              )}
            </span>
            {hasSteps && (
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
                <span style={{ fontFamily: fonts.serif, fontSize: 14, fontWeight: 600 }}>
                  {pct}%
                </span>
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
          {hasSteps && (
            <button
              type="button"
              onClick={onExpand}
              aria-label={expanded ? 'Zwiń podzadania' : 'Pokaż podzadania'}
              aria-expanded={expanded}
              style={{
                width: 44,
                flex: 'none',
                border: 0,
                background: 'transparent',
                color: colors.brass700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Chevron open={expanded} />
            </button>
          )}
          {done && doneWhen && (
            <span
              style={{
                flex: 'none',
                alignSelf: 'center',
                padding: '0 16px 0 8px',
                fontFamily: fonts.serif,
                fontStyle: 'italic',
                fontSize: 14,
                color: colors.brass700,
              }}
            >
              {doneWhen}
            </span>
          )}
        </div>
        {hasSteps && expanded && (
          <div
            style={{
              margin: '0 14px 14px 56px',
              padding: '8px 10px 10px',
              borderLeft: `1px solid ${colors.borderSoft}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {task.subtasks.map((s) => (
              <SubtaskToggle
                key={s.id}
                title={s.title}
                done={s.done}
                onToggle={() => onToggleSub(s.id)}
              />
            ))}
          </div>
        )}
      </SwipeRow>
    </div>
  )
}

/** Wiersz podzadania z kwadracikiem (lista i arkusz zadania). */
export function SubtaskToggle({
  title,
  done,
  onToggle,
}: {
  title: string
  done: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={done}
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
          ...(done
            ? { background: colors.green900, border: 0 }
            : { background: colors.white, border: `2px solid ${colors.brass500}` }),
        }}
      >
        {done && (
          <span style={{ color: colors.cream, display: 'flex' }}>
            <CheckIcon size={12} strokeWidth={3.5} />
          </span>
        )}
      </span>
      <span
        style={{
          fontSize: 15,
          lineHeight: 1.3,
          ...(done ? { color: '#8A968E', textDecoration: 'line-through' } : {}),
        }}
      >
        {title}
      </span>
    </button>
  )
}

/** Zielony kwadracik z mosiężnym ptaszkiem (zadanie ogarnięte). */
export function DoneBox({ size = 24 }: { size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size / 3),
        background: colors.green900,
        color: colors.brass300,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <CheckIcon size={Math.round(size * 0.58)} strokeWidth={3} />
    </span>
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
