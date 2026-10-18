// Przykładowe dane z docs/design/ekrany/ (SEED, CATS, BASE_TYPES). Etap 1 – tylko w pamięci.
// Daty liczone względem „dziś” tak, jak w projekcie względem piątku 9 października 2026.

import { builtInEventTypes, defaultCategories, type Priority } from '../theme'
import { addDays, type DateKey } from './dates.ts'
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

const iconByType: Record<string, EventType['icon']> = {
  task: 'deadline',
  birthday: 'bday',
  party: 'party',
  event: 'event',
  doctor: 'custom',
}

export const mockEventTypes: EventType[] = builtInEventTypes.map((t) => ({
  id: t.id,
  name: t.name,
  dot: t.dot,
  bg: t.bg,
  fg: t.fg,
  icon: iconByType[t.id],
  system: t.system,
}))

type TaskSeed = [
  title: string,
  categoryId: string,
  priority: Priority,
  /** Dni od „dziś” (null = bez terminu). */
  dueIn: number | null,
  done: boolean,
  subtasks?: [string, boolean][],
]

const taskSeed: TaskSeed[] = [
  [
    'Prezent dla mamy na imieniny',
    'shop',
    'high',
    7,
    false,
    [
      ['Wybrać prezent', true],
      ['Kupić kartkę', true],
      ['Zapakować', false],
      ['Odebrać kwiaty w piątek rano', false],
    ],
  ],
  ['Baterie AA do pilota', 'shop', 'low', null, false],
  ['Mleko i chleb', 'shop', 'mid', 0, true],
  ['Zadzwonić do hydraulika – cieknący kran', 'home', 'high', 0, false],
  ['Wymienić filtr w okapie', 'home', 'low', null, false],
  ['Oddać ubrania do PCK', 'home', 'low', null, false],
  ['Wykupić receptę', 'health', 'high', 1, false],
  ['Umówić wizytę u dentysty', 'health', 'mid', null, false],
  ['Zapłacić rachunek za prąd', 'office', 'high', 6, false],
  [
    'Wymienić dowód osobisty',
    'office',
    'mid',
    null,
    false,
    [
      ['Zrobić zdjęcie do dowodu', true],
      ['Złożyć wniosek w urzędzie', false],
      ['Odebrać nowy dowód', false],
    ],
  ],
  [
    'Przegląd techniczny',
    'car',
    'mid',
    21,
    false,
    [
      ['Znaleźć stację kontroli', false],
      ['Umówić termin', false],
    ],
  ],
  ['Założyć opony zimowe', 'car', 'mid', null, true],
  ['Zebranie w szkole', 'family', 'mid', 4, false],
  ['Bilety do kina na sobotę', 'family', 'low', null, false],
  ['Wynieść śmieci', 'home', 'low', 0, true],
]

export function mockTasks(today: DateKey): Task[] {
  return taskSeed.map(([title, categoryId, priority, dueIn, done, subs = []], i) => ({
    id: `t${i + 1}`,
    title,
    categoryId,
    priority,
    due: dueIn === null ? null : addDays(today, dueIn),
    done,
    subtasks: subs.map(([t, d], j) => ({ id: `t${i + 1}s${j + 1}`, title: t, done: d })),
  }))
}

type EventSeed = [
  title: string,
  dayIn: number,
  typeId: string,
  from: string | null,
  to: string | null,
  note: string,
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
]

export function mockEvents(today: DateKey): CalendarEvent[] {
  return eventSeed.map(([title, dayIn, typeId, from, to, note], i) => ({
    id: `e${i + 1}`,
    title,
    date: addDays(today, dayIn),
    allDay: from === null,
    from,
    to,
    typeId,
    note,
  }))
}

export const mockUserName = 'Hania'

export const mockMembers: Member[] = [
  {
    uid: 'hania',
    name: 'Hania',
    role: 'owner',
    scope: { all: true, categoryIds: [], calendar: true },
    lastSeen: 'TERAZ',
  },
  {
    uid: 'krzys',
    name: 'Krzyś',
    role: 'member',
    scope: { all: true, categoryIds: [], calendar: true },
    lastSeen: 'DZIŚ 13:05',
  },
]

export const mockNotifications: NotificationSettings = {
  tasks: true,
  events: true,
  morning: true,
  house: false,
}
