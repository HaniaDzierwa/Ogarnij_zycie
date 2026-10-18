// Daty jako 'RRRR-MM-DD' (dzień lokalny, bez strefy czasowej) i polskie nazwy.

export type DateKey = string

export const MONTHS = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień',
]
export const MONTHS_GEN = [
  'stycznia',
  'lutego',
  'marca',
  'kwietnia',
  'maja',
  'czerwca',
  'lipca',
  'sierpnia',
  'września',
  'października',
  'listopada',
  'grudnia',
]
export const MONTHS_SHORT = [
  'STY',
  'LUT',
  'MAR',
  'KWI',
  'MAJ',
  'CZE',
  'LIP',
  'SIE',
  'WRZ',
  'PAŹ',
  'LIS',
  'GRU',
]
export const DAYS = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota']
export const DAYS_SHORT = ['ND', 'PN', 'WT', 'ŚR', 'CZ', 'PT', 'SO']

const pad = (n: number) => String(n).padStart(2, '0')

export function toKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseKey(k: DateKey): Date {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(k: DateKey, n: number): DateKey {
  const d = parseKey(k)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

/** Liczba dni od a do b (b − a). */
export function diffDays(a: DateKey, b: DateKey): number {
  return Math.round((parseKey(b).getTime() - parseKey(a).getTime()) / 86_400_000)
}

/** Poniedziałek tygodnia, w którym jest dany dzień. */
export function weekStart(k: DateKey): DateKey {
  const dow = parseKey(k).getDay()
  return addDays(k, dow === 0 ? -6 : 1 - dow)
}

/** „PIĄTEK · 9 PAŹDZIERNIKA” */
export function longDayLabel(k: DateKey): string {
  const d = parseKey(k)
  return `${DAYS[d.getDay()]} · ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`.toUpperCase()
}

/** „PIĄTEK 9 PAŹ” */
export function shortDayLabel(k: DateKey): string {
  const d = parseKey(k)
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`.toUpperCase()
}

/**
 * Termin zadania: „DZIŚ”, „JUTRO”, w ciągu tygodnia „WT 13 PAŹ”, dalej „DO 30 PAŹ”.
 * Termin w przeszłości: „PO TERMINIE”.
 */
export function dueLabel(due: DateKey, today: DateKey): string {
  const n = diffDays(today, due)
  if (n < 0) return 'PO TERMINIE'
  if (n === 0) return 'DZIŚ'
  if (n === 1) return 'JUTRO'
  const d = parseKey(due)
  if (n < 7) return `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
  return `DO ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

/** „dziś”, „jutro”, „za 7 dni” */
export function inDays(n: number): string {
  if (n === 0) return 'dziś'
  if (n === 1) return 'jutro'
  return `za ${n} dni`
}

const OVERRIDE_KEY = 'ogarnij:dzis'

/**
 * Dzisiejsza data. Na czas mockupu można ją podmienić parametrem `?dzis=RRRR-MM-DD`
 * (np. 2026-10-09 – dzień z projektu, do porównania zrzutów); `?dzis=` wraca do prawdziwej daty.
 */
export function today(): DateKey {
  try {
    const param = new URLSearchParams(window.location.search).get('dzis')
    if (param !== null) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(param)) sessionStorage.setItem(OVERRIDE_KEY, param)
      else sessionStorage.removeItem(OVERRIDE_KEY)
    }
    const saved = sessionStorage.getItem(OVERRIDE_KEY)
    if (saved) return saved
  } catch {
    // brak sessionStorage (np. tryb prywatny) – prawdziwa data
  }
  return toKey(new Date())
}

/** Dzień (6:00–18:00) czy noc (18:00–6:00). */
export function isDaytime(date = new Date()): boolean {
  const h = date.getHours()
  return h >= 6 && h < 18
}
