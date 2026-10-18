import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, expect, test } from 'vitest'
import { routes } from '../app/router.tsx'
import { MockStoreProvider } from '../data/MockStore.tsx'
import { MemoryAuthProvider } from '../auth/MemoryAuthProvider.tsx'
import { plural } from '../data/plural.ts'

afterEach(cleanup)

function renderAt(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] })
  render(
    <MemoryAuthProvider>
      <MockStoreProvider today="2026-10-09">
        <RouterProvider router={router} />
      </MockStoreProvider>
    </MemoryAuthProvider>,
  )
  return router
}

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

test('Pilne: najbliższe terminy – hydraulik DZIŚ, recepta JUTRO', () => {
  renderAt('/?pora=dzien')
  const section = screen.getByRole('heading', { name: 'Pilne' }).closest('section')!
  const rows = within(section).getAllByRole('link').slice(1)
  expect(rows.map((r) => r.textContent)).toEqual([
    'Zadzwonić do hydraulika – cieknący kranDOMDZIŚ',
    'Wykupić receptęZDROWIEJUTRO',
  ])
})

test('Najbliższe wydarzenia: dwa najbliższe, klik otwiera Kalendarz z dniem', () => {
  const router = renderAt('/?pora=dzien')
  const section = screen.getByRole('heading', { name: 'Najbliższe wydarzenia' }).closest('section')!
  const rows = within(section).getAllByRole('link').slice(1)
  expect(rows).toHaveLength(2)
  expect(rows[0].textContent).toContain('Kino z Krzysiem')
  expect(rows[0].textContent).toContain('jutro')
  fireEvent.click(rows[0])
  expect(router.state.location.search).toBe('?dzien=2026-10-10')
})
