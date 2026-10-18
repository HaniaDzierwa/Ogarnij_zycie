// Zmiany zadań wspólne dla ekranów (etap 1: w pamięci; od etapu 2 – zapis do Firestore).

import type { Subtask, Task } from './types.ts'

/** Zadanie z podzadaniami jest zrobione dokładnie wtedy, gdy wszystkie podzadania są zrobione. */
function withSubtasks(task: Task, subtasks: Subtask[]): Task {
  if (subtasks.length === 0) return { ...task, subtasks }
  return { ...task, subtasks, done: subtasks.every((s) => s.done) }
}

export function toggleSubtask(task: Task, subId: string): Task {
  return withSubtasks(
    task,
    task.subtasks.map((s) => (s.id === subId ? { ...s, done: !s.done } : s)),
  )
}

export function removeSubtask(task: Task, subId: string): Task {
  return withSubtasks(
    task,
    task.subtasks.filter((s) => s.id !== subId),
  )
}

export function addSubtask(task: Task, sub: Subtask): Task {
  return withSubtasks(task, [...task.subtasks, sub])
}

export function toggleTask(task: Task): Task {
  return { ...task, done: !task.done }
}
