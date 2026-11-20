import { afterEach, expect, test } from 'vitest'
import { palette } from './tokens.ts'
import { eventTint, themed, tintBg } from './themed.ts'
import { resolveTheme, setThemeChoice, THEME_STORAGE_KEY, themeCss } from './theme.ts'

afterEach(() => setThemeChoice('system'))

test('motyw: systemowy idzie za telefonem, jasny i ciemny – zawsze swój', () => {
  expect(resolveTheme('system', true)).toBe('dark')
  expect(resolveTheme('system', false)).toBe('light')
  expect(resolveTheme('light', true)).toBe('light')
  expect(resolveTheme('dark', false)).toBe('dark')
})

test('każdy kolor palety ma wartość jasną i ciemną, oba trafiają do stylów', () => {
  const css = themeCss()
  for (const [k, [light, dark]] of Object.entries(palette)) {
    expect(css).toContain(`--c-${k}:${light};`)
    expect(css).toContain(`--c-${k}:${dark};`)
  }
  expect(css).toContain(':root[data-theme="dark"]{')
})

test('wybór motywu zmienia atrybut <html> i zostaje w pamięci telefonu', () => {
  setThemeChoice('dark')
  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  setThemeChoice('light')
  expect(document.documentElement.dataset.theme).toBe('light')
})

test('kolory z danych: jasny wariant bez zmian, ciemny wyliczony', () => {
  expect(themed('#111111', '#222222')).toBe(
    'color-mix(in srgb, #111111 var(--c-light, 100%), #222222)',
  )
  // jasne tło plakietki – jak dotąd (rozjaśnienie 0.82)
  expect(tintBg('#3F7A7A')).toContain('rgb(220, 231, 231)')
  const t = eventTint({ dot: '#A9CBE8', bg: '#DCE6EC', fg: '#2F5670' })
  expect(t.bg).toContain('#DCE6EC')
  expect(t.fg).toContain('#2F5670')
})
