import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, expect, test } from 'vitest'
import { routes } from '../app/router.tsx'
import { MockStoreProvider } from '../data/MockStore.tsx'
import { MemoryAuthProvider } from '../auth/MemoryAuthProvider.tsx'

afterEach(cleanup)

function renderAt(url: string, auth: { signedOut?: boolean; failWith?: string } = {}) {
  const router = createMemoryRouter(routes, { initialEntries: [url] })
  render(
    <MemoryAuthProvider {...auth}>
      <MockStoreProvider today="2026-10-09">
        <RouterProvider router={router} />
      </MockStoreProvider>
    </MemoryAuthProvider>,
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

test('Zaloguj się: poprawne dane → Start', async () => {
  const router = renderAt('/logowanie', { signedOut: true })
  type('E‑MAIL', 'hania@poczta.pl')
  type('HASŁO', 'tajne-haslo')
  fireEvent.click(screen.getByRole('button', { name: /Zaloguj się/ }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/'))
})

test('Zaloguj się: złe hasło → komunikat po polsku przy haśle', async () => {
  const router = renderAt('/logowanie', { signedOut: true, failWith: 'auth/invalid-credential' })
  type('E‑MAIL', 'hania@poczta.pl')
  type('HASŁO', 'zle-haslo')
  fireEvent.click(screen.getByRole('button', { name: /Zaloguj się/ }))
  expect(await screen.findByText('Nieprawidłowy e‑mail lub hasło.')).toBeDefined()
  expect(router.state.location.pathname).toBe('/logowanie')
})

test('Zaloguj się: brak internetu → komunikat pod formularzem', async () => {
  renderAt('/logowanie', { signedOut: true, failWith: 'auth/network-request-failed' })
  type('E‑MAIL', 'hania@poczta.pl')
  type('HASŁO', 'tajne-haslo')
  fireEvent.click(screen.getByRole('button', { name: /Zaloguj się/ }))
  expect((await screen.findByRole('alert')).textContent).toBe(
    'Brak internetu – logowanie wymaga połączenia.',
  )
})

test('bez konta ekran przechodzi do logowania, a po zalogowaniu wraca pod zapamiętany adres', async () => {
  const router = renderAt('/dolacz?kod=482913', { signedOut: true })
  expect(router.state.location.pathname).toBe('/logowanie')
  type('E‑MAIL', 'ola@poczta.pl')
  type('HASŁO', 'tajne-haslo')
  fireEvent.click(screen.getByRole('button', { name: /Zaloguj się/ }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/dolacz'))
  expect(router.state.location.search).toBe('?kod=482913')
})

test('Ustawienia → „Wyloguj” pyta i wraca do logowania', async () => {
  const router = renderAt('/ustawienia')
  expect(screen.getByText(/hania@poczta.pl/)).toBeDefined()
  fireEvent.click(screen.getByRole('button', { name: 'Wyloguj' }))
  const ask = screen.getByRole('alertdialog', { name: 'Wylogować się?' })
  fireEvent.click(ask.querySelectorAll('button')[2])
  await waitFor(() => expect(router.state.location.pathname).toBe('/logowanie'))
})

test('Hasło: „Pokaż” odsłania wpisane hasło', () => {
  renderAt('/logowanie')
  const input = screen.getByLabelText('HASŁO') as HTMLInputElement
  expect(input.type).toBe('password')
  fireEvent.click(screen.getByRole('button', { name: 'Pokaż hasło' }))
  expect(input.type).toBe('text')
})

test('Załóż konto: za krótkie hasło → błąd; poprawne → Pierwsze uruchomienie', async () => {
  const router = renderAt('/rejestracja', { signedOut: true })
  type('E‑MAIL', 'hania@poczta.pl')
  type('HASŁO', 'krotkie')
  fireEvent.click(screen.getByRole('button', { name: /Załóż konto/ }))
  expect(screen.getByText('Hasło musi mieć co najmniej 8 znaków.')).toBeDefined()
  type('HASŁO', 'dlugie-haslo')
  fireEvent.click(screen.getByRole('button', { name: /Załóż konto/ }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/witaj'))
})

test('Nie pamiętam hasła: po wysłaniu pokazuje adres i powrót do logowania', async () => {
  renderAt('/haslo', { signedOut: true })
  type('E‑MAIL', 'hania@poczta.pl')
  fireEvent.click(screen.getByRole('button', { name: 'Wyślij link' }))
  expect((await screen.findByRole('status')).textContent).toContain('hania@poczta.pl')
  expect(screen.getByRole('link', { name: 'Wróć do logowania' })).toBeDefined()
})
