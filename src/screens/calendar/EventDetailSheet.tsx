import { useState } from 'react'
import {
  DetailActions,
  DetailTopBar,
  DiscardDialog,
  InfoRow,
  NoteText,
} from '../../components/DetailSheet.tsx'
import { CheckIcon, EventTypeIcon, RepeatIcon } from '../../components/icons.tsx'
import { repeatSummary } from '../../data/repeat.ts'
import { Dot, Sheet } from '../../components/ui.tsx'
import { DAYS, MONTHS_GEN, parseKey, type DateKey } from '../../data/dates.ts'
import { eventEditOf, REMINDS, setAllDay, type EventEdit } from '../../data/eventOps.ts'
import { eventTypeOf } from '../../data/selectors.ts'
import { useStore } from '../../data/store.ts'
import type { CalendarEvent, EventType } from '../../data/types.ts'
import { colors, eventTint, fonts } from '../../theme'
import { EventForm } from './EventForm.tsx'

/** „Piątek, 16 października” */
function dayName(k: DateKey): string {
  const d = parseKey(k)
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`
}

/** „Cały dzień”, „19:00–21:00”, „od 19:00”. */
const hours = (e: EventEdit) =>
  e.allDay || !e.from ? 'Cały dzień' : e.to ? `${e.from}–${e.to}` : `od ${e.from}`

/**
 * Arkusz wydarzenia – jak arkusz zadania: najpierw do odczytu, „Edytuj” → edycja (także dzień)
 * z „Zapisz” u góry; na dole „Usuń” i „Gotowe” (uwagi Hani 2026-10-25).
 */
export function EventDetailSheet({
  event,
  eventTypes,
  status,
  meta,
  onSave,
  onDelete,
  onClose,
  day,
}: {
  event: CalendarEvent
  eventTypes: EventType[]
  /** Wydarzenie cykliczne – dzień otwartej powtórki (brak = dzień wydarzenia). */
  day?: DateKey
  /** „URODZINY · PIĄTEK, 16 PAŹDZIERNIKA” */
  status: string
  /** „Dodane: Hania” */
  meta: string
  /** „Zapisz” w trybie edycji. */
  onSave: (edit: EventEdit) => void
  onDelete: () => void
  onClose: () => void
}) {
  const { today } = useStore()
  const [draft, setDraft] = useState<EventEdit | null>(null)
  const [base, setBase] = useState<EventEdit | null>(null)
  const [discard, setDiscard] = useState<'close' | 'cancel' | null>(null)
  const editing = draft !== null
  const dirty = editing && JSON.stringify(draft) !== JSON.stringify(base)
  const type = eventTypeOf(eventTypes, event.typeId)

  const startEdit = () => {
    const e = eventEditOf(event)
    setDraft(e)
    setBase(e)
  }
  const stopEdit = () => {
    setDraft(null)
    setBase(null)
  }
  const save = () => {
    if (!draft?.title.trim()) return
    // godzina „od” jest wymagana przy wydarzeniu z godziną – bez niej: cały dzień
    const fixed = !draft.allDay && !draft.from ? setAllDay(draft, true) : draft
    onSave({ ...fixed, title: draft.title.trim(), note: draft.note.trim() })
    stopEdit()
  }
  const requestClose = () => (dirty ? setDiscard('close') : onClose())
  const cancelEdit = () => (dirty ? setDiscard('cancel') : stopEdit())
  const change = (fn: (d: EventEdit) => EventEdit) => setDraft((d) => (d ? fn(d) : d))

  return (
    <Sheet open onClose={requestClose} confirmClose={dirty} label="Wydarzenie">
      <DetailTopBar
        status={status}
        editing={editing}
        canSave={!!draft?.title.trim()}
        onEdit={startEdit}
        onSave={save}
        onCancel={cancelEdit}
      />

      {draft ? (
        <EventForm
          mode="edit"
          value={draft}
          onChange={change}
          eventTypes={eventTypes}
          today={today}
          authorUid={event.createdBy}
          onSubmit={save}
        />
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background: eventTint(type).bg,
                color: eventTint(type).fg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 'none',
              }}
            >
              <EventTypeIcon icon={type.icon} />
            </span>
            <h2
              style={{
                margin: 0,
                flex: 1,
                minWidth: 0,
                fontFamily: fonts.serif,
                fontSize: 24,
                fontWeight: 500,
                lineHeight: 1.2,
                color: colors.green900,
                overflowWrap: 'anywhere',
              }}
            >
              {event.title}
            </h2>
          </div>

          <div>
            <InfoRow label="RODZAJ">
              <Dot color={eventTint(type).fg} />
              {type.name}
            </InfoRow>
            <InfoRow label="DZIEŃ">{dayName(day ?? event.date)}</InfoRow>
            <InfoRow label="GODZINA">{hours(event)}</InfoRow>
            {event.repeat && (
              <InfoRow label="POWTARZA SIĘ">
                <RepeatIcon size={15} />
                {repeatSummary(event.repeat, event.date)}
              </InfoRow>
            )}
            <InfoRow label="PRZYPOMNIJ">
              {REMINDS.find((r) => r.id === event.remind)?.name ?? 'Brak'}
            </InfoRow>
            <InfoRow label="KTO WIDZI">{event.private ? 'Tylko ja' : 'Wspólne'}</InfoRow>
          </div>

          <NoteText text={event.note} />

          <DetailActions
            onDelete={onDelete}
            primary={{ label: 'Gotowe', icon: <CheckIcon size={16} />, onClick: onClose }}
          />
        </>
      )}

      <span style={{ fontSize: 12, color: colors.muted, textAlign: 'center' }}>{meta}</span>

      {discard && (
        <DiscardDialog
          what="wydarzeniu"
          onKeep={() => setDiscard(null)}
          onDiscard={() => {
            const then = discard
            setDiscard(null)
            stopEdit()
            if (then === 'close') onClose()
          }}
        />
      )}
    </Sheet>
  )
}
