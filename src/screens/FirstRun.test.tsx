import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { renderApp } from '../test/renderApp.tsx'

afterEach(cleanup)

/** Pierwsze uruchomienie – świeże konto bez domu. */
const renderAt = (url: string) => renderApp(url, { noHouse: true })

test('Ładowanie: dotknięcie prowadzi do logowania', () => {
  const router = renderAt('/ladowanie?pora=noc')
  fireEvent.click(screen.getByRole('button', { name: /wczytywanie/ }))
  expect(router.state.location.pathname).toBe('/logowanie')
})

test('Pierwsze uruchomienie: imię i nazwa domu → „Zaczynamy” zakłada dom i otwiera Start', async () => {
  const created: string[][] = []
  const router = renderApp('/witaj', {
    noHouse: true,
    onCreateHouse: (house, name) => created.push([house, name]),
  })
  fireEvent.change(screen.getByLabelText('JAK MASZ NA IMIĘ?'), { target: { value: 'Ola' } })
  expect(screen.getByText('„Dzień dobry, Ola”')).toBeDefined()
  fireEvent.change(screen.getByLabelText('NAZWA DOMU'), { target: { value: 'Dom na Leśnej' } })
  fireEvent.click(screen.getByRole('button', { name: /Zaczynamy/ }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  expect(created).toEqual([['Dom na Leśnej', 'Ola']])
  expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Ola')
})

test('Pierwsze uruchomienie: bez imienia – błąd; pusta nazwa domu – „Nasz dom”', async () => {
  const created: string[][] = []
  const router = renderApp('/witaj', {
    noHouse: true,
    onCreateHouse: (house, name) => created.push([house, name]),
  })
  fireEvent.click(screen.getByRole('button', { name: /Zaczynamy/ }))
  expect(screen.getByRole('alert').textContent).toContain('Wpisz imię')
  expect(created).toEqual([])
  fireEvent.change(screen.getByLabelText('JAK MASZ NA IMIĘ?'), { target: { value: 'Ola' } })
  fireEvent.click(screen.getByRole('button', { name: /Zaczynamy/ }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  expect(created).toEqual([['Nasz dom', 'Ola']])
})

test('konto bez domu: ekrany domu prowadzą do Pierwszego uruchomienia; z domem /witaj → Start', () => {
  expect(renderApp('/zadania', { noHouse: true }).state.location.pathname).toBe('/witaj')
  cleanup()
  expect(renderApp('/witaj').state.location.pathname).toBe('/')
  cleanup()
  // Dołącz do domu – też bez domu
  expect(renderApp('/dolacz', { noHouse: true }).state.location.pathname).toBe('/dolacz')
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
