// Wyliczenia ekranu Kalendarz (Kalendarz.dc.html): siatki tygodnia i miesiąca, agenda, „Później”.

import {
  MONTHS_GEN,
  MONTHS_SHORT,
  addDays,
  parseKey,
  toKey,
  type DateKey,
} from '../../data/dates.ts'
import { plural } from '../../data/plural.ts'
import { shade } from '../../theme'
import type { CalendarItem } from '../../data/selectors.ts'
import type { EventType } from '../../data/types.ts'

/** Rodzaj „Termin zadania” – terminy niezrobionych zadań. */
export const DEADLINE_TYPE = 'task'

/** Dni miesiąca w siatce pn–nd; null = puste pole przed 1. i po ostatnim dniu. */
export function monthGrid(year: number, month: number): (DateKey | null)[] {
  const lead = (new Date(year, month, 1).getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const cells: (DateKey | null)[] = Array(lead).fill(null)
  for (let d = 1; d <= days; d++) cells.push(toKey(new Date(year, month, d)))
  while (cells.length % 7) cells.push(null)
  return cells
}

/** Rodzaje wpisów danego dnia (do 3 kropek pod dniem). */
export function typesOn(items: CalendarItem[], day: DateKey): string[] {
  return [...new Set(items.filter((i) => i.date === day).map((i) => i.typeId))].slice(0, 3)
}

/** Wpisy dnia: najpierw terminy zadań, potem całodniowe, potem wg godziny. */
export function agendaFor(items: CalendarItem[], day: DateKey): CalendarItem[] {
  const rank = (i: CalendarItem) => (i.typeId === DEADLINE_TYPE ? 0 : i.from ? 2 : 1)
  return items
    .filter((i) => i.date === day)
    .sort((a, b) => rank(a) - rank(b) || (a.from ?? '').localeCompare(b.from ?? ''))
}

/** Godzina wpisu: „19:30”, „08:40–09:10”; bez godziny – „termin” albo „cały dzień”. */
export function timeLabel(i: CalendarItem): string {
  if (i.from) return i.to ? `${i.from}–${i.to}` : i.from
  return i.typeId === DEADLINE_TYPE ? 'termin' : 'cały dzień'
}

/** Najbliższe wpisy po końcu widocznego tygodnia. */
export function laterItems(items: CalendarItem[], weekEnd: DateKey, limit = 4): CalendarItem[] {
  return items.filter((i) => i.date > weekEnd).slice(0, limit)
}

/** „5–11 października” albo „28 wrz – 4 paź”. */
export function weekRangeLabel(monday: DateKey): string {
  const a = parseKey(monday)
  const b = parseKey(addDays(monday, 6))
  if (a.getMonth() === b.getMonth())
    return `${a.getDate()}–${b.getDate()} ${MONTHS_GEN[b.getMonth()]}`
  const short = (d: Date) => `${d.getDate()} ${MONTHS_SHORT[d.getMonth()].toLowerCase()}`
  return `${short(a)} – ${short(b)}`
}

/** „3 wpisy w tym tygodniu” */
export const weekCountLabel = (n: number) =>
  `${n} ${plural(n, ['wpis', 'wpisy', 'wpisów'])} w tym tygodniu`

/** „2 WPISY” nad agendą; pusto, gdy dzień jest wolny. */
export const dayCountLabel = (n: number) =>
  n === 0 ? '' : `${n} ${plural(n, ['wpis', 'wpisy', 'wpisów']).toUpperCase()}`

/** Kolory do wyboru dla nowego rodzaju (jak w projekcie). */
export const TYPE_SWATCHES = [
  { color: '#5E8C6A', name: 'szałwiowy' },
  { color: '#4D7A93', name: 'niebieski' },
  { color: '#6E5F8C', name: 'śliwkowy' },
  { color: '#A4492F', name: 'terakota' },
  { color: '#B4457A', name: 'malinowy' },
  { color: '#B8925A', name: 'mosiężny' },
  { color: '#3F7A7A', name: 'morski' },
  { color: '#7A6A5C', name: 'orzechowy' },
] as const

export { shade }

/** Nowy rodzaj wydarzenia: kropka, tło i tekst wyliczone z wybranego koloru. */
export function customType(id: string, name: string, color: string): EventType {
  return {
    id,
    name,
    dot: shade(color, 0.45),
    bg: shade(color, 0.82),
    fg: shade(color, -0.35),
    icon: 'custom',
    system: false,
  }
}
