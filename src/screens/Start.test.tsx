import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { renderApp } from '../test/renderApp.tsx'
import { plural } from '../data/plural.ts'

afterEach(cleanup)

const renderAt = (url: string) => renderApp(url)

test('odmiana: 1 wpis, 3 wpisy, 5 wpisów, 22 wpisy, 12 wpisów', () => {
  const f = ['wpis', 'wpisy', 'wpisów'] as [string, string, string]
  expect([1, 3, 5, 22, 12].map((n) => plural(n, f))).toEqual([
    'wpis',
    'wpisy',
    'wpisów',
    'wpisy',
    'wpisów',
  ])
})

test('Start w dzień: data i powitanie jak w projekcie', () => {
  renderAt('/?pora=dzien')
  expect(screen.getByText('PIĄTEK · 9 PAŹDZIERNIKA')).toBeDefined()
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Dzień dobry, Hania')
})

test('Start w nocy: „Dobry wieczór”', () => {
  renderAt('/?pora=noc')
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Dobry wieczór, Hania')
})

test('kafelki: 12 do zrobienia w 6 kategoriach, 4 pilne, 3 w tym tygodniu', () => {
  renderAt('/?pora=dzien')
  const tile = (label: string) => screen.getByText(label).closest('a')!
  expect(tile('DO ZROBIENIA').textContent).toContain('12')
  expect(tile('DO ZROBIENIA').textContent).toContain('w 6 kategoriach')
  expect(tile('PILNE').textContent).toContain('4')
  expect(tile('W TYM TYGODNIU').textContent).toContain('3')
  expect(tile('W TYM TYGODNIU').textContent).toContain('wpisy w kalendarzu')
})

test('kafelek „Pilne” otwiera Zadania z filtrem Pilne', () => {
  const router = renderAt('/?pora=dzien')
  fireEvent.click(screen.getByText('PILNE').closest('a')!)
  expect(router.state.location.search).toBe('?pokaz=pilne')
})

const section = (name: string) => screen.getByRole('heading', { name }).closest('section')!
/** Wiersze sekcji: przyciski otwierające arkusz (bez kwadracików i ukrytych akcji gestów). */
const rows = (name: string) =>
  within(section(name))
    .getAllByRole('button')
    .filter(
      (b) => !/^(Ogarnij|Przenieś do kosza): /.test(b.getAttribute('aria-label') ?? b.textContent!),
    )

test('Pilne: najbliższe terminy – hydraulik DZIŚ, recepta JUTRO', () => {
  renderAt('/?pora=dzien')
  expect(rows('Pilne').map((r) => r.textContent)).toEqual([
    'Zadzwonić do hydraulika – cieknący kranDOMDZIŚ',
    'Wykupić receptęZDROWIEJUTRO',
  ])
})

test('Pilne: dotknięcie otwiera arkusz zadania, kwadracik ogarnia z „Cofnij”', () => {
  renderAt('/?pora=dzien')
  fireEvent.click(rows('Pilne')[1])
  const sheet = screen.getByRole('dialog', { name: 'Zadanie' })
  expect(within(sheet).getByText('DO ZROBIENIA · ZDROWIE')).toBeDefined()
  fireEvent.click(within(sheet).getAllByRole('button', { name: 'Gotowe' })[0])

  fireEvent.click(screen.getByRole('button', { name: 'Ogarnij: Wykupić receptę' }))
  expect(screen.getByRole('status').textContent).toContain('Ogarnięte: Wykupić receptę')
  expect(section('Pilne').textContent).not.toContain('Wykupić receptę')
  fireEvent.click(screen.getByRole('button', { name: 'COFNIJ' }))
  expect(section('Pilne').textContent).toContain('Wykupić receptę')
})

test('Pilne: przeciągnięcie w lewo pyta i przenosi do kosza', () => {
  renderAt('/?pora=dzien')
  fireEvent.click(screen.getByRole('button', { name: 'Przenieś do kosza: Wykupić receptę' }))
  const ask = screen.getByRole('alertdialog', { name: 'Usunąć zadanie?' })
  fireEvent.click(within(ask).getByRole('button', { name: 'Usuń' }))
  expect(screen.getByRole('status').textContent).toContain('Przeniesiono do kosza: Wykupić receptę')
})

test('Najbliższe wydarzenia: dwa najbliższe; dotknięcie – arkusz wydarzenia z edycją', () => {
  renderAt('/?pora=dzien')
  const ev = rows('Najbliższe wydarzenia')
  expect(ev).toHaveLength(2)
  expect(ev[0].textContent).toContain('Kino z Krzysiem')
  expect(ev[0].textContent).toContain('jutro')
  fireEvent.click(ev[0])
  const sheet = screen.getByRole('dialog', { name: 'Wydarzenie' })
  fireEvent.change(within(sheet).getByLabelText('Nazwa wydarzenia'), {
    target: { value: 'Kino z Krzysiem i Olą' },
  })
  fireEvent.click(within(sheet).getAllByRole('button', { name: 'Gotowe' })[0])
  expect(section('Najbliższe wydarzenia').textContent).toContain('Kino z Krzysiem i Olą')
})

test('Najbliższe wydarzenia: w lewo – pytanie i do kosza; na liście pojawia się następne', () => {
  renderAt('/?pora=dzien')
  fireEvent.click(screen.getByRole('button', { name: 'Przenieś do kosza: Kino z Krzysiem' }))
  const ask = screen.getByRole('alertdialog', { name: 'Usunąć wydarzenie?' })
  fireEvent.click(within(ask).getByRole('button', { name: 'Usuń' }))
  const ev = rows('Najbliższe wydarzenia')
  expect(ev[0].textContent).toContain('Zebranie w szkole')
  expect(screen.getByRole('status').textContent).toContain('Przeniesiono do kosza: Kino z Krzysiem')
})

test('rodzaje wydarzeń jeszcze nie wczytane (zaraz po zalogowaniu) – Start, Kalendarz i Kosz się nie wywracają', () => {
  renderApp('/?pora=dzien', { noEventTypes: true })
  expect(section('Najbliższe wydarzenia').textContent).toContain('Kino z Krzysiem')
  cleanup()
  renderApp('/kalendarz?dzien=2026-10-10', { noEventTypes: true })
  expect(screen.getByText('Kino z Krzysiem')).toBeDefined()
  cleanup()
  renderApp('/ustawienia/kosz', { noEventTypes: true })
  expect(screen.getByText('Basen z dziećmi')).toBeDefined()
})

test('dane domu jeszcze się wczytują – ekran ładowania zamiast pustych list', () => {
  renderApp('/', { notReady: true })
  expect(screen.getByRole('button', { name: 'Ogarnij życie – wczytywanie' })).toBeDefined()
  expect(screen.queryByText('DO ZROBIENIA')).toBeNull()
})
