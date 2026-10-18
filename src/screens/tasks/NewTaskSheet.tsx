import { useState } from 'react'
import { Box, Chip, Dot, Field, PrimaryButton, Sheet } from '../../components/ui.tsx'
import { CloseIcon, PlusIcon } from '../../components/icons.tsx'
import { addDays, weekStart, type DateKey } from '../../data/dates.ts'
import type { Category, Task } from '../../data/types.ts'
import { colors, fonts, priorities, type Priority } from '../../theme'
import { NewCategoryButton, NewCategoryForm } from './NewCategoryForm.tsx'

const DUES = ['Bez terminu', 'Dziś', 'Jutro', 'W tym tygodniu'] as const
type Due = (typeof DUES)[number]

function dueDate(due: Due, today: DateKey): DateKey | null {
  if (due === 'Dziś') return today
  if (due === 'Jutro') return addDays(today, 1)
  if (due === 'W tym tygodniu') return addDays(weekStart(today), 6)
  return null
}

/** Arkusz „Nowe zadanie”: tytuł, kategoria, priorytet, kroki, termin. */
export function NewTaskSheet({
  open,
  onClose,
  categories,
  today,
  onAdd,
  onAddCategory,
}: {
  open: boolean
  onClose: () => void
  categories: Category[]
  today: DateKey
  onAdd: (task: Omit<Task, 'id'>) => void
  /** Zwraca id nowej kategorii. */
  onAddCategory: (name: string, color: string) => string
}) {
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(categories[0]?.id ?? null)
  const [priority, setPriority] = useState<Priority>('mid')
  const [due, setDue] = useState<Due>('Bez terminu')
  const [steps, setSteps] = useState<string[]>([])
  const [step, setStep] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)

  const reset = () => {
    setTitle('')
    setPriority('mid')
    setDue('Bez terminu')
    setSteps([])
    setStep('')
    setAddingCategory(false)
  }
  const addStep = () => {
    const s = step.trim()
    if (!s) return
    setSteps((list) => [...list, s])
    setStep('')
  }
  const submit = () => {
    const t = title.trim()
    if (!t) return
    onAdd({
      title: t,
      categoryId,
      priority,
      due: dueDate(due, today),
      done: false,
      subtasks: steps.map((s, i) => ({ id: `nowy-${Date.now()}-${i}`, title: s, done: false })),
    })
    reset()
  }

  return (
    <Sheet open={open} onClose={onClose} label="Nowe zadanie">
      <span style={{ fontFamily: fonts.serif, fontSize: 28, fontWeight: 500 }}>
        Nowe <em style={{ color: colors.brass700 }}>zadanie</em>
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
        {steps.map((s, i) => (
          <div
            key={`${s}-${i}`}
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
                border: `2px solid ${colors.brass500}`,
                flex: 'none',
              }}
            />
            <span style={{ flex: 1, fontSize: 15 }}>{s}</span>
            <button
              type="button"
              onClick={() => setSteps((list) => list.filter((_, j) => j !== i))}
              aria-label={`Usuń podzadanie: ${s}`}
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
          {DUES.map((d) => (
            <Chip key={d} on={due === d} onClick={() => setDue(d)}>
              {d}
            </Chip>
          ))}
        </div>
      </Group>

      <PrimaryButton onClick={submit}>Dodaj zadanie</PrimaryButton>
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
