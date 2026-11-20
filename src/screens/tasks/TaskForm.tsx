import { useState } from 'react'
import { DueBadge } from '../../components/DueBadge.tsx'
import { AddMore, FormCard, FormRow, TitleField, ValueBadge } from '../../components/FormCard.tsx'
import { RowIcons, useOpenRow } from '../../components/formRows.tsx'
import { CloseIcon, PlusIcon } from '../../components/icons.tsx'
import { RepeatField } from '../../components/RepeatField.tsx'
import { Chip, Dot, NoteField } from '../../components/ui.tsx'
import { VisibilityField } from '../../components/VisibilityField.tsx'
import { type DateKey } from '../../data/dates.ts'
import { newId } from '../../data/ids.ts'
import { repeatName } from '../../data/repeat.ts'
import { priorityOf } from '../../data/selectors.ts'
import { useStore } from '../../data/store.ts'
import type { TaskEdit } from '../../data/taskOps.ts'
import type { Category } from '../../data/types.ts'
import { colors, noCategory } from '../../theme'
import { DueField } from './DueField.tsx'
import { NewCategoryButton, NewCategoryForm } from './NewCategoryForm.tsx'
import { usePhotoField, type PhotoFieldProps } from './PhotosField.tsx'
import { PriorityPicker } from './PriorityPicker.tsx'

type Row = 'cat' | 'prio' | 'due' | 'repeat' | 'vis'

/** Identyfikatory pól – „Nowe zadanie” i edycja mają własne (oba arkusze mogą być w drzewie). */
const IDS = {
  new: {
    title: 'tytul',
    due: 'termin-data',
    days: 'co-ile-dni',
    step: 'nowe-pod',
    note: 'notatka-zadania',
    newCat: 'nowa-kategoria-arkusz',
  },
  edit: {
    title: 'det-tytul',
    due: 'det-termin',
    days: 'det-co-ile-dni',
    step: 'det-krok',
    note: 'det-notatka',
    newCat: 'det-nowa-kategoria',
  },
} as const

/**
 * Formularz zadania w układzie 1c (etap 8): nazwa na wierzchu; karta z wierszami Kategoria ·
 * Priorytet · Termin · Powtarzaj · Kto widzi (rozwija się jeden naraz); „+ Kroki” / „+ Notatka”.
 * Wspólny dla „Nowe zadanie” (`mode="new"`) i trybu edycji arkusza zadania.
 */
export function TaskForm({
  mode,
  value,
  onChange,
  categories,
  today,
  onAddCategory,
  authorUid,
  onSubmit,
  photos,
}: {
  mode: 'new' | 'edit'
  value: TaskEdit
  onChange: (fn: (d: TaskEdit) => TaskEdit) => void
  categories: Category[]
  today: DateKey
  /** „+ Nowa kategoria” – zwraca id nowej kategorii. */
  onAddCategory?: (name: string, color: string) => string
  /** Autor istniejącego zadania (edycja) – „Kto widzi” zmienia tylko on. */
  authorUid?: string
  /** Enter w nazwie. */
  onSubmit?: () => void
  /** Zdjęcia (etap 9): zapisane + kopia robocza zmian. */
  photos?: PhotoFieldProps
}) {
  const ids = IDS[mode]
  const { priorities } = useStore()
  const photoField = usePhotoField(photos && { ...photos, repeating: !!value.repeat })
  const rows = useOpenRow<Row>()
  const [addingCategory, setAddingCategory] = useState(false)
  const [stepsOpen, setStepsOpen] = useState(false)
  // otwarta, gdy już jest notatka – wyczyszczenie pola go nie chowa
  const [noteOpen, setNoteOpen] = useState(value.note !== '')
  const [step, setStep] = useState('')

  const set = (patch: Partial<TaskEdit>) => onChange((d) => ({ ...d, ...patch }))
  const category = categories.find((c) => c.id === value.categoryId)
  const prio = priorityOf(priorities, value.priority)
  const showSteps = stepsOpen || value.subtasks.length > 0
  const showNote = noteOpen

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
      <TitleField
        id={ids.title}
        kicker={mode === 'new' ? 'NOWE ZADANIE' : undefined}
        label={mode === 'new' ? 'CO TRZEBA ZROBIĆ?' : 'NAZWA'}
        placeholder={mode === 'new' ? 'Co trzeba zrobić?' : 'Nazwa zadania'}
        value={value.title}
        onChange={(title) => set({ title })}
        onEnter={onSubmit}
        autoFocus={mode === 'edit'}
      />

      <FormCard>
        <FormRow
          first
          icon={RowIcons.tag}
          label="Kategoria"
          value={
            <>
              <Dot color={category?.color ?? noCategory.color} />
              {category?.name ?? noCategory.name}
            </>
          }
          open={rows.is('cat')}
          onToggle={() => rows.toggle('cat')}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {categories.map((c) => {
              const on = value.categoryId === c.id
              return (
                <Chip
                  key={c.id}
                  on={on}
                  onClick={() => {
                    set({ categoryId: c.id })
                    rows.close()
                  }}
                  dot={<Dot color={on ? colors.brass300 : c.color} />}
                >
                  {c.name}
                </Chip>
              )
            })}
            {onAddCategory && !addingCategory && (
              <NewCategoryButton onClick={() => setAddingCategory(true)} />
            )}
          </div>
          {onAddCategory && addingCategory && (
            <NewCategoryForm
              id={ids.newCat}
              onCancel={() => setAddingCategory(false)}
              onAdd={(name, color) => {
                set({ categoryId: onAddCategory(name, color) })
                setAddingCategory(false)
                rows.close()
              }}
            />
          )}
        </FormRow>

        <FormRow
          icon={RowIcons.flag}
          label="Priorytet"
          value={
            <ValueBadge bg={prio.bg} fg={prio.fg}>
              {prio.label.toUpperCase()}
            </ValueBadge>
          }
          open={rows.is('prio')}
          onToggle={() => rows.toggle('prio')}
        >
          <PriorityPicker
            value={value.priority}
            onChange={(priority) => {
              set({ priority })
              rows.close()
            }}
          />
        </FormRow>

        <FormRow
          icon={RowIcons.calendar}
          label="Termin"
          value={
            value.due ? (
              <DueBadge due={value.due} today={today} week={value.dueWeek} />
            ) : (
              <span style={{ color: colors.muted }}>Bez terminu</span>
            )
          }
          open={rows.is('due')}
          onToggle={() => rows.toggle('due')}
        >
          <DueField
            id={ids.due}
            value={{ due: value.due, dueWeek: !!value.dueWeek }}
            today={today}
            // bez terminu nie ma powtarzania
            onChange={(v) => set(v.due ? v : { ...v, repeat: undefined })}
          />
        </FormRow>

        <FormRow
          icon={RowIcons.repeat}
          label="Powtarzaj"
          value={
            value.repeat ? (
              repeatName(value.repeat)
            ) : (
              <span style={{ color: colors.muted }}>Nie</span>
            )
          }
          open={rows.is('repeat')}
          onToggle={() => rows.toggle('repeat')}
        >
          <RepeatField
            id={ids.days}
            value={value.repeat}
            start={value.due ?? today}
            onChange={(repeat) =>
              // powtarzanie bez terminu – od dziś (decyzja Hani 2026-11-15)
              set(repeat && !value.due ? { repeat, due: today, dueWeek: false } : { repeat })
            }
          />
        </FormRow>

        <FormRow
          icon={RowIcons.people}
          label="Kto widzi"
          value={value.private ? 'Tylko ja' : 'Wspólne'}
          open={rows.is('vis')}
          onToggle={() => rows.toggle('vis')}
        >
          <VisibilityField
            bare
            value={value.private}
            authorUid={authorUid}
            onChange={(p) => set({ private: p })}
          />
        </FormRow>
      </FormCard>

      {showSteps && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span
            style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.4px', color: colors.muted }}
          >
            KROKI
          </span>
          {value.subtasks.map((s) => (
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
                  boxSizing: 'border-box',
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
                  minWidth: 0,
                  fontSize: 15,
                  ...(s.done ? { color: colors.muted, textDecoration: 'line-through' } : {}),
                }}
              >
                {s.title}
              </span>
              <button
                type="button"
                onClick={() =>
                  onChange((d) => ({ ...d, subtasks: d.subtasks.filter((x) => x.id !== s.id) }))
                }
                aria-label={`${mode === 'new' ? 'Usuń podzadanie' : 'Usuń krok'}: ${s.title}`}
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
            <label htmlFor={ids.step} className="sr-only">
              {mode === 'new' ? 'Nowe podzadanie' : 'Nowy krok'}
            </label>
            <input
              id={ids.step}
              type="text"
              autoFocus={stepsOpen && value.subtasks.length === 0}
              placeholder={mode === 'new' ? 'np. Kupić kartkę' : 'Dodaj krok…'}
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
              aria-label={mode === 'new' ? 'Dodaj podzadanie' : 'Dodaj krok'}
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
        </div>
      )}

      {showNote && (
        <NoteField id={ids.note} value={value.note} onChange={(note) => set({ note })} />
      )}

      {photoField.input}
      {photoField.section}

      <AddMore
        items={[
          ...(showSteps ? [] : [{ label: 'Kroki', onClick: () => setStepsOpen(true) }]),
          ...(showNote ? [] : [{ label: 'Notatka', onClick: () => setNoteOpen(true) }]),
          ...(photoField.addItem ? [photoField.addItem] : []),
        ]}
      />
    </>
  )
}
