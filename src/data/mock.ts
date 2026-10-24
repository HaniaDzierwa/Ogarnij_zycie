// Przykładowe dane z docs/design/ekrany/ (SEED, CATS, BASE_TYPES). Etap 1 – tylko w pamięci.
// Daty liczone względem „dziś” tak, jak w projekcie względem piątku 9 października 2026.

import { builtInEventTypes, defaultCategories, type Priority } from '../theme'
import { addDays, stamp, type DateKey } from './dates.ts'
import type {
  CalendarEvent,
  Category,
  EventType,
  Member,
  NotificationSettings,
  Task,
} from './types.ts'

const categoryIds = ['shop', 'home', 'health', 'office', 'car', 'family'] as const

export const mockCategories: Category[] = defaultCategories.map((c, i) => ({
  id: categoryIds[i],
  name: c.name,
  color: c.color,
  order: i,
}))

export const mockEventTypes: EventType[] = builtInEventTypes.map((t) => ({
  id: t.id,
  name: t.name,
  dot: t.dot,
  bg: t.bg,
  fg: t.fg,
  icon: t.icon,
  system: t.system,
}))

type TaskSeed = {
  title: string
  cat: string
  prio: Priority
  /** Dni od „dziś” (brak = bez terminu). */
  dueIn?: number
  subs?: [string, boolean][]
  /** Ogarnięte: [dni temu, 'GG:MM', kto]. */
  done?: [number, string, string]
  /** W koszu: [dni temu, kto]. */
  deleted?: [number, string]
  by?: string
}

// Jak w Zadania.dc.html i Kosz.dc.html (projekt z 9 paź).
const taskSeed: TaskSeed[] = [
  {
    title: 'Prezent dla mamy na imieniny',
    cat: 'shop',
    prio: 'high',
    dueIn: 7,
    subs: [
      ['Wybrać prezent', true],
      ['Kupić kartkę', true],
      ['Zapakować', false],
      ['Odebrać kwiaty w piątek rano', false],
    ],
  },
  { title: 'Baterie AA do pilota', cat: 'shop', prio: 'low' },
  { title: 'Mleko i chleb', cat: 'shop', prio: 'mid', dueIn: 0, done: [0, '09:10', 'hania'] },
  { title: 'Zadzwonić do hydraulika – cieknący kran', cat: 'home', prio: 'high', dueIn: 0 },
  { title: 'Wymienić filtr w okapie', cat: 'home', prio: 'low' },
  { title: 'Oddać ubrania do PCK', cat: 'home', prio: 'low' },
  { title: 'Wykupić receptę', cat: 'health', prio: 'high', dueIn: 1 },
  { title: 'Umówić wizytę u dentysty', cat: 'health', prio: 'mid' },
  { title: 'Zapłacić rachunek za prąd', cat: 'office', prio: 'high', dueIn: 6 },
  {
    title: 'Wymienić dowód osobisty',
    cat: 'office',
    prio: 'mid',
    subs: [
      ['Zrobić zdjęcie do dowodu', true],
      ['Złożyć wniosek w urzędzie', false],
      ['Odebrać nowy dowód', false],
    ],
  },
  {
    title: 'Przegląd techniczny',
    cat: 'car',
    prio: 'mid',
    dueIn: 21,
    subs: [
      ['Znaleźć stację kontroli', false],
      ['Umówić termin', false],
    ],
  },
  { title: 'Założyć opony zimowe', cat: 'car', prio: 'mid', done: [0, '11:40', 'krzys'] },
  { title: 'Zebranie w szkole', cat: 'family', prio: 'mid', dueIn: 4, by: 'krzys' },
  { title: 'Bilety do kina na sobotę', cat: 'family', prio: 'low' },
  { title: 'Wynieść śmieci', cat: 'home', prio: 'low', dueIn: 0, done: [0, '08:05', 'hania'] },
  { title: 'Odebrać pranie z pralni', cat: 'home', prio: 'low', done: [1, '18:20', 'krzys'] },
  { title: 'Opłacić przedszkole', cat: 'office', prio: 'high', done: [3, '10:15', 'hania'] },
  { title: 'Wymienić żarówkę w łazience', cat: 'home', prio: 'low', done: [12, '19:00', 'krzys'] },
  {
    title: 'Oddać książki do biblioteki',
    cat: 'family',
    prio: 'low',
    done: [40, '16:30', 'hania'],
  },
  // Kosz
  { title: 'Kupić nowy czajnik', cat: 'shop', prio: 'mid', deleted: [2, 'hania'] },
  { title: 'Umówić przegląd pieca', cat: 'home', prio: 'mid', deleted: [9, 'krzys'] },
  { title: 'Odnowić kartę biblioteczną', cat: 'family', prio: 'low', deleted: [27, 'hania'] },
]

export function mockTasks(today: DateKey): Task[] {
  return taskSeed.map((s, i) => ({
    id: `t${i + 1}`,
    title: s.title,
    categoryId: s.cat,
    priority: s.prio,
    due: s.dueIn === undefined ? null : addDays(today, s.dueIn),
    done: !!s.done,
    subtasks: (s.subs ?? []).map(([t, d], j) => ({ id: `t${i + 1}s${j + 1}`, title: t, done: d })),
    note: '',
    createdBy: s.by ?? 'hania',
    private: false,
    doneAt: s.done ? stamp(addDays(today, -s.done[0]), s.done[1]) : null,
    doneBy: s.done ? s.done[2] : null,
    deleted: !!s.deleted,
    deletedAt: s.deleted ? stamp(addDays(today, -s.deleted[0]), '12:00') : null,
    deletedBy: s.deleted ? s.deleted[1] : null,
  }))
}

type EventSeed = [
  title: string,
  dayIn: number,
  typeId: string,
  from: string | null,
  to: string | null,
  note: string,
  /** W koszu: [dni temu, kto]. */
  deleted?: [number, string],
]

// Terminy zadań („Termin zadania”) nie są tu wpisane – kalendarz bierze je z zadań.
const eventSeed: EventSeed[] = [
  ['Kino z Krzysiem', 1, 'event', '19:30', null, 'Przypomnienie dzień wcześniej'],
  ['Zebranie w szkole', 4, 'event', '17:00', null, 'Rodzina'],
  ['Imieniny mamy', 7, 'birthday', null, null, 'Co roku'],
  ['Urodziny Zosi – sala zabaw', 8, 'party', '15:00', null, 'Przypomnienie tydzień wcześniej'],
  ['Ortodonta – kontrola', 12, 'doctor', '08:40', '09:10', 'Przypomnienie dzień wcześniej'],
  ['Parapetówka u Kasi', 15, 'party', '19:00', null, 'Przynieść wino'],
  ['Urodziny taty', 19, 'birthday', null, null, 'Co roku'],
  ['Wesele Ani i Tomka', 29, 'party', '16:00', null, 'Rodzina'],
  // Kosz (Kosz.dc.html)
  ['Basen z dziećmi', 5, 'event', '17:00', null, '', [1, 'krzys']],
  ['Kolacja u Nowaków', 14, 'party', '19:00', null, '', [12, 'hania']],
]

export function mockEvents(today: DateKey): CalendarEvent[] {
  return eventSeed.map(([title, dayIn, typeId, from, to, note, deleted], i) => ({
    id: `e${i + 1}`,
    title,
    date: addDays(today, dayIn),
    allDay: from === null,
    from,
    to,
    typeId,
    remind: note.includes('dzień wcześniej') ? 'day' : note.includes('tydzień') ? 'week' : 'none',
    // Tekst przypomnienia dopisuje kalendarz z pola remind.
    note: note.startsWith('Przypomnienie') ? '' : note,
    createdBy: 'hania',
    private: false,
    deleted: !!deleted,
    deletedAt: deleted ? stamp(addDays(today, -deleted[0]), '12:00') : null,
    deletedBy: deleted ? deleted[1] : null,
  }))
}

export const mockUserName = 'Hania'

/** Zalogowany domownik w mockupie. */
export const mockCurrentUid = 'hania'

export const mockMembers: Member[] = [
  {
    uid: 'hania',
    name: 'Hania',
    role: 'owner',
    scope: { all: true, categoryIds: [], calendar: true },
    nameGenitive: 'Hani',
    lastSeen: 'TERAZ',
  },
  {
    uid: 'krzys',
    name: 'Krzyś',
    role: 'member',
    scope: { all: true, categoryIds: [], calendar: true },
    nameGenitive: 'Krzysia',
    lastSeen: 'DZIŚ 13:05',
  },
]

export const mockNotifications: NotificationSettings = {
  tasks: true,
  events: true,
  morning: true,
  house: false,
}
