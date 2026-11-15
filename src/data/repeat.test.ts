import { describe, expect, it } from 'vitest'
import {
  nextAfter,
  normalizeRepeat,
  nthDate,
  occurrencesBetween,
  occursOn,
  repeatBadge,
  repeatDoc,
  repeatHint,
  repeatSummary,
} from './repeat.ts'

describe('nthDate', () => {
  it('codziennie, co tydzień, co X dni', () => {
    expect(nthDate('2026-11-18', { every: 'day' }, 14)).toBe('2026-12-02')
    expect(nthDate('2026-11-20', { every: 'week' }, 2)).toBe('2026-12-04')
    expect(nthDate('2026-11-18', { every: 'days', n: 3 }, 3)).toBe('2026-11-27')
  })

  it('co miesiąc – 31. dnia w krótszym miesiącu ostatni dzień, potem znowu 31.', () => {
    const r = { every: 'month' } as const
    expect(nthDate('2027-01-31', r, 1)).toBe('2027-02-28')
    expect(nthDate('2027-01-31', r, 2)).toBe('2027-03-31')
    expect(nthDate('2027-01-31', r, 3)).toBe('2027-04-30')
    expect(nthDate('2026-11-15', r, 2)).toBe('2027-01-15')
  })

  it('co rok – 29 lutego w zwykłym roku to 28 lutego', () => {
    expect(nthDate('2028-02-29', { every: 'year' }, 1)).toBe('2029-02-28')
    expect(nthDate('2028-02-29', { every: 'year' }, 4)).toBe('2032-02-29')
  })

  it('zmiana czasu nie przesuwa dni', () => {
    expect(nthDate('2026-10-20', { every: 'week' }, 1)).toBe('2026-10-27')
    expect(nthDate('2027-03-25', { every: 'day' }, 5)).toBe('2027-03-30')
  })
})

describe('nextAfter – kolejny termin zadania (liczony od terminu)', () => {
  it('ogarnięte na czas – następny termin za jeden krok', () => {
    expect(nextAfter('2026-11-20', { every: 'week' }, '2026-11-20')).toBe('2026-11-27')
    expect(nextAfter('2026-11-20', { every: 'week' }, '2026-11-18')).toBe('2026-11-27')
  })

  it('spóźnione – pierwszy termin po dziś, bez zaległych', () => {
    expect(nextAfter('2026-11-02', { every: 'week' }, '2026-11-18')).toBe('2026-11-23')
    expect(nextAfter('2026-11-16', { every: 'day' }, '2026-11-18')).toBe('2026-11-19')
  })

  it('co X dni – od terminu, nie od ogarnięcia', () => {
    expect(nextAfter('2026-11-18', { every: 'days', n: 3 }, '2026-11-19')).toBe('2026-11-21')
    expect(nextAfter('2026-11-18', { every: 'days', n: 3 }, '2026-11-21')).toBe('2026-11-24')
  })

  it('co miesiąc i co rok', () => {
    expect(nextAfter('2026-01-31', { every: 'month' }, '2026-02-10')).toBe('2026-02-28')
    expect(nextAfter('2026-12-02', { every: 'year' }, '2026-12-02')).toBe('2027-12-02')
    expect(nextAfter('2020-12-02', { every: 'year' }, '2026-11-18')).toBe('2026-12-02')
  })
})

describe('powtórki w przedziale', () => {
  it('co tydzień w miesiącu, bez pominiętych', () => {
    expect(
      occurrencesBetween('2026-11-04', { every: 'week' }, '2026-11-15', '2026-12-10', [
        '2026-11-25',
      ]),
    ).toEqual(['2026-11-18', '2026-12-02', '2026-12-09'])
  })

  it('nic przed startem', () => {
    expect(occurrencesBetween('2026-12-02', { every: 'year' }, '2026-01-01', '2026-11-30')).toEqual(
      [],
    )
    expect(occurrencesBetween('2026-12-02', { every: 'day' }, '2026-11-28', '2026-12-03')).toEqual([
      '2026-12-02',
      '2026-12-03',
    ])
  })

  it('urodziny po latach', () => {
    expect(occurrencesBetween('1990-05-17', { every: 'year' }, '2027-01-01', '2027-12-31')).toEqual(
      ['2027-05-17'],
    )
  })

  it('occursOn', () => {
    expect(occursOn('2026-11-20', { every: 'week' }, '2026-12-04')).toBe(true)
    expect(occursOn('2026-11-20', { every: 'week' }, '2026-12-05')).toBe(false)
    expect(occursOn('2026-11-20', { every: 'week' }, '2026-12-04', ['2026-12-04'])).toBe(false)
    expect(occursOn('2026-11-20', null, '2026-11-20')).toBe(true)
    expect(occursOn('2026-11-20', { every: 'day' }, '2026-11-19')).toBe(false)
  })
})

describe('pole z bazy', () => {
  it('normalizeRepeat odrzuca śmieci i pilnuje zakresu dni', () => {
    expect(normalizeRepeat(undefined)).toBeNull()
    expect(normalizeRepeat({ every: 'hourly' })).toBeNull()
    expect(normalizeRepeat({ every: 'week', n: 4 })).toEqual({ every: 'week' })
    expect(normalizeRepeat({ every: 'days', n: 1 })).toEqual({ every: 'days', n: 2 })
    expect(normalizeRepeat({ every: 'days', n: 900 })).toEqual({ every: 'days', n: 365 })
    expect(repeatDoc({ every: 'month', n: 5 })).toEqual({ every: 'month' })
  })
})

describe('napisy', () => {
  it('plakietka, opis i podpowiedź', () => {
    expect(repeatBadge({ every: 'days', n: 3 })).toBe('CO 3 DNI')
    expect(repeatBadge({ every: 'week' })).toBe('CO TYDZIEŃ')
    expect(repeatSummary({ every: 'week' }, '2026-11-20')).toBe('Co tydzień w piątek')
    expect(repeatSummary({ every: 'month' }, '2026-12-02')).toBe('Co miesiąc, 2. dnia')
    expect(repeatSummary({ every: 'year' }, '2026-12-02')).toBe('Co rok, 2 grudnia')
    expect(repeatHint({ every: 'week' }, '2026-11-20')).toBe(
      'Co tydzień w piątek. Kolejne: pt 27 lis, pt 4 gru…',
    )
    expect(repeatHint({ every: 'year' }, '2026-12-02')).toBe(
      'Co rok, 2 grudnia. Kolejne: 2 gru 2027, 2 gru 2028…',
    )
  })
})
