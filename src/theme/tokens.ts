// Tokeny wyglądu z docs/DESIGN.md (wartości sprawdzone z docs/design/ekrany/).

export const colors = {
  green900: '#1F3D2E',
  green800: '#2C5240',
  green700: '#3A6650',
  brass300: '#E8C98E',
  brass500: '#B8925A',
  brass700: '#7A5C2C',
  brass800: '#5C4420', // link po najechaniu
  cream: '#F6F1E7',
  creamLight: '#FFFCF6', // arkusze (bottom sheet), menu „Co dodajesz?”
  white: '#FFFFFF',
  line: '#EFE8DA',
  border: '#D9D0BE',
  borderSoft: '#E3DCCD',
  sand: '#EDE6D8',
  muted: '#5E6D63',
  muted2: '#4F5B53',
  muted3: '#7A8A80', // skróty dni tygodnia w kalendarzu
  onDarkMuted: '#C7D8CD',
  onDarkMuted2: '#A9C2B2',
  onDarkMuted3: '#D6E4DA',
  success: '#3F8A5E',
  successBg: '#DDE8DF',
  successText: '#2F5A43',
  onlineDot: '#9FD3B4',
} as const

/** Nagłówek w wersji dziennej (Start, Ładowanie 6:00–18:00). */
export const dayHeader = {
  bg: '#D9E7DC',
  sun: '#E8B65C',
  roofsFar: '#A9C6B1',
  roofsNear: '#7FA98C',
} as const

export type Priority = 'high' | 'mid' | 'low'

export const priorities: Record<Priority, { label: string; line: string; bg: string; fg: string }> =
  {
    high: { label: 'Pilne', line: '#A4492F', bg: '#F3DCD3', fg: '#8C3D27' },
    mid: { label: 'Ważne', line: '#B8925A', bg: '#EFE3CC', fg: '#6E5220' },
    low: { label: 'Przy okazji', line: '#9AA59D', bg: '#E6E8E3', fg: '#4F5B53' },
  }

/** Plakietka „DZIŚ” przy niezrobionym zadaniu. */
export const todayBadge = { bg: '#A4492F', fg: '#FFFFFF' } as const

export const defaultCategories = [
  { name: 'Zakupy', color: '#5E8C6A' },
  { name: 'Dom', color: '#B8925A' },
  { name: 'Zdrowie', color: '#A4492F' },
  { name: 'Urzędy', color: '#6E5F8C' },
  { name: 'Auto', color: '#4D7A93' },
  { name: 'Rodzina', color: '#1F3D2E' },
] as const

export const newCategoryColors = [
  '#5E8C6A',
  '#3F7A7A',
  '#4D7A93',
  '#6E5F8C',
  '#B4457A',
  '#A4492F',
  '#B8925A',
  '#7A6A5C',
] as const

export const noCategory = { name: 'Bez kategorii', color: '#9AA59D' } as const

export const builtInEventTypes = [
  {
    id: 'task',
    name: 'Termin zadania',
    dot: '#F3B9A4',
    bg: '#F3DCD3',
    fg: '#8C3D27',
    system: true,
  },
  { id: 'birthday', name: 'Urodziny', dot: '#F2B8CF', bg: '#F5DDE6', fg: '#7D2953', system: false },
  { id: 'party', name: 'Impreza', dot: '#CDB8F0', bg: '#E4E0EC', fg: '#553A7C', system: false },
  { id: 'event', name: 'Wydarzenie', dot: '#A9CBE8', bg: '#DCE6EC', fg: '#2F5670', system: false },
  { id: 'doctor', name: 'Lekarz', dot: '#9FD3B4', bg: '#DDE8DF', fg: '#2F5A43', system: false },
] as const

export const fonts = {
  serif: "'Fraunces', serif",
  sans: "'Nunito', sans-serif",
} as const

export const radii = {
  header: 26,
  card: 20,
  cardLarge: 22,
  chip: 18,
  button: 28,
  field: 14,
  tabBar: 30,
  sheet: 30,
  badge: 10,
} as const

export const shadows = {
  card: '0 6px 20px rgba(31,61,46,0.07)',
  tabBar: '0 12px 30px rgba(31,61,46,0.35)',
  popover: '0 16px 40px rgba(31,61,46,0.3)',
} as const

export const sizes = {
  headerHeight: 120,
  chipHeight: 36,
  buttonHeight: 56,
  fieldHeight: 48,
  plusButton: 52,
  minTouch: 44,
  tabBarFadeHeight: 116,
  listBottomPadding: 120,
} as const

/** Kremowe wyciszenie pod dolnym paskiem. */
export const tabBarFade = 'linear-gradient(180deg, transparent 0%, #F6F1E7 30%)'

/** Etykieta sekcji: 11 px, 800, WERSALIKI. */
export const sectionLabel = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
} as const
