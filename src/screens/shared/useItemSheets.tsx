import { useState } from 'react'
import { useConfirmDelete } from '../../components/useConfirmDelete.tsx'
import {
  DAYS,
  DAYS_SHORT,
  MONTHS_GEN,
  MONTHS_SHORT,
  parseKey,
  whenLabel,
  type DateKey,
} from '../../data/dates.ts'
import { deleteEvent, editEvent, skipOccurrence } from '../../data/eventOps.ts'
import { eventTypeOf } from '../../data/selectors.ts'
import { useStore } from '../../data/store.ts'
import type { CalendarEvent, Task } from '../../data/types.ts'
import { EventDetailSheet } from '../calendar/EventDetailSheet.tsx'
import { TaskDetailSheet } from '../tasks/TaskDetailSheet.tsx'
import { useTaskActions } from '../tasks/useTaskActions.ts'

/** „Piątek, 16 października” */
function dayLabel(k: DateKey): string {
  const d = parseKey(k)
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`
}

/** „pt 16 paź” – przy usuwaniu jednej powtórki. */
function shortDay(k: DateKey): string {
  const d = parseKey(k)
  return `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`.toLowerCase()
}

/**
 * Arkusz zadania i arkusz wydarzenia poza listą zadań (Start, Kalendarz): otwieranie, ogarnianie,
 * usuwanie do kosza z pytaniem „Usunąć …?” i paskiem „Cofnij”. `sheets` wstaw raz w ekranie.
 */
export function useItemSheets(
  opts: {
    onCloseTask?: (t: Task) => void
    /** `day` – dzień otwartej powtórki (przy zwykłym wydarzeniu = jego dzień). */
    onCloseEvent?: (e: CalendarEvent, day: DateKey) => void
  } = {},
) {
  const store = useStore()
  const { tasks, events, categories, eventTypes, members, today } = store
  const [taskId, setTaskId] = useState<string | null>(null)
  // wydarzenie + dzień powtórki, którą otwarto (cykliczne – nie zawsze dzień startu)
  const [eventRef, setEventRef] = useState<{ id: string; day: DateKey } | null>(null)
  const eventId = eventRef?.id ?? null
  const taskDetail = tasks.find((t) => t.id === taskId && !t.deleted)
  const eventDetail = events.find((e) => e.id === eventId && !e.deleted)
  const eventDay = eventDetail?.repeat ? (eventRef?.day ?? eventDetail.date) : eventDetail?.date
  const taskActions = useTaskActions()
  const confirmDelete = useConfirmDelete()

  const categoryName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name ?? 'Bez kategorii'
  const typeName = (id: string) => eventTypeOf(eventTypes, id).name
  const memberName = (uid: string | null) => members.find((m) => m.uid === uid)?.name ?? ''

  const trashTask = (t: Task) => {
    const closing = (fn: (t: Task) => void) => () => {
      if (taskId === t.id) setTaskId(null)
      fn(t)
    }
    const only =
      t.repeat && !t.done
        ? { label: taskActions.onlyThisLabel(t), run: closing(taskActions.trashOnlyOnce) }
        : undefined
    confirmDelete.ask('zadanie', t.title, closing(taskActions.trash), only)
  }
  /**
   * Usunięcie wydarzenia; `day` – dzień powtórki. Cykliczne pyta „Tylko to – śr 2 gru” /
   * „Wszystkie powtórki” (decyzja Hani 2026-11-15).
   */
  const removeEvent = (e: CalendarEvent, day: DateKey = e.date) => {
    const source = events.find((x) => x.id === e.id) ?? e
    const closing = (fn: () => void) => () => {
      if (eventId === e.id) setEventRef(null)
      fn()
    }
    const all = closing(() =>
      store.changeEvents(`Przeniesiono do kosza: ${e.title}`, (list) =>
        list.map((x) => (x.id === e.id ? deleteEvent(x, store.who()) : x)),
      ),
    )
    const only = source.repeat
      ? {
          label: `Tylko to – ${shortDay(day)}`,
          run: closing(() =>
            store.changeEvents(`Usunięto: ${e.title} · ${shortDay(day)}`, (list) =>
              list.map((x) => (x.id === e.id ? skipOccurrence(x, day) : x)),
            ),
          ),
        }
      : undefined
    confirmDelete.ask('wydarzenie', e.title, all, only)
  }

  const sheets = (
    <>
      {eventDetail && eventDay && (
        <EventDetailSheet
          key={eventDetail.id}
          event={eventDetail}
          day={eventDay}
          eventTypes={eventTypes}
          status={`${typeName(eventDetail.typeId)} · ${dayLabel(eventDay)}`.toUpperCase()}
          meta={`Dodane: ${memberName(eventDetail.createdBy)}`}
          onSave={(e) =>
            store.setEvents((list) =>
              list.map((x) => (x.id === eventDetail.id ? editEvent(x, e) : x)),
            )
          }
          onDelete={() => removeEvent(eventDetail, eventDay)}
          onClose={() => {
            setEventRef(null)
            opts.onCloseEvent?.(eventDetail, eventDay)
          }}
        />
      )}
      {taskDetail && (
        <TaskDetailSheet
          key={taskDetail.id}
          task={taskDetail}
          categories={categories}
          today={today}
          status={
            taskDetail.done && taskDetail.doneAt
              ? `OGARNIĘTE · ${whenLabel(taskDetail.doneAt, today).toUpperCase()}`
              : `DO ZROBIENIA · ${categoryName(taskDetail.categoryId).toUpperCase()}`
          }
          meta={
            taskDetail.done
              ? `Ogarnięte: ${memberName(taskDetail.doneBy)}`
              : `Dodane: ${memberName(taskDetail.createdBy)}`
          }
          onSave={(e) => taskActions.save(taskDetail, e)}
          onToggleDone={() => taskActions.toggleDone(taskDetail)}
          onToggleSub={(sid) => taskActions.toggleSub(taskDetail, sid)}
          onTrash={() => trashTask(taskDetail)}
          onClose={() => {
            setTaskId(null)
            opts.onCloseTask?.(taskDetail)
          }}
        />
      )}
      {confirmDelete.dialog}
    </>
  )

  return {
    openTask: (t: Task) => setTaskId(t.id),
    /** `day` – dzień powtórki (domyślnie `e.date`: Start podaje kopię z dniem powtórki). */
    openEvent: (e: CalendarEvent, day: DateKey = e.date) => setEventRef({ id: e.id, day }),
    toggleDone: taskActions.toggleDone,
    trashTask,
    removeEvent,
    sheets,
  }
}
