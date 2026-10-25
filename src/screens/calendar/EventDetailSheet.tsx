import { useState } from 'react'
import {
  DetailActions,
  DetailTopBar,
  DiscardDialog,
  InfoRow,
  NoteText,
} from '../../components/DetailSheet.tsx'
import { CheckIcon, EventTypeIcon } from '../../components/icons.tsx'
import { Chip, Dot, NoteField, Sheet } from '../../components/ui.tsx'
import { DAYS, MONTHS_GEN, parseKey, type DateKey } from '../../data/dates.ts'
import { eventEditOf, REMINDS, setAllDay, type EventEdit } from '../../data/eventOps.ts'
import { eventTypeOf } from '../../data/selectors.ts'
import type { CalendarEvent, EventType } from '../../data/types.ts'
import { colors, fonts } from '../../theme'
import { Group } from './EventSheet.tsx'
import { label, timeInput } from './formStyles.ts'
import { VisibilityField } from '../../components/VisibilityField.tsx'

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
}: {
  event: CalendarEvent
  eventTypes: EventType[]
  /** „URODZINY · PIĄTEK, 16 PAŹDZIERNIKA” */
  status: string
  /** „Dodane: Hania” */
  meta: string
  /** „Zapisz” w trybie edycji. */
  onSave: (edit: EventEdit) => void
  onDelete: () => void
  onClose: () => void
}) {
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
    <Sheet open onClose={requestClose} label="Wydarzenie">
      <DetailTopBar
        status={status}
        editing={editing}
        canSave={!!draft?.title.trim()}
        onEdit={startEdit}
        onSave={save}
        onCancel={cancelEdit}
      />

      {draft ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="wyd-nazwa" style={label}>
              NAZWA
            </label>
            <input
              id="wyd-nazwa"
              type="text"
              autoFocus
              maxLength={200}
              value={draft.title}
              onChange={(e) => change((d) => ({ ...d, title: e.target.value }))}
              style={{
                height: 52,
                border: `1px solid ${colors.border}`,
                borderRadius: 14,
                padding: '0 14px',
                background: colors.white,
                fontFamily: fonts.serif,
                fontSize: 22,
                fontWeight: 500,
                color: colors.green900,
                outlineColor: colors.green900,
                minWidth: 0,
              }}
            />
          </div>

          <Group label="RODZAJ">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {eventTypes
                .filter((t) => !t.system)
                .map((t) => {
                  const on = draft.typeId === t.id
                  return (
                    <Chip
                      key={t.id}
                      on={on}
                      onClick={() => change((d) => ({ ...d, typeId: t.id }))}
                      dot={<Dot color={on ? colors.brass300 : t.fg} />}
                    >
                      {t.name}
                    </Chip>
                  )
                })}
            </div>
          </Group>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="wyd-dzien" style={label}>
              DZIEŃ
            </label>
            <input
              id="wyd-dzien"
              type="date"
              value={draft.date}
              onChange={(e) => e.target.value && change((d) => ({ ...d, date: e.target.value }))}
              style={{ ...timeInput, fontFamily: fonts.sans, fontSize: 16, fontWeight: 600 }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                minHeight: 44,
              }}
            >
              <span style={label}>CAŁY DZIEŃ</span>
              <input
                type="checkbox"
                checked={draft.allDay}
                onChange={() => change((d) => setAllDay(d, !d.allDay))}
                style={{ width: 22, height: 22, accentColor: colors.green900 }}
              />
            </label>
            {!draft.allDay && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label htmlFor="wyd-od" style={label}>
                    OD
                  </label>
                  <input
                    id="wyd-od"
                    type="time"
                    step={300}
                    value={draft.from ?? ''}
                    onChange={(e) => change((d) => ({ ...d, from: e.target.value || null }))}
                    style={timeInput}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label htmlFor="wyd-do" style={label}>
                    DO{' '}
                    <span style={{ fontWeight: 600, letterSpacing: '0.4px' }}>(opcjonalnie)</span>
                  </label>
                  <input
                    id="wyd-do"
                    type="time"
                    step={300}
                    value={draft.to ?? ''}
                    onChange={(e) => change((d) => ({ ...d, to: e.target.value || null }))}
                    style={timeInput}
                  />
                </div>
              </div>
            )}
          </div>

          <Group label="PRZYPOMNIJ">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {REMINDS.map((r) => (
                <Chip
                  key={r.id}
                  on={draft.remind === r.id}
                  onClick={() => change((d) => ({ ...d, remind: r.id }))}
                >
                  {r.name}
                </Chip>
              ))}
            </div>
          </Group>

          <NoteField
            id="wyd-notatka"
            value={draft.note}
            onChange={(note) => change((d) => ({ ...d, note }))}
          />

          <VisibilityField
            value={draft.private}
            authorUid={event.createdBy}
            onChange={(p) => change((d) => ({ ...d, private: p }))}
          />
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background: type.bg,
                color: type.fg,
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
              <Dot color={type.fg} />
              {type.name}
            </InfoRow>
            <InfoRow label="DZIEŃ">{dayName(event.date)}</InfoRow>
            <InfoRow label="GODZINA">{hours(event)}</InfoRow>
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
