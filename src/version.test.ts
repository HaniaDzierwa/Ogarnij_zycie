import { describe, expect, test } from 'vitest'
import { versionLabel } from './version.ts'

describe('numer wersji', () => {
  test('1.<etap> i data budowania po polsku', () => {
    expect(versionLabel('1.9.0', '2026-11-20')).toBe('ogarnij życie · wersja 1.9 · 20 lis 2026')
    expect(versionLabel('1.9.2', '2026-12-03')).toBe('ogarnij życie · wersja 1.9.2 · 3 gru 2026')
    expect(versionLabel('1.10.0')).toBe('ogarnij życie · wersja 1.10')
  })
})
