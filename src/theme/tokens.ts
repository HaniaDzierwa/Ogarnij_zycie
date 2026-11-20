// Tokeny wyglądu z docs/DESIGN.md (wartości sprawdzone z docs/design/ekrany/).
//
// Motyw jasny / ciemny (decyzja Hani 2026-11-20, kanwa „Motyw jasny i ciemny”): kolory, które
// zmieniają się z motywem, są zmiennymi CSS (`var(--c-…)`); wartości obu motywów – w `palette`
// poniżej, style wstawia `installTheme()` (theme.ts). Ciemny „odwraca” role: green900 to kolor
// tekstu (w ciemnym kremowy), cream – tło ekranu (w ciemnym prawie czarna zieleń), white – karta.
// Dzięki temu główny przycisk (tło green900, napis cream) sam robi się jasny z ciemnym napisem.

/** Wartości kolorów zmiennych w obu motywach: [jasny, ciemny]. */
export const palette = {
  green900: ['#1F3D2E', '#ECE5D6'],
  green800: ['#2C5240', '#D9D1C0'],
  green700: ['#3A6650', '#C2BBAA'],
  brass300: ['#E8C98E', '#7A5C2C'],
  brass500: ['#B8925A', '#C9A464'],
  brass700: ['#7A5C2C', '#DDBB7D'],
  brass800: ['#5C4420', '#E8C98E'], // link po najechaniu
  cream: ['#F6F1E7', '#101A15'],
  creamLight: ['#FFFCF6', '#16221C'], // arkusze (bottom sheet), menu „Co dodajesz?”
  white: ['#FFFFFF', '#18251E'],
  line: ['#EFE8DA', '#24342B'],
  border: ['#D9D0BE', '#3A4D42'],
  borderSoft: ['#E3DCCD', '#2E3F35'],
  sand: ['#EDE6D8', '#22322A'],
  muted: ['#5E6D63', '#A2B3A8'],
  muted2: ['#4F5B53', '#BAC7BE'],
  muted3: ['#7A8A80', '#8A9A90'], // skróty dni tygodnia w kalendarzu
  success: ['#3F8A5E', '#6DBB8E'],
  successBg: ['#DDE8DF', '#1F3328'],
  successText: ['#2F5A43', '#9FD3B4'],
  danger: ['#A4492F', '#E58E73'],
  /** Napis na pełnej czerwieni (plakietka „po terminie”, przycisk „Usuń”). */
  onDanger: ['#FFFFFF', '#13201A'],
  highLine: ['#A4492F', '#E58E73'],
  highBg: ['#F3DCD3', '#3D2420'],
  highFg: ['#8C3D27', '#F1B3A0'],
  midLine: ['#B8925A', '#C9A464'],
  midBg: ['#EFE3CC', '#382D1C'],
  midFg: ['#6E5220', '#E9CC92'],
  lowLine: ['#9AA59D', '#6E8276'],
  lowBg: ['#E6E8E3', '#25302A'],
  lowFg: ['#4F5B53', '#BAC7BE'],
  shadowCard: ['0 6px 20px rgba(31,61,46,0.07)', '0 6px 20px rgba(0,0,0,0.35)'],
  shadowTabBar: ['0 12px 30px rgba(31,61,46,0.35)', '0 12px 30px rgba(0,0,0,0.5)'],
  shadowPopover: ['0 16px 40px rgba(31,61,46,0.3)', '0 16px 40px rgba(0,0,0,0.5)'],
  scrollThumb: ['rgba(31,61,46,0.22)', 'rgba(236,229,214,0.22)'],
  /** Wybrana opcja w przełączniku (Sprzątanie, Motyw). */
  segOn: ['#FFFFFF', '#33463B'],
  /** Zasłona pod arkuszem / oknem. */
  overlay: ['rgba(31,61,46,0.5)', 'rgba(0,0,0,0.55)'],
} as const

export type PaletteKey = keyof typeof palette

/** Ciemne tło karty – baza do przyciemniania kolorów z danych (themed.ts). */
export const DARK_CARD = palette.white[1]
/** Jasny tekst ciemnego motywu – baza do rozjaśniania kolorów z danych. */
export const DARK_INK = palette.green900[1]

const v = (k: PaletteKey) => `var(--c-${k})`

export const colors = {
  green900: v('green900'),
  green800: v('green800'),
  green700: v('green700'),
  brass300: v('brass300'),
  brass500: v('brass500'),
  brass700: v('brass700'),
  brass800: v('brass800'),
  cream: v('cream'),
  creamLight: v('creamLight'),
  white: v('white'),
  line: v('line'),
  border: v('border'),
  borderSoft: v('borderSoft'),
  sand: v('sand'),
  muted: v('muted'),
  muted2: v('muted2'),
  muted3: v('muted3'),
  success: v('success'),
  successBg: v('successBg'),
  successText: v('successText'),
  danger: v('danger'),
  onDanger: v('onDanger'),
  overlay: v('overlay'),
  segOn: v('segOn'),
  // ── Stałe w obu motywach (zwykłe '#…' – działają też w atrybutach SVG) ──
  /** Ciemnozielone powierzchnie, które zostają zielone też w ciemnym: nagłówek, pasek COFNIJ. */
  header: '#1F3D2E',
  /** Napis na `header`. */
  onHeader: '#F6F1E7',
  /** Mosiężny akcent na `header` (etykieta, wyróżnione słowo tytułu). */
  headerAccent: '#E8C98E',
  /** Dachy w nagłówku (dalsze / bliższe). */
  headerRoofFar: '#2C5240',
  headerRoofNear: '#3A6650',
  onDarkMuted: '#C7D8CD',
  onDarkMuted2: '#A9C2B2',
  onDarkMuted3: '#D6E4DA',
  onlineDot: '#9FD3B4',
  /** Biel na zdjęciu / czarnym tle podglądu zdjęć. */
  onPhoto: '#FFFFFF',
} as const

/** Nagłówek w wersji dziennej (Start, Ładowanie 6:00–18:00). */
export const dayHeader = {
  bg: '#D9E7DC',
  sun: '#E8B65C',
  roofsFar: '#A9C6B1',
  roofsNear: '#7FA98C',
} as const

/** Trzy wbudowane priorytety – zawsze są, nie da się ich usunąć. */
export type BuiltInPriority = 'high' | 'mid' | 'low'

/** Id priorytetu zadania: wbudowany albo własny (z bazy domu). */
export type Priority = string

export const priorities: Record<
  BuiltInPriority,
  { label: string; line: string; bg: string; fg: string; order: number }
> = {
  high: { label: 'Pilne', line: v('highLine'), bg: v('highBg'), fg: v('highFg'), order: 10 },
  mid: { label: 'Ważne', line: v('midLine'), bg: v('midBg'), fg: v('midFg'), order: 20 },
  low: { label: 'Przy okazji', line: v('lowLine'), bg: v('lowBg'), fg: v('lowFg'), order: 30 },
}

/** Priorytet nowego zadania i zastępczy (nieznany id). */
export const DEFAULT_PRIORITY: BuiltInPriority = 'mid'

/** Rozjaśnienie (f > 0) albo przyciemnienie (f < 0) koloru '#RRGGBB'. */
export function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16)
  const mix = (c: number) => Math.round(f > 0 ? c + (255 - c) * f : c * (1 + f))
  return `rgb(${mix(n >> 16)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`
}

/**
 * Plakietka terminu – obwódka + zegar, jedna skala (decyzja Hani 2026-11-15):
 * dalszy termin → beżowa obwódka, jutro / sobota przy „W TYM TYG.” → złota,
 * dziś / „KONIEC TYG.” → czerwona, po terminie → pełna czerwień.
 * Obwódka (nie wypełnienie), żeby nie mylić z plakietką priorytetu.
 */
export const dueBadgeColors = {
  far: { border: v('border'), bg: 'transparent', fg: v('brass700') },
  soon: { border: v('midLine'), bg: 'transparent', fg: v('midFg') },
  today: { border: v('highLine'), bg: 'transparent', fg: v('highFg') },
  late: { border: v('danger'), bg: v('danger'), fg: v('onDanger') },
} as const

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
    icon: 'deadline',
    system: true,
  },
  {
    id: 'birthday',
    name: 'Urodziny',
    dot: '#F2B8CF',
    bg: '#F5DDE6',
    fg: '#7D2953',
    icon: 'bday',
    system: false,
  },
  {
    id: 'party',
    name: 'Impreza',
    dot: '#CDB8F0',
    bg: '#E4E0EC',
    fg: '#553A7C',
    icon: 'party',
    system: false,
  },
  {
    id: 'event',
    name: 'Wydarzenie',
    dot: '#A9CBE8',
    bg: '#DCE6EC',
    fg: '#2F5670',
    icon: 'event',
    system: false,
  },
  {
    id: 'doctor',
    name: 'Lekarz',
    dot: '#9FD3B4',
    bg: '#DDE8DF',
    fg: '#2F5A43',
    icon: 'custom',
    system: false,
  },
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
  card: v('shadowCard'),
  tabBar: v('shadowTabBar'),
  popover: v('shadowPopover'),
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
export const tabBarFade = `linear-gradient(180deg, transparent 0%, ${v('cream')} 30%)`

/** Etykieta sekcji: 11 px, 800, WERSALIKI. */
export const sectionLabel = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
} as const
