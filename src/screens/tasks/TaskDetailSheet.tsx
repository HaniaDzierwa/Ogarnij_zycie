import { useState } from 'react'
import { Box, Chip, Dot, NoteField, Sheet } from '../../components/ui.tsx'
import { CheckIcon, CloseIcon, PlusIcon, TrashIcon, UndoIcon } from '../../components/icons.tsx'
import { addDays, dueLabel, weekStart, type DateKey } from '../../data/dates.ts'
import { priorityOf } from '../../data/selectors.ts'
import { useStore } from '../../data/store.ts'
import type { Category, Task } from '../../data/types.ts'
import { colors, fonts, priorities } from '../../theme'
import { useBufferedText } from '../../components/useBufferedText.ts'
import { PriorityPicker } from './PriorityPicker.tsx'
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
  /** Zmiana w miejscu (zapisuje się od razu). */
  onChange: (update: (t: Task) => Task) => void
  onToggleDone: () => void
  onToggleSub: (subId: string) => void
  onRemoveSub: (subId: string) => void
  onAddSub: (title: string) => void
  /** Do kosza – z bieżącą nazwą (także tą właśnie wpisaną). */
  onTrash: (title: string) => void
  onClose: () => void
}

/** Arkusz zadania (ZadaniaArkusz.dc.html): edycja w miejscu, „Usuń” i „Ogarnij/Przywróć”. */
export function TaskDetailSheet({
  task,
  categories,
  today,
  status,
  meta,
  onChange,
  onToggleDone,
  onToggleSub,
  onRemoveSub,
  onAddSub,
  onTrash,
  onClose,
}: Props) {
  const { priorities: prioList } = useStore()
  const [originalTitle] = useState(task.title)
  const [step, setStep] = useState('')
  // Kliknięty przycisk wygrywa, gdy dwa dają tę samą datę (w niedzielę „Dziś” = „W tym tygodniu”,
  // w sobotę „Jutro” = „W tym tygodniu”); bez kliknięcia – pierwszy pasujący do terminu.
  const [picked, setPicked] = useState<Preset | null>(null)
  const preset =
    picked && presetDate(picked, today) === task.due
      ? picked
      : PRESETS.find((p) => presetDate(p, today) === task.due)
  const [customOpen, setCustomOpen] = useState(false)
  const showCustom = customOpen || (!preset && task.due !== null)
  const subDone = task.subtasks.filter((s) => s.done).length

  // nazwa i notatka – zapis po chwili przerwy w pisaniu (nie po każdej literze)
  const title = useBufferedText(task.title, (v) => onChange((t) => ({ ...t, title: v })))
  const note = useBufferedText(task.note, (v) => onChange((t) => ({ ...t, note: v })))
  const flushTexts = () => {
    title.flush()
    note.flush()
  }
  // przed „Ogarnij” / „Usuń” teksty zapisane od razu – „Cofnij” po akcji niczego nie zgubi
  const toggleDone = () => {
    flushTexts()
    onToggleDone()
  }
  const trash = () => {
    flushTexts()
    onTrash(title.text.trim() || task.title)
  }

  const close = () => {
    // pusta nazwa nie zostaje – wraca poprzednia
    if (!title.text.trim()) {
      title.discard()
      if (!task.title.trim()) onChange((t) => ({ ...t, title: originalTitle }))
    } else title.flush()
    note.flush()
    onClose()
  }
  const addStep = () => {
    const s = step.trim()
    if (!s) return
    onAddSub(s)
    setStep('')
  }
  const setDue = (due: DateKey | null) => onChange((t) => ({ ...t, due }))

  return (
    <Sheet open onClose={close} label="Zadanie">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: -6,
        }}
      >
        <span
          style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.6px', color: colors.brass700 }}
        >
          {status}
        </span>
        <button
          type="button"
          onClick={close}
          style={{
            height: 36,
            padding: '0 4px 0 12px',
            border: 0,
            background: 'transparent',
            color: colors.green900,
            fontSize: 14,
            fontWeight: 800,
          }}
        >
          Gotowe
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={toggleDone}
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
          {task.done ? (
            <DoneBox size={28} />
          ) : (
            <Box color={priorityOf(prioList, task.priority).line} size={28} />
          )}
        </button>
        <label htmlFor="det-tytul" className="sr-only">
          Nazwa zadania
        </label>
        <input
          id="det-tytul"
          type="text"
          value={title.text}
          onChange={(e) => title.change(e.target.value)}
          style={{
            flex: 1,
            minWidth: 0,
            height: 48,
            border: 0,
            borderBottom: `1px solid ${colors.borderSoft}`,
            padding: '0 2px',
            background: 'transparent',
            fontFamily: fonts.serif,
            fontSize: 22,
            fontWeight: 500,
            color: colors.green900,
            outlineColor: colors.green900,
          }}
        />
      </div>

      <Group label="KATEGORIA">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {categories.map((c) => {
            const on = task.categoryId === c.id
            return (
              <Chip
                key={c.id}
                on={on}
                onClick={() => onChange((t) => ({ ...t, categoryId: c.id }))}
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
          value={task.priority}
          onChange={(id) => onChange((t) => ({ ...t, priority: id }))}
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
              if (!task.due) setDue(addDays(today, 7))
            }}
          >
            {showCustom && task.due ? dueLabel(task.due, today) : 'Inna data'}
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
              value={task.due ?? ''}
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span
            style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.4px', color: colors.muted }}
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
            {task.subtasks.length ? `${subDone} z ${task.subtasks.length}` : 'brak'}
          </span>
        </div>
        {task.subtasks.map((s) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 4 }}>
            <SubtaskToggle title={s.title} done={s.done} onToggle={() => onToggleSub(s.id)} />
            <button
              type="button"
              onClick={() => onRemoveSub(s.id)}
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
      </div>

      <NoteField id="det-notatka" value={note.text} onChange={note.change} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 8, marginTop: 2 }}>
        <button
          type="button"
          onClick={trash}
          style={{
            height: 54,
            border: '1px solid #E7B8A8',
            borderRadius: 27,
            background: colors.white,
            color: priorities.high.line,
            fontSize: 16,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <TrashIcon />
          Usuń
        </button>
        <button
          type="button"
          onClick={() => {
            onClose()
            toggleDone()
          }}
          style={{
            height: 54,
            border: 0,
            borderRadius: 27,
            background: colors.green900,
            color: colors.cream,
            fontSize: 16,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <span style={{ color: colors.brass300, display: 'flex' }}>
            {task.done ? <UndoIcon size={18} /> : <CheckIcon size={18} />}
          </span>
          {task.done ? 'Przywróć' : 'Ogarnij'}
        </button>
      </div>
      <span style={{ fontSize: 12, color: colors.muted, textAlign: 'center' }}>
        {meta} · zmiany zapisują się od razu
      </span>
    </Sheet>
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
