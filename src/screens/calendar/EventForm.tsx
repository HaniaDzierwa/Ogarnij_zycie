import { useState, type ReactNode } from 'react'
import { AddMore, FormCard, FormRow, TitleField, ValueBadge } from '../../components/FormCard.tsx'
import { RowIcons, useOpenRow } from '../../components/formRows.tsx'
import { RepeatField } from '../../components/RepeatField.tsx'
import { Chip, Dot, NoteField, Segmented } from '../../components/ui.tsx'
import { VisibilityField } from '../../components/VisibilityField.tsx'
import { DAYS_SHORT, MONTHS_SHORT, diffDays, parseKey, type DateKey } from '../../data/dates.ts'
import { REMINDS, setAllDay, type EventEdit } from '../../data/eventOps.ts'
import { repeatName } from '../../data/repeat.ts'
import { eventTypeOf } from '../../data/selectors.ts'
import type { EventType } from '../../data/types.ts'
import { colors, eventTint, fonts } from '../../theme'
import { TYPE_SWATCHES } from './calendarView.ts'
import { label, timeInput } from './formStyles.ts'

type Row = 'type' | 'day' | 'time' | 'repeat' | 'remind' | 'vis'

/** Identyfikatory pól – „Nowe wydarzenie” i edycja mają własne. */
const IDS = {
  new: {
    title: 'nazwa-wydarzenia',
    day: 'nowe-wydarzenie-dzien',
    from: 'od',
    to: 'do',
    days: 'w-co-ile-dni',
    note: 'notatka-wydarzenia',
  },
  edit: {
    title: 'wyd-nazwa',
    day: 'wyd-dzien',
    from: 'wyd-od',
    to: 'wyd-do',
    days: 'wyd-co-ile-dni',
    note: 'wyd-notatka',
  },
} as const

/** „Dziś”, „Jutro”, „Śr 2 gru”. */
function dayValue(day: DateKey, today: DateKey): string {
  const diff = diffDays(today, day)
  if (diff === 0) return 'Dziś'
  if (diff === 1) return 'Jutro'
  const d = parseKey(day)
  const s = `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`.toLowerCase()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Formularz wydarzenia w układzie 1c (etap 8, ekran 4b): nazwa na wierzchu; karta Rodzaj · Dzień ·
 * Godzina · Powtarzaj · Przypomnij · Kto widzi (rozwija się jeden naraz); „+ Notatka”.
 * Wspólny dla „Nowe wydarzenie” (`mode="new"`) i trybu edycji arkusza wydarzenia.
 */
export function EventForm({
  mode,
  value,
  onChange,
  eventTypes,
  today,
  onAddType,
  authorUid,
  onSubmit,
}: {
  mode: 'new' | 'edit'
  value: EventEdit
  onChange: (fn: (d: EventEdit) => EventEdit) => void
  eventTypes: EventType[]
  today: DateKey
  /** „+ Nowy rodzaj” – zwraca id nowego rodzaju. */
  onAddType?: (name: string, color: string) => string
  authorUid?: string
  onSubmit?: () => void
}) {
  const ids = IDS[mode]
  const rows = useOpenRow<Row>()
  const [newTypeOpen, setNewTypeOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(value.note !== '')
  // nowe: Urodziny same ustawiają „Co rok” i cały dzień – dopóki nikt nie zmienił powtarzania
  const [repeatTouched, setRepeatTouched] = useState(mode === 'edit')

  const set = (patch: Partial<EventEdit>) => onChange((d) => ({ ...d, ...patch }))
  const types = eventTypes.filter((t) => !t.system)
  const type = eventTypeOf(eventTypes, value.typeId)

  const pickType = (t: EventType) => {
    if (t.icon === 'bday' && !repeatTouched)
      onChange((d) => ({ ...setAllDay(d, true), typeId: t.id, repeat: { every: 'year' } }))
    else set({ typeId: t.id })
    rows.close()
  }

  return (
    <>
      <TitleField
        id={ids.title}
        kicker={mode === 'new' ? 'NOWE WYDARZENIE' : undefined}
        label="NAZWA"
        placeholder={mode === 'new' ? 'Co się dzieje?' : 'Nazwa wydarzenia'}
        value={value.title}
        onChange={(title) => set({ title })}
        onEnter={onSubmit}
      />

      <FormCard>
        <FormRow
          first
          icon={RowIcons.tag}
          label="Rodzaj"
          value={
            <ValueBadge bg={eventTint(type).bg} fg={eventTint(type).fg} dot={eventTint(type).fg}>
              {type.name.toUpperCase()}
            </ValueBadge>
          }
          open={rows.is('type')}
          onToggle={() => rows.toggle('type')}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {types.map((t) => {
              const on = value.typeId === t.id
              return (
                <Chip
                  key={t.id}
                  on={on}
                  onClick={() => pickType(t)}
                  dot={<Dot color={on ? colors.brass300 : eventTint(t).fg} />}
                >
                  {t.name}
                </Chip>
              )
            })}
            {onAddType && (
              <button
                type="button"
                aria-expanded={newTypeOpen}
                onClick={() => setNewTypeOpen((o) => !o)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: 36,
                  padding: '0 14px',
                  borderRadius: 18,
                  border: `1px dashed ${colors.brass500}`,
                  background: 'transparent',
                  color: colors.brass700,
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: '0.4px',
                  whiteSpace: 'nowrap',
                }}
              >
                + Nowy rodzaj
              </button>
            )}
          </div>
          {onAddType && newTypeOpen && (
            <NewTypeForm
              onCancel={() => setNewTypeOpen(false)}
              onAdd={(name, color) => {
                set({ typeId: onAddType(name, color) })
                setNewTypeOpen(false)
                rows.close()
              }}
            />
          )}
        </FormRow>

        <FormRow
          icon={RowIcons.calendar}
          label="Dzień"
          value={dayValue(value.date, today)}
          open={rows.is('day')}
          onToggle={() => rows.toggle('day')}
        >
          <label htmlFor={ids.day} className="sr-only">
            DZIEŃ
          </label>
          <input
            id={ids.day}
            type="date"
            value={value.date}
            onChange={(e) => e.target.value && set({ date: e.target.value })}
            style={{ ...timeInput, fontFamily: fonts.sans, fontSize: 16, fontWeight: 600 }}
          />
        </FormRow>

        <FormRow
          icon={RowIcons.clock}
          label="Godzina"
          value={
            value.allDay || !value.from
              ? 'Cały dzień'
              : `${value.from}${value.to ? `–${value.to}` : ''}`
          }
          open={rows.is('time')}
          onToggle={() => rows.toggle('time')}
        >
          <Segmented
            label="Godzina"
            size="full"
            value={value.allDay ? 'all' : 'time'}
            onChange={(v) => onChange((d) => setAllDay(d, v === 'all'))}
            options={[
              { id: 'all', name: 'Cały dzień' },
              { id: 'time', name: 'O godzinie' },
            ]}
          />
          {!value.allDay && (
            <div
              style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}
            >
              <TimeInput
                id={ids.from}
                label="OD"
                value={value.from}
                onChange={(from) => set({ from })}
              />
              <TimeInput
                id={ids.to}
                label={
                  <>
                    DO{' '}
                    <span style={{ fontWeight: 600, letterSpacing: '0.4px' }}>(opcjonalnie)</span>
                  </>
                }
                value={value.to}
                onChange={(to) => set({ to })}
              />
            </div>
          )}
        </FormRow>

        <FormRow
          icon={RowIcons.repeat}
          label="Powtarzaj"
          value={
            value.repeat ? (
              repeatName(value.repeat)
            ) : (
              <span style={{ color: colors.muted }}>Nie</span>
            )
          }
          open={rows.is('repeat')}
          onToggle={() => rows.toggle('repeat')}
        >
          <RepeatField
            id={ids.days}
            value={value.repeat}
            start={value.date}
            onChange={(repeat) => {
              setRepeatTouched(true)
              set({ repeat })
            }}
          />
        </FormRow>

        <FormRow
          icon={RowIcons.bell}
          label="Przypomnij"
          value={
            value.remind === 'none' ? (
              <span style={{ color: colors.muted }}>Brak</span>
            ) : (
              REMINDS.find((r) => r.id === value.remind)!.name
            )
          }
          open={rows.is('remind')}
          onToggle={() => rows.toggle('remind')}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {REMINDS.map((r) => (
              <Chip
                key={r.id}
                on={value.remind === r.id}
                onClick={() => {
                  set({ remind: r.id })
                  rows.close()
                }}
              >
                {r.name}
              </Chip>
            ))}
          </div>
        </FormRow>

        <FormRow
          icon={RowIcons.people}
          label="Kto widzi"
          value={value.private ? 'Tylko ja' : 'Wspólne'}
          open={rows.is('vis')}
          onToggle={() => rows.toggle('vis')}
        >
          <VisibilityField
            bare
            value={value.private}
            authorUid={authorUid}
            onChange={(p) => set({ private: p })}
          />
        </FormRow>
      </FormCard>

      {noteOpen && (
        <NoteField id={ids.note} value={value.note} onChange={(note) => set({ note })} />
      )}
      <AddMore items={noteOpen ? [] : [{ label: 'Notatka', onClick: () => setNoteOpen(true) }]} />
    </>
  )
}

function TimeInput({
  id,
  label: text,
  value,
  onChange,
}: {
  id: string
  label: ReactNode
  value: string | null
  onChange: (v: string | null) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label htmlFor={id} style={label}>
        {text}
      </label>
      <input
        id={id}
        type="time"
        step={300}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        style={timeInput}
      />
    </div>
  )
}

/** „+ Nowy rodzaj”: nazwa i kolor (kropka, tło i tekst liczone z koloru). */
function NewTypeForm({
  onAdd,
  onCancel,
}: {
  onAdd: (name: string, color: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(TYPE_SWATCHES[0].color)
  const add = () => {
    const n = name.trim()
    if (n) onAdd(n, color)
  }
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 16,
        borderRadius: 20,
        background: colors.cream,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="nazwa-rodzaju" style={label}>
          NAZWA RODZAJU
        </label>
        <input
          id="nazwa-rodzaju"
          type="text"
          autoFocus
          placeholder="np. Trening, Rocznica"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          style={{
            height: 46,
            border: `1px solid ${colors.border}`,
            borderRadius: 14,
            padding: '0 14px',
            fontSize: 16,
            color: colors.green900,
            background: colors.white,
            outlineColor: colors.green900,
          }}
        />
      </div>
      <div
        role="radiogroup"
        aria-label="Kolor rodzaju"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gap: 6 }}
      >
        {TYPE_SWATCHES.map((sw) => {
          const on = sw.color === color
          return (
            <button
              key={sw.color}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`Kolor ${sw.name}`}
              onClick={() => setColor(sw.color)}
              style={{
                width: 32,
                height: 32,
                justifySelf: 'center',
                borderRadius: 16,
                border: 0,
                padding: 0,
                background: sw.color,
                boxShadow: on ? `0 0 0 3px ${colors.cream}, 0 0 0 5px ${colors.green900}` : 'none',
              }}
            />
          )
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            height: 44,
            border: `1px solid ${colors.border}`,
            borderRadius: 22,
            background: colors.white,
            color: colors.green900,
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          Anuluj
        </button>
        <button
          type="button"
          onClick={add}
          style={{
            height: 44,
            border: 0,
            borderRadius: 22,
            background: colors.green900,
            color: colors.cream,
            fontSize: 15,
            fontWeight: 800,
          }}
        >
          Dodaj rodzaj
        </button>
      </div>
    </div>
  )
}
