import { useState } from 'react'
import {
  DetailActions,
  DetailTopBar,
  DiscardDialog,
  InfoRow,
  NoteText,
} from '../../components/DetailSheet.tsx'
import { Box, Chip, Dot, NoteField, Sheet } from '../../components/ui.tsx'
import { CheckIcon, CloseIcon, PlusIcon, UndoIcon } from '../../components/icons.tsx'
import { addDays, dueLabel, weekStart, type DateKey } from '../../data/dates.ts'
import { newId } from '../../data/ids.ts'
import { priorityOf } from '../../data/selectors.ts'
import { useStore } from '../../data/store.ts'
import { taskEditOf, type TaskEdit } from '../../data/taskOps.ts'
import type { Category, Task } from '../../data/types.ts'
import { colors, fonts, noCategory } from '../../theme'
import { PriorityPicker } from './PriorityPicker.tsx'
import { VisibilityField } from '../../components/VisibilityField.tsx'
import { DoneBox, SubtaskToggle } from './TaskRow.tsx'

const PRESETS = ['Bez terminu', 'Dziś', 'Jutro', 'W tym tygodniu'] as const
type Preset = (typeof PRESETS)[number]

function presetDate(p: Preset, today: DateKey): DateKey | null {
  if (p === 'Dziś') return today
  if (p === 'Jutro') return addDays(today, 1)
  if (p === 'W tym tygodniu') return addDays(weekStart(today), 6)
  return null
}

type Props = {
  task: Task
  categories: Category[]
  today: DateKey
  /** „DO ZROBIENIA · ZAKUPY” / „OGARNIĘTE · 9:10” */
  status: string
  /** „Dodane: Hania” / „Ogarnięte: Hania” */
  meta: string
  /** „Zapisz” w trybie edycji. */
  onSave: (edit: TaskEdit) => void
  onToggleDone: () => void
  /** Odhaczenie kroku – działa też w trybie odczytu (to ogarnianie, nie edycja). */
  onToggleSub: (subId: string) => void
  onTrash: () => void
  onClose: () => void
}

/**
 * Arkusz zadania (ZadaniaArkusz.dc.html): najpierw do odczytu (odhaczanie kroków, „Ogarnij”,
 * „Usuń”); „Edytuj” → edycja z „Zapisz” u góry; zamknięcie z niezapisanymi zmianami pyta
 * „Odrzucić zmiany?” (uwagi Hani 2026-10-25).
 */
export function TaskDetailSheet({
  task,
  categories,
  today,
  status,
  meta,
  onSave,
  onToggleDone,
  onToggleSub,
  onTrash,
  onClose,
}: Props) {
  const { priorities: prioList } = useStore()
  // null – tryb odczytu; w edycji: kopia robocza i stan z chwili rozpoczęcia
  const [draft, setDraft] = useState<TaskEdit | null>(null)
  const [base, setBase] = useState<TaskEdit | null>(null)
  const [discard, setDiscard] = useState<'close' | 'cancel' | null>(null)
  const editing = draft !== null
  const dirty = editing && JSON.stringify(draft) !== JSON.stringify(base)

  const startEdit = () => {
    const e = taskEditOf(task)
    setDraft(e)
    setBase(e)
  }
  const stopEdit = () => {
    setDraft(null)
    setBase(null)
  }
  const save = () => {
    if (!draft?.title.trim()) return
    onSave({ ...draft, title: draft.title.trim(), note: draft.note.trim() })
    stopEdit()
  }
  const requestClose = () => (dirty ? setDiscard('close') : onClose())
  const cancelEdit = () => (dirty ? setDiscard('cancel') : stopEdit())

  const prio = priorityOf(prioList, task.priority)
  const category = categories.find((c) => c.id === task.categoryId)
  const subDone = task.subtasks.filter((s) => s.done).length

  return (
    <Sheet open onClose={requestClose} label="Zadanie">
      <DetailTopBar
        status={status}
        editing={editing}
        canSave={!!draft?.title.trim()}
        onEdit={startEdit}
        onSave={save}
        onCancel={cancelEdit}
      />

      {draft ? (
        <TaskEditForm
          draft={draft}
          task={task}
          categories={categories}
          today={today}
          onChange={(fn) => setDraft((d) => (d ? fn(d) : d))}
        />
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={onToggleDone}
              aria-label={task.done ? 'Przywróć do „Do zrobienia”' : 'Oznacz jako ogarnięte'}
              style={{
                width: 44,
                height: 44,
                flex: 'none',
                padding: 0,
                border: 0,
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {task.done ? <DoneBox size={28} /> : <Box color={prio.line} size={28} />}
            </button>
            <h2
              style={{
                margin: 0,
                flex: 1,
                minWidth: 0,
                fontFamily: fonts.serif,
                fontSize: 24,
                fontWeight: 500,
                lineHeight: 1.2,
                color: task.done ? colors.muted : colors.green900,
                textDecoration: task.done ? 'line-through' : 'none',
                overflowWrap: 'anywhere',
              }}
            >
              {task.title}
            </h2>
          </div>

          <div>
            <InfoRow label="KATEGORIA">
              <Dot color={category?.color ?? noCategory.color} />
              {category?.name ?? noCategory.name}
            </InfoRow>
            <InfoRow label="PRIORYTET">
              <Box color={prio.line} size={14} />
              {prio.label}
            </InfoRow>
            <InfoRow label="TERMIN">{task.due ? dueLabel(task.due, today) : 'Bez terminu'}</InfoRow>
            <InfoRow label="KTO WIDZI">{task.private ? 'Tylko ja' : 'Wspólne'}</InfoRow>
          </div>

          {task.subtasks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div
                style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '1.4px',
                    color: colors.muted,
                  }}
                >
                  KROKI
                </span>
                <span
                  style={{
                    fontFamily: fonts.serif,
                    fontStyle: 'italic',
                    fontSize: 14,
                    color: colors.brass700,
                  }}
                >
                  {subDone} z {task.subtasks.length}
                </span>
              </div>
              {task.subtasks.map((s) => (
                <div key={s.id} style={{ display: 'flex', paddingLeft: 4 }}>
                  <SubtaskToggle title={s.title} done={s.done} onToggle={() => onToggleSub(s.id)} />
                </div>
              ))}
            </div>
          )}

          <NoteText text={task.note} />

          <DetailActions
            onDelete={onTrash}
            primary={{
              label: task.done ? 'Przywróć' : 'Ogarnij',
              icon: task.done ? <UndoIcon size={16} /> : <CheckIcon size={16} />,
              onClick: () => {
                onClose()
                onToggleDone()
              },
            }}
          />
        </>
      )}

      <span style={{ fontSize: 12, color: colors.muted, textAlign: 'center' }}>{meta}</span>

      {discard && (
        <DiscardDialog
          what="zadaniu"
          onKeep={() => setDiscard(null)}
          onDiscard={() => {
            const then = discard
            setDiscard(null)
            stopEdit()
            if (then === 'close') onClose()
          }}
        />
      )}
    </Sheet>
  )
}

/** Tryb edycji: nazwa, kategoria, priorytet, termin, kroki, notatka, „Kto widzi”. */
function TaskEditForm({
  draft,
  task,
  categories,
  today,
  onChange,
}: {
  draft: TaskEdit
  task: Task
  categories: Category[]
  today: DateKey
  onChange: (fn: (d: TaskEdit) => TaskEdit) => void
}) {
  const [step, setStep] = useState('')
  // Kliknięty przycisk wygrywa, gdy dwa dają tę samą datę (w niedzielę „Dziś” = „W tym tygodniu”,
  // w sobotę „Jutro” = „W tym tygodniu”); bez kliknięcia – pierwszy pasujący do terminu.
  const [picked, setPicked] = useState<Preset | null>(null)
  const preset =
    picked && presetDate(picked, today) === draft.due
      ? picked
      : PRESETS.find((p) => presetDate(p, today) === draft.due)
  const [customOpen, setCustomOpen] = useState(false)
  const showCustom = customOpen || (!preset && draft.due !== null)
  const setDue = (due: DateKey | null) => onChange((d) => ({ ...d, due }))
  const addStep = () => {
    const s = step.trim()
    if (!s) return
    onChange((d) => ({
      ...d,
      subtasks: [...d.subtasks, { id: newId('s'), title: s, done: false }],
    }))
    setStep('')
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label
          htmlFor="det-tytul"
          style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.4px', color: colors.muted }}
        >
          NAZWA
        </label>
        <input
          id="det-tytul"
          type="text"
          autoFocus
          maxLength={200}
          value={draft.title}
          onChange={(e) => onChange((d) => ({ ...d, title: e.target.value }))}
          style={{
            height: 52,
            border: `1px solid ${colors.border}`,
            borderRadius: 14,
            padding: '0 14px',
            background: colors.white,
            fontFamily: fonts.serif,
            fontSize: 22,
            fontWeight: 500,
            color: colors.green900,
            outlineColor: colors.green900,
            minWidth: 0,
          }}
        />
      </div>

      <Group label="KATEGORIA">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {categories.map((c) => {
            const on = draft.categoryId === c.id
            return (
              <Chip
                key={c.id}
                on={on}
                onClick={() => onChange((d) => ({ ...d, categoryId: c.id }))}
                dot={<Dot color={on ? colors.brass300 : c.color} />}
              >
                {c.name}
              </Chip>
            )
          })}
        </div>
      </Group>

      <Group label="PRIORYTET">
        <PriorityPicker
          value={draft.priority}
          onChange={(id) => onChange((d) => ({ ...d, priority: id }))}
        />
      </Group>

      <Group label="TERMIN">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PRESETS.map((p) => (
            <Chip
              key={p}
              on={!showCustom && preset === p}
              onClick={() => {
                setCustomOpen(false)
                setPicked(p)
                setDue(presetDate(p, today))
              }}
            >
              {p}
            </Chip>
          ))}
          <Chip
            on={showCustom}
            onClick={() => {
              setCustomOpen(true)
              if (!draft.due) setDue(addDays(today, 7))
            }}
          >
            {showCustom && draft.due ? dueLabel(draft.due, today) : 'Inna data'}
          </Chip>
        </div>
        {showCustom && (
          <>
            <label htmlFor="det-termin" className="sr-only">
              Data terminu
            </label>
            <input
              id="det-termin"
              type="date"
              value={draft.due ?? ''}
              onChange={(e) => e.target.value && setDue(e.target.value)}
              style={{
                height: 48,
                border: `1px solid ${colors.border}`,
                borderRadius: 14,
                padding: '0 14px',
                fontSize: 16,
                color: colors.green900,
                background: colors.white,
                outlineColor: colors.green900,
              }}
            />
          </>
        )}
      </Group>

      <Group label="KROKI">
        {draft.subtasks.map((s) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 4 }}>
            <span
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 15,
                color: s.done ? colors.muted : colors.green900,
                textDecoration: s.done ? 'line-through' : 'none',
              }}
            >
              {s.title}
            </span>
            <button
              type="button"
              onClick={() =>
                onChange((d) => ({ ...d, subtasks: d.subtasks.filter((x) => x.id !== s.id) }))
              }
              aria-label={`Usuń krok: ${s.title}`}
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
            padding: '4px 4px 4px 16px',
            border: `1px solid ${colors.border}`,
            borderRadius: 24,
            background: colors.white,
          }}
        >
          <label htmlFor="det-krok" className="sr-only">
            Nowy krok
          </label>
          <input
            id="det-krok"
            type="text"
            placeholder="Dodaj krok…"
            value={step}
            onChange={(e) => setStep(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addStep()}
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
            onClick={addStep}
            aria-label="Dodaj krok"
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
      </Group>

      <NoteField
        id="det-notatka"
        value={draft.note}
        onChange={(note) => onChange((d) => ({ ...d, note }))}
      />

      <VisibilityField
        value={draft.private}
        authorUid={task.createdBy}
        onChange={(p) => onChange((d) => ({ ...d, private: p }))}
      />
    </>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.4px', color: colors.muted }}>
        {label}
      </span>
      {children}
    </div>
  )
}
