import { useState } from 'react'
import { SheetSubmit } from '../../components/SheetSubmit.tsx'
import { Sheet } from '../../components/ui.tsx'
import { type DateKey } from '../../data/dates.ts'
import type { TaskEdit } from '../../data/taskOps.ts'
import type { Category } from '../../data/types.ts'
import { DEFAULT_PRIORITY } from '../../theme'
import { TaskForm } from './TaskForm.tsx'

/** Nowe zadanie z formularza (resztę pól – kto, kiedy – uzupełnia ekran). */
export type TaskDraft = TaskEdit

type Props = {
  onClose: () => void
  categories: Category[]
  today: DateKey
  /** Zwraca id nowej kategorii. */
  onAddCategory: (name: string, color: string) => string
  onSave: (task: TaskDraft) => void
}

/**
 * Arkusz „Nowe zadanie” w układzie 1c (etap 8, decyzja Hani 2026-11-15): nazwa, karta
 * Kategoria · Priorytet · Termin · Powtarzaj · Kto widzi, „+ Kroki” / „+ Notatka”.
 * Otwierany warunkowo – stan formularza startuje od nowa przy każdym otwarciu.
 */
export function TaskSheet({ onClose, categories, today, onAddCategory, onSave }: Props) {
  const [draft, setDraft] = useState<TaskEdit>(() => ({
    title: '',
    categoryId: categories[0]?.id ?? null,
    priority: DEFAULT_PRIORITY,
    due: null,
    dueWeek: false,
    subtasks: [],
    note: '',
    // nowe – domyślnie „Wspólne” (decyzja Hani 2026-10-25)
    private: false,
  }))

  const submit = () => {
    const title = draft.title.trim()
    if (!title) return
    const { repeat, ...rest } = draft
    onSave({
      ...rest,
      title,
      note: draft.note.trim(),
      ...(repeat && draft.due ? { repeat } : {}),
    })
  }

  return (
    <Sheet open onClose={onClose} label="Nowe zadanie">
      <TaskForm
        mode="new"
        value={draft}
        onChange={(fn) => setDraft(fn)}
        categories={categories}
        today={today}
        onAddCategory={onAddCategory}
        onSubmit={submit}
      />
      <SheetSubmit ready={!!draft.title.trim()} onSubmit={submit}>
        Dodaj zadanie
      </SheetSubmit>
    </Sheet>
  )
}
