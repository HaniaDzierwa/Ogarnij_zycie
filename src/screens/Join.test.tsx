import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { renderApp } from '../test/renderApp.tsx'

afterEach(cleanup)

const renderAt = (url: string) => renderApp(url)

test('Dołącz: skan albo 6 cyfr, teksty bez Wi‑Fi, podpowiedź o linku', () => {
  renderAt('/dolacz')
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Dołącz do domu')
  expect(screen.getByText(/Jest ważny 10 minut/)).toBeDefined()
  expect(
    screen.getByText('Masz link? Otwórz go na tym telefonie – dołączysz od razu.'),
  ).toBeDefined()
  expect(screen.queryByText(/Wi‑Fi/)).toBeNull()
  const input = screen.getByLabelText('ALBO WPISZ 6 CYFR') as HTMLInputElement
  fireEvent.change(input, { target: { value: '4829' } })
  expect(input.value).toBe('482 9')
  fireEvent.change(input, { target: { value: '482 913' } })
  expect(screen.getByText('ZNALEZIONO DOM')).toBeDefined()
  expect(screen.getByText(/Hania i Krzyś · wszystkie kategorie i kalendarz/)).toBeDefined()
})

test('link z zaproszenia (?kod=) od razu pokazuje dom; „To nie ten dom” wraca', () => {
  renderAt('/dolacz?kod=482913')
  expect(screen.getByRole('button', { name: /Dołącz jako domownik/ })).toBeDefined()
  fireEvent.click(screen.getByRole('button', { name: 'TO NIE TEN DOM' }))
  expect(screen.getByRole('button', { name: /Skanuj kod/ })).toBeDefined()
})

test('„Dołącz jako Ola” zapisuje imię i otwiera Start', () => {
  const router = renderAt('/dolacz')
  fireEvent.click(screen.getByRole('button', { name: /Skanuj kod/ }))
  fireEvent.change(screen.getByLabelText('JAK MAJĄ CIĘ WIDZIEĆ DOMOWNICY?'), {
    target: { value: 'Ola' },
  })
  fireEvent.click(screen.getByRole('button', { name: /Dołącz jako Ola/ }))
  expect(router.state.location.pathname).toBe('/')
  expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Ola')
})
