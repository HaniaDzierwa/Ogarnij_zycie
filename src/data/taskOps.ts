// Zmiany zadań wspólne dla ekranów (etap 1: w pamięci; od etapu 2 – zapis do Firestore).

import type { Stamp } from './dates.ts'
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

export function moveToTrash(task: Task, who: Who): Task {
  return { ...task, deleted: true, deletedAt: who.at, deletedBy: who.uid }
}

export function restoreFromTrash(task: Task): Task {
  return { ...task, deleted: false, deletedAt: null, deletedBy: null }
}
