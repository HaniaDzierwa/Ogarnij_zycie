import { useState } from 'react'
import { useConfirmDelete } from '../../components/useConfirmDelete.tsx'
import { DAYS, MONTHS_GEN, parseKey, whenLabel, type DateKey } from '../../data/dates.ts'
import { deleteEvent } from '../../data/eventOps.ts'
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

/**
 * Arkusz zadania i arkusz wydarzenia poza listą zadań (Start, Kalendarz): otwieranie, ogarnianie,
 * usuwanie do kosza z pytaniem „Usunąć …?” i paskiem „Cofnij”. `sheets` wstaw raz w ekranie.
 */
export function useItemSheets(
  opts: {
    onCloseTask?: (t: Task) => void
    onCloseEvent?: (e: CalendarEvent) => void
  } = {},
) {
  const store = useStore()
  const { tasks, events, categories, eventTypes, members, today } = store
  const [taskId, setTaskId] = useState<string | null>(null)
  const [eventId, setEventId] = useState<string | null>(null)
  const taskDetail = tasks.find((t) => t.id === taskId && !t.deleted)
  const eventDetail = events.find((e) => e.id === eventId && !e.deleted)
  const taskActions = useTaskActions()
  const confirmDelete = useConfirmDelete()

  const categoryName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name ?? 'Bez kategorii'
  const typeName = (id: string) => eventTypeOf(eventTypes, id).name
  const memberName = (uid: string | null) => members.find((m) => m.uid === uid)?.name ?? ''

  const trashTask = (t: Task) =>
    confirmDelete.ask('zadanie', t.title, () => {
      if (taskId === t.id) setTaskId(null)
      taskActions.trash(t)
    })
  const removeEvent = (e: CalendarEvent) =>
    confirmDelete.ask('wydarzenie', e.title, () => {
      if (eventId === e.id) setEventId(null)
      store.changeEvents(`Przeniesiono do kosza: ${e.title}`, (list) =>
        list.map((x) => (x.id === e.id ? deleteEvent(x, store.who()) : x)),
      )
    })

  const sheets = (
    <>
      {eventDetail && (
        <EventDetailSheet
          key={eventDetail.id}
          event={eventDetail}
          eventTypes={eventTypes}
          status={`${typeName(eventDetail.typeId)} · ${dayLabel(eventDetail.date)}`.toUpperCase()}
          meta={`Dodane: ${memberName(eventDetail.createdBy)}`}
          onSave={(e) =>
            store.setEvents((list) =>
              list.map((x) => (x.id === eventDetail.id ? { ...x, ...e } : x)),
            )
          }
          onDelete={() => removeEvent(eventDetail)}
          onClose={() => {
            setEventId(null)
            opts.onCloseEvent?.(eventDetail)
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
    openEvent: (e: CalendarEvent) => setEventId(e.id),
    toggleDone: taskActions.toggleDone,
    trashTask,
    removeEvent,
    sheets,
  }
}
