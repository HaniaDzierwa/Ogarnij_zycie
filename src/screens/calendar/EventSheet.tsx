import { useState, type ReactNode } from 'react'
import { Chip, Dot, Field, PrimaryButton, Sheet } from '../../components/ui.tsx'
import { DAYS, MONTHS_GEN, parseKey, type DateKey } from '../../data/dates.ts'
import type { CalendarEvent, EventType, Remind } from '../../data/types.ts'
import { colors, fonts } from '../../theme'
import { REMINDS } from '../../data/eventOps.ts'
import { TYPE_SWATCHES } from './calendarView.ts'
import { label, timeInput } from './formStyles.ts'

/** Nowe wydarzenie z formularza (id nadaje ekran). */
export type EventDraft = Omit<CalendarEvent, 'id' | 'createdBy'>

/**
 * Arkusz „Nowe wydarzenie” (Kalendarz.dc.html): nazwa, rodzaj (+ nowy rodzaj z kolorem),
 * cały dzień albo od–do, przypomnienie. Otwierany warunkowo – formularz startuje od nowa.
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
  const types = eventTypes.filter((t) => !t.system)
  const [title, setTitle] = useState('')
  const [typeId, setTypeId] = useState(types[0]?.id ?? '')
  const [allDay, setAllDay] = useState(false)
  const [from, setFrom] = useState('18:00')
  const [to, setTo] = useState('')
  const [remind, setRemind] = useState<Remind>('day')
  const [newTypeOpen, setNewTypeOpen] = useState(false)
  const [typeName, setTypeName] = useState('')
  const [typeColor, setTypeColor] = useState<string>(TYPE_SWATCHES[0].color)

  const d = parseKey(day)
  const dayLabel = `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`.toUpperCase()

  const addType = () => {
    const name = typeName.trim()
    if (!name) return
    setTypeId(onAddType(name, typeColor))
    setNewTypeOpen(false)
    setTypeName('')
  }
  const submit = () => {
    const t = title.trim()
    if (!t) return
    const timed = !allDay && !!from
    onSave({
      title: t,
      date: day,
      allDay: !timed,
      from: timed ? from : null,
      to: timed && to ? to : null,
      typeId,
      remind,
      note: '',
      deleted: false,
      deletedAt: null,
      deletedBy: null,
    })
  }

  return (
    <Sheet open onClose={onClose} label="Nowe wydarzenie">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontFamily: fonts.serif, fontSize: 28, fontWeight: 500 }}>
          Nowe <em style={{ color: colors.brass700 }}>wydarzenie</em>
        </span>
        <span style={label}>{dayLabel}</span>
      </div>

      <Field
        id="nazwa-wydarzenia"
        label="NAZWA"
        placeholder="np. Urodziny Oli"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />

      <Group label="RODZAJ">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {types.map((t) => (
            <Chip
              key={t.id}
              on={typeId === t.id}
              onClick={() => setTypeId(t.id)}
              dot={<Dot color={typeId === t.id ? colors.brass300 : t.fg} />}
            >
              {t.name}
            </Chip>
          ))}
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
        </div>
        {newTypeOpen && (
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
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addType()}
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
                const on = sw.color === typeColor
                return (
                  <button
                    key={sw.color}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={`Kolor ${sw.name}`}
                    onClick={() => setTypeColor(sw.color)}
                    style={{
                      width: 32,
                      height: 32,
                      justifySelf: 'center',
                      borderRadius: 16,
                      border: 0,
                      padding: 0,
                      background: sw.color,
                      boxShadow: on
                        ? `0 0 0 3px ${colors.cream}, 0 0 0 5px ${colors.green900}`
                        : 'none',
                    }}
                  />
                )
              })}
            </div>
            <div
              style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}
            >
              <button
                type="button"
                onClick={() => setNewTypeOpen(false)}
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
                onClick={addType}
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
        )}
      </Group>

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
            checked={allDay}
            onChange={() => setAllDay((a) => !a)}
            style={{ width: 22, height: 22, accentColor: colors.green900 }}
          />
        </label>
        {!allDay && (
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label htmlFor="od" style={label}>
                OD
              </label>
              <input
                id="od"
                type="time"
                step={300}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                style={timeInput}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label htmlFor="do" style={label}>
                DO <span style={{ fontWeight: 600, letterSpacing: '0.4px' }}>(opcjonalnie)</span>
              </label>
              <input
                id="do"
                type="time"
                step={300}
                value={to}
                onChange={(e) => setTo(e.target.value)}
                style={timeInput}
              />
            </div>
          </div>
        )}
      </div>

      <Group label="PRZYPOMNIJ">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {REMINDS.map((r) => (
            <Chip key={r.id} on={remind === r.id} onClick={() => setRemind(r.id)}>
              {r.name}
            </Chip>
          ))}
        </div>
      </Group>

      <PrimaryButton onClick={submit}>Dodaj do kalendarza</PrimaryButton>
    </Sheet>
  )
}

export function Group({ label: text, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={label}>{text}</span>
      {children}
    </div>
  )
}
