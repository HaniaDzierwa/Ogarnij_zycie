import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, expect, test } from 'vitest'
import { routes } from '../app/router.tsx'
import { MockStoreProvider } from '../data/MockStore.tsx'

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

test('Ładowanie: dotknięcie prowadzi do logowania', () => {
  const router = renderAt('/ladowanie?pora=noc')
  fireEvent.click(screen.getByRole('button', { name: /wczytywanie/ }))
  expect(router.state.location.pathname).toBe('/logowanie')
})

test('Pierwsze uruchomienie: imię w podglądzie powitania, „Zaczynamy” → Start', () => {
  const router = renderAt('/witaj')
  fireEvent.change(screen.getByLabelText('JAK MASZ NA IMIĘ?'), { target: { value: 'Ola' } })
  expect(screen.getByText('„Dzień dobry, Ola”')).toBeDefined()
  fireEvent.click(screen.getByRole('button', { name: /Zaczynamy/ }))
  expect(router.state.location.pathname).toBe('/')
})

test('Pierwsze uruchomienie: odznaczenie „Załóż nowy dom” chowa imię i „Zaczynamy”', () => {
  renderAt('/witaj')
  fireEvent.click(screen.getByRole('button', { name: /Załóż nowy dom/ }))
  expect(screen.queryByLabelText('JAK MASZ NA IMIĘ?')).toBeNull()
  expect(screen.queryByRole('button', { name: /Zaczynamy/ })).toBeNull()
})

test('Pierwsze uruchomienie: teksty z TEKSTY.md (#1, #2)', () => {
  renderAt('/witaj')
  expect(screen.getByText('Dane Waszego domu widzą tylko domownicy.')).toBeDefined()
  expect(screen.getByText('Ktoś Cię zaprosił – zeskanujesz kod albo otworzysz link.')).toBeDefined()
})
