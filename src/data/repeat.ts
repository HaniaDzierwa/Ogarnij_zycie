// Powtarzanie zadań i wydarzeń (etap 8). Bez zależności – używa go też Worker powiadomień.
// Daty to tekst 'RRRR-MM-DD'; liczymy w UTC, żeby zmiana czasu nie przesuwała dni.

export type RepeatEvery = 'day' | 'week' | 'month' | 'year' | 'days'

/** Jak często: `n` tylko przy „Co X dni” (2–365). */
export type Repeat = { every: RepeatEvery; n?: number }

export const REPEAT_MIN_DAYS = 2
export const REPEAT_MAX_DAYS = 365

/** Kolejność przycisków w arkuszu (null = „Nie powtarzaj”). */
export const REPEAT_CHOICES: { id: RepeatEvery | null; name: string }[] = [
  { id: null, name: 'Nie powtarzaj' },
  { id: 'day', name: 'Codziennie' },
  { id: 'week', name: 'Co tydzień' },
  { id: 'month', name: 'Co miesiąc' },
  { id: 'year', name: 'Co rok' },
  { id: 'days', name: 'Co X dni' },
]

const EVERY: RepeatEvery[] = ['day', 'week', 'month', 'year', 'days']
const DAY_MS = 86_400_000

const DAYS_ACC = [
  'w niedzielę',
  'w poniedziałek',
  'we wtorek',
  'w środę',
  'w czwartek',
  'w piątek',
  'w sobotę',
]
const DAYS_SHORT = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'so']
const MONTHS_GEN = [
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
const MONTHS_SHORT = [
  'sty',
  'lut',
  'mar',
  'kwi',
  'maj',
  'cze',
  'lip',
  'sie',
  'wrz',
  'paź',
  'lis',
  'gru',
]

const toMs = (k: string) => Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10))
const fromMs = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const clampDays = (n: number) => Math.max(REPEAT_MIN_DAYS, Math.min(REPEAT_MAX_DAYS, Math.round(n)))

/** Krok w dniach dla day / week / days; null dla month / year. */
function stepDays(r: Repeat): number | null {
  if (r.every === 'day') return 1
  if (r.every === 'week') return 7
  if (r.every === 'days') return clampDays(r.n ?? REPEAT_MIN_DAYS)
  return null
}

/**
 * k-ta powtórka od `start` (k = 0 to sam start). Miesiąc / rok liczone zawsze od startu:
 * 31 stycznia → 28 lutego → 31 marca (krótszy miesiąc – ostatni dzień).
 */
export function nthDate(start: string, r: Repeat, k: number): string {
  const step = stepDays(r)
  if (step !== null) return fromMs(toMs(start) + step * k * DAY_MS)
  const y = +start.slice(0, 4)
  const m = +start.slice(5, 7) - 1
  const d = +start.slice(8, 10)
  const ty = r.every === 'year' ? y + k : y
  const tm = r.every === 'month' ? m + k : m
  const last = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate()
  return fromMs(Date.UTC(ty, tm, Math.min(d, last)))
}

/** Numer pierwszej powtórki ≥ `day` (przybliżenie od dołu – potem dociągamy pętlą). */
function firstIndexFrom(start: string, r: Repeat, day: string): number {
  if (day <= start) return 0
  const step = stepDays(r)
  const diff = (toMs(day) - toMs(start)) / DAY_MS
  let k: number
  if (step !== null) k = Math.ceil(diff / step)
  else {
    const months =
      (+day.slice(0, 4) - +start.slice(0, 4)) * 12 + (+day.slice(5, 7) - +start.slice(5, 7))
    k = Math.max(0, r.every === 'year' ? Math.floor(months / 12) : months - 1)
  }
  while (k > 0 && nthDate(start, r, k - 1) >= day) k--
  while (nthDate(start, r, k) < day) k++
  return k
}

/** Pierwsza powtórka później niż `after` (i zawsze po `start`) – kolejny termin zadania. */
export function nextAfter(start: string, r: Repeat, after: string): string {
  const from = fromMs(toMs(after > start ? after : start) + DAY_MS)
  return nthDate(start, r, firstIndexFrom(start, r, from))
}

/** Powtórki z przedziału [from, to] (włącznie), bez pominiętych. */
export function occurrencesBetween(
  start: string,
  r: Repeat,
  from: string,
  to: string,
  skip: readonly string[] = [],
  limit = 400,
): string[] {
  const out: string[] = []
  if (to < start || to < from) return out
  for (let k = firstIndexFrom(start, r, from); out.length < limit; k++) {
    const day = nthDate(start, r, k)
    if (day > to) break
    if (!skip.includes(day)) out.push(day)
  }
  return out
}

/** Czy wydarzenie (start + powtarzanie) wypada danego dnia. */
export function occursOn(
  start: string,
  r: Repeat | null | undefined,
  day: string,
  skip: readonly string[] = [],
): boolean {
  if (!r) return start === day
  return occurrencesBetween(start, r, day, day, skip, 1).length === 1
}

/** Pole z bazy → Repeat albo null (nieznane / uszkodzone = bez powtarzania). */
export function normalizeRepeat(x: unknown): Repeat | null {
  if (!x || typeof x !== 'object') return null
  const { every, n } = x as { every?: unknown; n?: unknown }
  if (!EVERY.includes(every as RepeatEvery)) return null
  if (every === 'days') return { every, n: clampDays(typeof n === 'number' ? n : REPEAT_MIN_DAYS) }
  return { every: every as RepeatEvery }
}

/** Do zapisu w bazie: tylko potrzebne pola. */
export const repeatDoc = (r: Repeat): Repeat =>
  r.every === 'days' ? { every: 'days', n: clampDays(r.n ?? REPEAT_MIN_DAYS) } : { every: r.every }

/** Krótko: „Co tydzień”, „Co 3 dni”. */
export function repeatName(r: Repeat): string {
  if (r.every === 'days') return `Co ${clampDays(r.n ?? REPEAT_MIN_DAYS)} dni`
  return REPEAT_CHOICES.find((c) => c.id === r.every)!.name
}

/** Plakietka na liście i w kalendarzu: „CO TYDZIEŃ”. */
export const repeatBadge = (r: Repeat) => repeatName(r).toUpperCase()

/** Dokładnie: „Co tydzień w piątek”, „Co miesiąc, 2. dnia”, „Co rok, 2 grudnia”. */
export function repeatSummary(r: Repeat, start: string): string {
  const d = new Date(toMs(start))
  if (r.every === 'week') return `Co tydzień ${DAYS_ACC[d.getUTCDay()]}`
  if (r.every === 'month') return `Co miesiąc, ${d.getUTCDate()}. dnia`
  if (r.every === 'year') return `Co rok, ${d.getUTCDate()} ${MONTHS_GEN[d.getUTCMonth()]}`
  return repeatName(r)
}

/** Data krótko: „pt 27 lis”; przy „co rok” – „2 gru 2027”. */
function shortDate(day: string, withYear: boolean): string {
  const d = new Date(toMs(day))
  const dm = `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`
  return withYear ? `${dm} ${d.getUTCFullYear()}` : `${DAYS_SHORT[d.getUTCDay()]} ${dm}`
}

/** Linijka pod wyborem: „Co tydzień w piątek. Kolejne: pt 4 gru, pt 11 gru…” */
export function repeatHint(r: Repeat, start: string): string {
  const next = [1, 2].map((k) => shortDate(nthDate(start, r, k), r.every === 'year'))
  return `${repeatSummary(r, start)}. Kolejne: ${next.join(', ')}…`
}
