import { useState } from 'react'
import { CheckIcon, EventTypeIcon, TrashIcon } from '../../components/icons.tsx'
import { Chip, Dot, NoteField, Sheet } from '../../components/ui.tsx'
import { REMINDS, setAllDay } from '../../data/eventOps.ts'
import { eventTypeOf } from '../../data/selectors.ts'
import type { CalendarEvent, EventType } from '../../data/types.ts'
import { colors, fonts, priorities } from '../../theme'
import { Group } from './EventSheet.tsx'
import { label, timeInput } from './formStyles.ts'
import { useBufferedText } from '../../components/useBufferedText.ts'

/**
 * Arkusz wydarzenia – jak arkusz zadania: edycja w miejscu (zmiany zapisują się od razu),
 * na dole „Usuń” i „Gotowe”.
 */
export function EventDetailSheet({
  event,
  eventTypes,
  status,
  meta,
  onChange,
  onDelete,
  onClose,
}: {
  event: CalendarEvent
  eventTypes: EventType[]
  /** „URODZINY · PIĄTEK, 16 PAŹDZIERNIKA” */
  status: string
  /** „Dodane: Hania” */
  meta: string
  onChange: (update: (e: CalendarEvent) => CalendarEvent) => void
  /** Usuń – z bieżącą nazwą (także tą właśnie wpisaną). */
  onDelete: (title: string) => void
  onClose: () => void
}) {
  const [originalTitle] = useState(event.title)
  const type = eventTypeOf(eventTypes, event.typeId)

  // nazwa i notatka – zapis po chwili przerwy w pisaniu (nie po każdej literze)
  const title = useBufferedText(event.title, (v) => onChange((e) => ({ ...e, title: v })))
  const note = useBufferedText(event.note, (v) => onChange((e) => ({ ...e, note: v })))
  const remove = () => {
    title.flush()
    note.flush()
    onDelete(title.text.trim() || event.title)
  }

  const close = () => {
    // pusta nazwa nie zostaje – wraca poprzednia
    if (!title.text.trim()) {
      title.discard()
      if (!event.title.trim()) onChange((e) => ({ ...e, title: originalTitle }))
    } else title.flush()
    note.flush()
    onClose()
  }

  return (
    <Sheet open onClose={close} label="Wydarzenie">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: -6,
        }}
      >
        <span
          style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.6px', color: colors.brass700 }}
        >
          {status}
        </span>
        <button
          type="button"
          onClick={close}
          style={{
            height: 36,
            padding: '0 4px 0 12px',
            border: 0,
            background: 'transparent',
            color: colors.green900,
            fontSize: 14,
            fontWeight: 800,
          }}
        >
          Gotowe
        </button>
      </div>

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
        <label htmlFor="wyd-nazwa" className="sr-only">
          Nazwa wydarzenia
        </label>
        <input
          id="wyd-nazwa"
          type="text"
          value={title.text}
          onChange={(e) => title.change(e.target.value)}
          style={{
            flex: 1,
            minWidth: 0,
            height: 48,
            border: 0,
            borderBottom: `1px solid ${colors.borderSoft}`,
            padding: '0 2px',
            background: 'transparent',
            fontFamily: fonts.serif,
            fontSize: 22,
            fontWeight: 500,
            color: colors.green900,
            outlineColor: colors.green900,
          }}
        />
      </div>

      <Group label="RODZAJ">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {eventTypes
            .filter((t) => !t.system)
            .map((t) => {
              const on = event.typeId === t.id
              return (
                <Chip
                  key={t.id}
                  on={on}
                  onClick={() => onChange((e) => ({ ...e, typeId: t.id }))}
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
          value={event.date}
          onChange={(e) => e.target.value && onChange((x) => ({ ...x, date: e.target.value }))}
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
            checked={event.allDay}
            onChange={() => onChange((e) => setAllDay(e, !e.allDay))}
            style={{ width: 22, height: 22, accentColor: colors.green900 }}
          />
        </label>
        {!event.allDay && (
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label htmlFor="wyd-od" style={label}>
                OD
              </label>
              <input
                id="wyd-od"
                type="time"
                step={300}
                value={event.from ?? ''}
                // pusta godzina „od” nie zostaje – wydarzenie z godziną musi ją mieć
                onChange={(e) =>
                  e.target.value && onChange((x) => ({ ...x, from: e.target.value }))
                }
                style={timeInput}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label htmlFor="wyd-do" style={label}>
                DO <span style={{ fontWeight: 600, letterSpacing: '0.4px' }}>(opcjonalnie)</span>
              </label>
              <input
                id="wyd-do"
                type="time"
                step={300}
                value={event.to ?? ''}
                onChange={(e) => onChange((x) => ({ ...x, to: e.target.value || null }))}
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
              on={event.remind === r.id}
              onClick={() => onChange((e) => ({ ...e, remind: r.id }))}
            >
              {r.name}
            </Chip>
          ))}
        </div>
      </Group>

      <NoteField id="wyd-notatka" value={note.text} onChange={note.change} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 8, marginTop: 2 }}>
        <button
          type="button"
          onClick={remove}
          style={{
            height: 54,
            border: '1px solid #E7B8A8',
            borderRadius: 27,
            background: colors.white,
            color: priorities.high.line,
            fontSize: 16,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <TrashIcon />
          Usuń
        </button>
        <button
          type="button"
          onClick={close}
          style={{
            height: 54,
            border: 0,
            borderRadius: 27,
            background: colors.green900,
            color: colors.cream,
            fontSize: 16,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <span style={{ color: colors.brass300, display: 'flex' }}>
            <CheckIcon size={18} />
          </span>
          Gotowe
        </button>
      </div>
      <span style={{ fontSize: 12, color: colors.muted, textAlign: 'center' }}>
        {meta} · zmiany zapisują się od razu
      </span>
    </Sheet>
  )
}
