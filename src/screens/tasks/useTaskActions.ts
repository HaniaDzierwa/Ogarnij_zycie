import { useStore } from '../../data/MockStore.tsx'
import {
  addSubtask,
  markDone,
  markOpen,
  moveToTrash,
  removeSubtask,
  toggleSubtask,
} from '../../data/taskOps.ts'
import type { Task } from '../../data/types.ts'

/** Akcje na zadaniu z paskiem „Cofnij” – wspólne dla Zadań i Kalendarza (terminy zadań). */
export function useTaskActions() {
  const store = useStore()

  const update = (id: string, fn: (t: Task) => Task) => (list: Task[]) =>
    list.map((t) => (t.id === id ? fn(t) : t))

  const complete = (t: Task) =>
    store.changeTasks(
      `Ogarnięte: ${t.title}`,
      update(t.id, (x) => markDone(x, store.who())),
    )
  const restore = (t: Task) =>
    store.changeTasks(`Wróciło do „Do zrobienia”: ${t.title}`, update(t.id, markOpen))
  const toggleDone = (t: Task) => (t.done ? restore(t) : complete(t))
  const trash = (t: Task) =>
    store.changeTasks(
      `Przeniesiono do kosza: ${t.title}`,
      update(t.id, (x) => moveToTrash(x, store.who())),
    )
  /** Zmiana kroków – gdy ogarnia albo przywraca zadanie, też z paskiem „Cofnij”. */
  const changeSteps = (t: Task, fn: (t: Task) => Task) => {
    const next = fn(t)
    if (next.done && !t.done) store.changeTasks(`Ogarnięte: ${t.title}`, update(t.id, fn))
    else if (!next.done && t.done)
      store.changeTasks(`Wróciło do „Do zrobienia”: ${t.title}`, update(t.id, fn))
    else store.setTasks(update(t.id, fn))
  }

  return {
    toggleDone,
    trash,
    /** Edycja w miejscu (bez paska „Cofnij”). */
    edit: (t: Task, fn: (t: Task) => Task) => store.setTasks(update(t.id, fn)),
    toggleSub: (t: Task, sid: string) => changeSteps(t, (x) => toggleSubtask(x, sid, store.who())),
    removeSub: (t: Task, sid: string) => changeSteps(t, (x) => removeSubtask(x, sid, store.who())),
    addSub: (t: Task, title: string) =>
      changeSteps(t, (x) =>
        addSubtask(x, { id: `${x.id}s${Date.now()}`, title, done: false }, store.who()),
      ),
  }
}
