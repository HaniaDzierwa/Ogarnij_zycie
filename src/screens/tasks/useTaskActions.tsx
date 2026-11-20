import { dueLabel } from '../../data/dates.ts'
import { newId } from '../../data/ids.ts'
import { useStore } from '../../data/store.ts'
import {
  addSubtask,
  editTask,
  markDone,
  markOpen,
  moveToTrash,
  nextDue,
  removeSubtask,
  toggleSubtask,
  trashOnlyThis,
  type TaskEdit,
} from '../../data/taskOps.ts'
import type { Task } from '../../data/types.ts'

/** Akcje na zadaniu z paskiem „Cofnij” – wspólne dla Zadań i Kalendarza (terminy zadań). */
export function useTaskActions() {
  const store = useStore()

  const update = (id: string, fn: (t: Task) => Task) => (list: Task[]) =>
    list.map((t) => (t.id === id ? fn(t) : t))

  /** Zadanie cykliczne: „ · następne: PT 27 LIS”; zwykłe – pusto. */
  const nextNote = (t: Task) => {
    const d = !t.done && nextDue(t, store.today)
    return d ? ` · następne: ${dueLabel(d, store.today)}` : ''
  }
  const doneText = (t: Task) => `Ogarnięte: ${t.title}${nextNote(t)}`

  const complete = (t: Task) =>
    store.changeTasks(
      doneText(t),
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
  /** Zadanie cykliczne – „Usuń → Tylko to”: to do kosza, następne od razu na liście. */
  const trashOnlyOnce = (t: Task) =>
    store.changeTasks(`Pominięto: ${t.title}${nextNote(t)}`, (list) => {
      const cur = list.find((x) => x.id === t.id)
      if (!cur) return list
      const [trashed, next] = trashOnlyThis(cur, store.who(), store.today, newId('t'))
      return [...list.map((x) => (x.id === t.id ? trashed : x)), next]
    })
  /** Zmiana kroków – gdy ogarnia albo przywraca zadanie, też z paskiem „Cofnij”. */
  const changeSteps = (t: Task, fn: (t: Task) => Task) => {
    const next = fn(t)
    if (next.done && !t.done) store.changeTasks(doneText(t), update(t.id, fn))
    else if (!next.done && t.done)
      store.changeTasks(`Wróciło do „Do zrobienia”: ${t.title}`, update(t.id, fn))
    else store.setTasks(update(t.id, fn))
  }

  return {
    toggleDone,
    trash,
    trashOnlyOnce,
    /** Etykieta „Tylko to – wróci PT 27 LIS” do pytania o usunięcie zadania cyklicznego. */
    onlyThisLabel: (t: Task) => {
      const d = nextDue(t, store.today)
      return d ? `Tylko to – wróci ${dueLabel(d, store.today).toLowerCase()}` : 'Tylko to'
    },
    /** Edycja w miejscu (bez paska „Cofnij”). */
    edit: (t: Task, fn: (t: Task) => Task) => store.setTasks(update(t.id, fn)),
    /** „Zapisz” w arkuszu zadania – gdy kroki ogarniają / przywracają zadanie, z „Cofnij”. */
    save: (t: Task, e: TaskEdit) => changeSteps(t, (x) => editTask(x, e, store.who())),
    toggleSub: (t: Task, sid: string) => changeSteps(t, (x) => toggleSubtask(x, sid, store.who())),
    removeSub: (t: Task, sid: string) => changeSteps(t, (x) => removeSubtask(x, sid, store.who())),
    addSub: (t: Task, title: string) =>
      changeSteps(t, (x) => addSubtask(x, { id: newId('s'), title, done: false }, store.who())),
  }
}
