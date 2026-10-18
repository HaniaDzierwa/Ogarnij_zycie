import { useState } from 'react'
import { Box, Chip, Dot, Field, PrimaryButton, Sheet } from '../../components/ui.tsx'
import { CloseIcon, PlusIcon } from '../../components/icons.tsx'
import { addDays, dueLabel, weekStart, type DateKey } from '../../data/dates.ts'
import type { Category, Subtask, Task } from '../../data/types.ts'
import { colors, fonts, priorities, type Priority } from '../../theme'
import { NewCategoryButton, NewCategoryForm } from './NewCategoryForm.tsx'

const PRESETS = ['Bez terminu', 'Dziś', 'Jutro', 'W tym tygodniu'] as const
type Preset = (typeof PRESETS)[number]
type DueChoice = Preset | 'Inna data'

function presetDate(p: Preset, today: DateKey): DateKey | null {
  if (p === 'Dziś') return today
  if (p === 'Jutro') return addDays(today, 1)
  if (p === 'W tym tygodniu') return addDays(weekStart(today), 6)
  return null
}

/** Który chip terminu zaznaczyć dla istniejącej daty. */
function choiceFor(due: DateKey | null, today: DateKey): DueChoice {
  return PRESETS.find((p) => presetDate(p, today) === due) ?? 'Inna data'
}

type Props = {
  onClose: () => void
  categories: Category[]
  today: DateKey
  /** Zwraca id nowej kategorii. */
  onAddCategory: (name: string, color: string) => string
} & (
  | { task?: undefined; onSave: (task: Omit<Task, 'id'>) => void; onDelete?: undefined }
  | { task: Task; onSave: (task: Omit<Task, 'id'>) => void; onDelete: () => void }
)

/**
 * Arkusz „Nowe zadanie” / „Edytuj zadanie”: tytuł, kategoria, priorytet, kroki, termin.
 * Otwierany warunkowo – stan formularza startuje od nowa przy każdym otwarciu.
 */
export function TaskSheet({
  onClose,
  categories,
  today,
  onAddCategory,
  task,
  onSave,
  onDelete,
}: Props) {
  const editing = task !== undefined
  const [title, setTitle] = useState(task?.title ?? '')
  const [categoryId, setCategoryId] = useState<string | null>(
    editing ? task.categoryId : (categories[0]?.id ?? null),
  )
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'mid')
  const [choice, setChoice] = useState<DueChoice>(
    editing ? choiceFor(task.due, today) : 'Bez terminu',
  )
  const [customDate, setCustomDate] = useState<DateKey>(task?.due ?? addDays(today, 7))
  const [steps, setSteps] = useState<Subtask[]>(task?.subtasks ?? [])
  const [step, setStep] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const due = choice === 'Inna data' ? customDate : presetDate(choice, today)

  const addStep = () => {
    const s = step.trim()
    if (!s) return
    setSteps((list) => [...list, { id: `k${Date.now()}`, title: s, done: false }])
    setStep('')
  }
  const submit = () => {
    const t = title.trim()
    if (!t) return
    const done = steps.length > 0 ? steps.every((s) => s.done) : editing ? task.done : false
    onSave({ title: t, categoryId, priority, due, done, subtasks: steps })
  }

  return (
    <Sheet open onClose={onClose} label={editing ? 'Edytuj zadanie' : 'Nowe zadanie'}>
      <span style={{ fontFamily: fonts.serif, fontSize: 28, fontWeight: 500 }}>
        {editing ? 'Edytuj' : 'Nowe'} <em style={{ color: colors.brass700 }}>zadanie</em>
      </span>
      <Field
        id="tytul"
        label="CO TRZEBA ZROBIĆ?"
        placeholder="np. Odebrać paczkę z paczkomatu"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />

      <Group label="KATEGORIA">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {categories.map((c) => (
            <Chip
              key={c.id}
              on={categoryId === c.id}
              onClick={() => setCategoryId(c.id)}
              dot={<Dot color={categoryId === c.id ? colors.brass300 : c.color} />}
            >
              {c.name}
            </Chip>
          ))}
          {!addingCategory && <NewCategoryButton onClick={() => setAddingCategory(true)} />}
        </div>
        {addingCategory && (
          <NewCategoryForm
            id="nowa-kategoria-arkusz"
            onCancel={() => setAddingCategory(false)}
            onAdd={(name, color) => {
              setCategoryId(onAddCategory(name, color))
              setAddingCategory(false)
            }}
          />
        )}
      </Group>

      <Group label="PRIORYTET">
        <div
          role="radiogroup"
          aria-label="Priorytet"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}
        >
          {(['high', 'mid', 'low'] as const).map((id) => {
            const p = priorities[id]
            const on = priority === id
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setPriority(id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  height: 48,
                  borderRadius: 16,
                  fontSize: 15,
                  fontWeight: 700,
                  border: on ? `2px solid ${p.line}` : `1px solid ${colors.border}`,
                  background: on ? p.bg : colors.white,
                  color: on ? p.fg : colors.green900,
                  whiteSpace: 'nowrap',
                }}
              >
                <Box color={p.line} size={14} />
                {p.label}
              </button>
            )
          })}
        </div>
      </Group>

      <Group
        label={
          <>
            KROKI <span style={{ fontWeight: 600, letterSpacing: '0.4px' }}>(opcjonalnie)</span>
          </>
        }
      >
        {steps.map((s) => (
          <div
            key={s.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              minHeight: 40,
              paddingLeft: 4,
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: 6,
                flex: 'none',
                ...(s.done
                  ? { background: colors.green900 }
                  : { border: `2px solid ${colors.brass500}` }),
              }}
            />
            <span
              style={{
                flex: 1,
                fontSize: 15,
                ...(s.done ? { color: '#8A968E', textDecoration: 'line-through' } : {}),
              }}
            >
              {s.title}
            </span>
            <button
              type="button"
              onClick={() => setSteps((list) => list.filter((x) => x.id !== s.id))}
              aria-label={`Usuń podzadanie: ${s.title}`}
              style={{
                width: 36,
                height: 40,
                border: 0,
                background: 'transparent',
                color: '#9AA59D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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
          <label htmlFor="nowe-pod" className="sr-only">
            Nowe podzadanie
          </label>
          <input
            id="nowe-pod"
            type="text"
            placeholder="np. Kupić kartkę"
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
            aria-label="Dodaj podzadanie"
            style={{
              width: 40,
              height: 40,
              border: 0,
              borderRadius: 20,
              background: colors.sand,
              color: colors.green900,
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

      <Group label="TERMIN">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PRESETS.map((d) => (
            <Chip key={d} on={choice === d} onClick={() => setChoice(d)}>
              {d}
            </Chip>
          ))}
          <Chip on={choice === 'Inna data'} onClick={() => setChoice('Inna data')}>
            {choice === 'Inna data' ? dueLabel(customDate, today) : 'Inna data'}
          </Chip>
        </div>
        {choice === 'Inna data' && (
          <>
            <label htmlFor="termin-data" className="sr-only">
              Data terminu
            </label>
            <input
              id="termin-data"
              type="date"
              value={customDate}
              onChange={(e) => e.target.value && setCustomDate(e.target.value)}
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

      <PrimaryButton onClick={submit}>{editing ? 'Zapisz zmiany' : 'Dodaj zadanie'}</PrimaryButton>

      {editing &&
        (confirmDelete ? (
          <div
            role="alertdialog"
            aria-label="Usunąć zadanie?"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              padding: 14,
              borderRadius: 16,
              background: priorities.high.bg,
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 700, color: priorities.high.fg }}>
              Usunąć „{task.title}”?
            </span>
            <div
              style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}
            >
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                style={{
                  height: 42,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 21,
                  background: colors.white,
                  color: colors.green900,
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                Zostaw
              </button>
              <button
                type="button"
                onClick={onDelete}
                style={{
                  height: 42,
                  border: 0,
                  borderRadius: 21,
                  background: priorities.high.line,
                  color: colors.white,
                  fontSize: 14,
                  fontWeight: 800,
                }}
              >
                Usuń
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            style={{
              minHeight: 44,
              border: 0,
              background: 'transparent',
              color: priorities.high.fg,
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            Usuń zadanie
          </button>
        ))}
    </Sheet>
  )
}

function Group({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.4px', color: colors.muted }}>
        {label}
      </span>
      {children}
    </div>
  )
}
