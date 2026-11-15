// Zmiany zadań wspólne dla ekranów (etap 1: w pamięci; od etapu 2 – zapis do Firestore).

import type { DateKey, Stamp } from './dates.ts'
import { nextAfter } from './repeat.ts'
import type { Subtask, Task } from './types.ts'

/** Kto i kiedy – do oznaczenia ogarnięcia / usunięcia. */
export type Who = { uid: string; at: Stamp }

export function markDone(task: Task, who: Who): Task {
  return { ...task, done: true, doneAt: who.at, doneBy: who.uid }
}

export function markOpen(task: Task): Task {
  return { ...task, done: false, doneAt: null, doneBy: null }
}

export function toggleDone(task: Task, who: Who): Task {
  return task.done ? markOpen(task) : markDone(task, who)
}

/** Zadanie z podzadaniami jest ogarnięte dokładnie wtedy, gdy wszystkie podzadania są zrobione. */
function withSubtasks(task: Task, subtasks: Subtask[], who: Who): Task {
  const next = { ...task, subtasks }
  if (subtasks.length === 0) return next
  const allDone = subtasks.every((s) => s.done)
  if (allDone && !task.done) return markDone(next, who)
  if (!allDone && task.done) return markOpen(next)
  return next
}

export function toggleSubtask(task: Task, subId: string, who: Who): Task {
  return withSubtasks(
    task,
    task.subtasks.map((s) => (s.id === subId ? { ...s, done: !s.done } : s)),
    who,
  )
}

export function removeSubtask(task: Task, subId: string, who: Who): Task {
  return withSubtasks(
    task,
    task.subtasks.filter((s) => s.id !== subId),
    who,
  )
}

export function addSubtask(task: Task, sub: Subtask, who: Who): Task {
  return withSubtasks(task, [...task.subtasks, sub], who)
}

/** Pola zmieniane w arkuszu zadania („Edytuj” → „Zapisz”). */
export type TaskEdit = Pick<
  Task,
  | 'title'
  | 'categoryId'
  | 'priority'
  | 'due'
  | 'dueWeek'
  | 'repeat'
  | 'subtasks'
  | 'note'
  | 'private'
>

export const taskEditOf = ({
  title,
  categoryId,
  priority,
  due,
  dueWeek,
  repeat,
  subtasks,
  note,
  private: isPrivate,
}: Task): TaskEdit => ({
  title,
  categoryId,
  priority,
  due,
  dueWeek: !!dueWeek && due !== null,
  repeat: due !== null ? repeat : undefined,
  subtasks,
  note,
  private: isPrivate,
})

/** „Zapisz” w arkuszu – kroki dalej decydują o ogarnięciu (dodany krok przywraca zadanie). */
export function editTask(task: Task, edit: TaskEdit, who: Who): Task {
  const { subtasks, ...rest } = edit
  const next = { ...task, ...rest }
  // bez terminu nie ma powtarzania; undefined = pole znika
  if (!next.repeat || next.due === null) delete next.repeat
  return withSubtasks(next, subtasks, who)
}

// ── Zadania cykliczne (etap 8) ─────────────────────────────────────────────

/** Kolejny termin zadania cyklicznego: od terminu, pierwszy po dziś (spóźnione – bez zaległych). */
export function nextDue(task: Task, today: DateKey): DateKey | null {
  return task.repeat ? nextAfter(task.due ?? today, task.repeat, today) : null
}

/** Bez powtarzania – ogarnięte / pominięte wystąpienie nie tworzy już kolejnych. */
function withoutRepeat(task: Task): Task {
  const rest = { ...task }
  delete rest.repeat
  return rest
}

/**
 * Następne wystąpienie: nowe id, kolejny termin, kroki odznaczone, notatka zostaje.
 * `uid` – kto je tworzy (reguły: przy tworzeniu „dodane przez” = ja).
 */
export function nextOccurrence(task: Task, today: DateKey, id: string, uid: string): Task {
  const next: Task = {
    ...task,
    id,
    due: nextDue(task, today),
    done: false,
    subtasks: task.subtasks.map((s) => ({ ...s, done: false })),
    createdBy: uid,
    doneAt: null,
    doneBy: null,
    deleted: false,
    deletedAt: null,
    deletedBy: null,
  }
  delete next.dueWeek
  return next
}

/**
 * Po każdej zmianie listy: ogarnięte zadanie cykliczne traci powtarzanie, a obok pojawia się
 * następne. Działa bez względu na to, jak ogarnięto (kwadracik, gest, kroki, arkusz).
 * Drugie wywołanie na wyniku nic nie zmienia.
 */
export function spawnRepeats(
  tasks: Task[],
  today: DateKey,
  uid: string,
  makeId: () => string,
): Task[] {
  if (!tasks.some((t) => t.repeat && t.done && !t.deleted)) return tasks
  const spawned: Task[] = []
  const out = tasks.map((t) => {
    if (!t.repeat || !t.done || t.deleted) return t
    spawned.push(nextOccurrence(t, today, makeId(), uid))
    return withoutRepeat(t)
  })
  return [...out, ...spawned]
}

/** „Usuń → Tylko to”: to wystąpienie do kosza (bez powtarzania), następne od razu na liście. */
export function trashOnlyThis(task: Task, who: Who, today: DateKey, id: string): [Task, Task] {
  return [moveToTrash(withoutRepeat(task), who), nextOccurrence(task, today, id, who.uid)]
}

export function moveToTrash(task: Task, who: Who): Task {
  return { ...task, deleted: true, deletedAt: who.at, deletedBy: who.uid }
}

export function restoreFromTrash(task: Task): Task {
  return { ...task, deleted: false, deletedAt: null, deletedBy: null }
}
