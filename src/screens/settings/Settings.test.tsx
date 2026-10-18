import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, expect, test } from 'vitest'
import { routes } from '../../app/router.tsx'
import { MockStoreProvider } from '../../data/MockStore.tsx'

afterEach(cleanup)

function renderAt(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] })
  render(
    <MockStoreProvider today="2026-10-09">
      <RouterProvider router={router} />
    </MockStoreProvider>,
  )
  return router
}

test('Ustawienia: sekcje z projektu, bez Wyglądu (tylko jasny motyw), teksty o Firebase', () => {
  renderAt('/ustawienia')
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Po swojemu')
  for (const s of ['TY', 'WSPÓLNY DOM', 'PORZĄDKI', 'POWIADOMIENIA']) {
    expect(screen.getByText(s)).toBeDefined()
  }
  expect(screen.queryByText('WYGLĄD')).toBeNull()
  expect(screen.getByText('KRZYŚ · DZIŚ 13:05')).toBeDefined()
  expect(screen.getByText('Dane w Firebase – widzą je tylko domownicy')).toBeDefined()
  expect(screen.getByText('5 ELEMENTÓW · ZADANIA I WYDARZENIA')).toBeDefined()
})

test('imię zmienia powitanie i trafia na Start', () => {
  const router = renderAt('/ustawienia')
  fireEvent.change(screen.getByLabelText('IMIĘ LUB PSEUDONIM'), { target: { value: 'Mama' } })
  expect(screen.getByText('„Dzień dobry, Mama”')).toBeDefined()
  fireEvent.click(screen.getByRole('link', { name: 'Start' }))
  expect(router.state.location.pathname).toBe('/')
  expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Mama')
})

test('sprzątanie ogarniętych i powiadomienia się przełączają', () => {
  renderAt('/ustawienia')
  expect(screen.getByRole('radio', { name: 'Po 30 dniach' }).getAttribute('aria-checked')).toBe(
    'true',
  )
  fireEvent.click(screen.getByRole('radio', { name: 'Nigdy' }))
  expect(screen.getByText('Ogarnięte zostają, dopóki ich nie wyczyścisz.')).toBeDefined()
  const house = screen.getByRole('switch', { name: /Zmiany od domowników/ })
  expect(house.getAttribute('aria-checked')).toBe('false')
  fireEvent.click(house)
  expect(house.getAttribute('aria-checked')).toBe('true')
})

test('Porządki → Kosz i Wspólny dom → Domownicy', () => {
  const router = renderAt('/ustawienia')
  fireEvent.click(screen.getByRole('link', { name: /Kosz/ }))
  expect(router.state.location.pathname).toBe('/ustawienia/kosz')
  fireEvent.click(screen.getByRole('link', { name: /USTAWIENIA/ }))
  fireEvent.click(screen.getByRole('link', { name: /Domownicy i synchronizacja/ }))
  expect(router.state.location.pathname).toBe('/ustawienia/domownicy')
})
