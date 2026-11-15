import { useState } from 'react'
import { SheetSubmit } from '../../components/SheetSubmit.tsx'
import { Sheet } from '../../components/ui.tsx'
import { type DateKey } from '../../data/dates.ts'
import type { EventEdit } from '../../data/eventOps.ts'
import { useStore } from '../../data/store.ts'
import type { CalendarEvent, EventType } from '../../data/types.ts'
import { EventForm } from './EventForm.tsx'

/** Nowe wydarzenie z formularza (id nadaje ekran). */
export type EventDraft = Omit<CalendarEvent, 'id' | 'createdBy'>

/**
 * Arkusz „Nowe wydarzenie” w układzie 1c (etap 8, ekran 4b): nazwa, karta Rodzaj · Dzień ·
 * Godzina · Powtarzaj · Przypomnij · Kto widzi, „+ Notatka”. Otwierany warunkowo – formularz
 * startuje od nowa.
 */
export function EventSheet({
  day,
  eventTypes,
  onAddType,
  onSave,
  onClose,
}: {
  day: DateKey
  eventTypes: EventType[]
  /** Zwraca id nowego rodzaju. */
  onAddType: (name: string, color: string) => string
  onSave: (event: EventDraft) => void
  onClose: () => void
}) {
  const { today } = useStore()
  const [draft, setDraft] = useState<EventEdit>(() => ({
    title: '',
    typeId: eventTypes.find((t) => !t.system)?.id ?? '',
    // dzień z kalendarza, do zmiany w arkuszu (uwaga Hani 2026-10-25)
    date: day,
    allDay: false,
    from: '18:00',
    to: null,
    remind: 'day',
    note: '',
    // nowe – domyślnie „Wspólne” (decyzja Hani 2026-10-25)
    private: false,
  }))

  const submit = () => {
    const title = draft.title.trim()
    if (!title) return
    const timed = !draft.allDay && !!draft.from
    const { repeat, ...rest } = draft
    onSave({
      ...rest,
      title,
      allDay: !timed,
      from: timed ? draft.from : null,
      to: timed && draft.to ? draft.to : null,
      note: draft.note.trim(),
      ...(repeat ? { repeat } : {}),
      deleted: false,
      deletedAt: null,
      deletedBy: null,
    })
  }

  return (
    <Sheet open onClose={onClose} label="Nowe wydarzenie">
      <EventForm
        mode="new"
        value={draft}
        onChange={(fn) => setDraft(fn)}
        eventTypes={eventTypes}
        today={today}
        onAddType={onAddType}
        onSubmit={submit}
      />
      <SheetSubmit ready={!!draft.title.trim()} onSubmit={submit}>
        Dodaj do kalendarza
      </SheetSubmit>
    </Sheet>
  )
}
