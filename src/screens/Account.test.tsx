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

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })

test('Zaloguj się: puste pola pokazują błędy i nie przechodzą dalej', () => {
  const router = renderAt('/logowanie')
  fireEvent.click(screen.getByRole('button', { name: /Zaloguj się/ }))
  expect(screen.getByText('Wpisz poprawny adres e‑mail.')).toBeDefined()
  expect(screen.getByText('Wpisz hasło.')).toBeDefined()
  expect(router.state.location.pathname).toBe('/logowanie')
})

test('Zaloguj się: poprawne dane → Start', () => {
  const router = renderAt('/logowanie')
  type('E‑MAIL', 'hania@poczta.pl')
  type('HASŁO', 'tajne-haslo')
  fireEvent.click(screen.getByRole('button', { name: /Zaloguj się/ }))
  expect(router.state.location.pathname).toBe('/')
})

test('Hasło: „Pokaż” odsłania wpisane hasło', () => {
  renderAt('/logowanie')
  const input = screen.getByLabelText('HASŁO') as HTMLInputElement
  expect(input.type).toBe('password')
  fireEvent.click(screen.getByRole('button', { name: 'Pokaż hasło' }))
  expect(input.type).toBe('text')
})

test('Załóż konto: za krótkie hasło → błąd; poprawne → Pierwsze uruchomienie', () => {
  const router = renderAt('/rejestracja')
  type('E‑MAIL', 'hania@poczta.pl')
  type('HASŁO', 'krotkie')
  fireEvent.click(screen.getByRole('button', { name: /Załóż konto/ }))
  expect(screen.getByText('Hasło musi mieć co najmniej 8 znaków.')).toBeDefined()
  type('HASŁO', 'dlugie-haslo')
  fireEvent.click(screen.getByRole('button', { name: /Załóż konto/ }))
  expect(router.state.location.pathname).toBe('/witaj')
})

test('Nie pamiętam hasła: po wysłaniu pokazuje adres i powrót do logowania', () => {
  renderAt('/haslo')
  type('E‑MAIL', 'hania@poczta.pl')
  fireEvent.click(screen.getByRole('button', { name: 'Wyślij link' }))
  expect(screen.getByRole('status').textContent).toContain('hania@poczta.pl')
  expect(screen.getByRole('link', { name: 'Wróć do logowania' })).toBeDefined()
})
