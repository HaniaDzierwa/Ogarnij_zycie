// „Usuń konto” (etap 7, decyzja Hani 2026-10-18 / 2026-10-25).

import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { renderApp } from '../../test/renderApp.tsx'

afterEach(cleanup)

const typePassword = (value: string) =>
  fireEvent.change(screen.getByLabelText('HASŁO – DLA POTWIERDZENIA'), { target: { value } })

function confirm() {
  fireEvent.click(screen.getByRole('button', { name: 'Usuń konto na zawsze' }))
  const dialog = screen.getByRole('alertdialog', { name: 'Usunąć konto?' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Usuń konto' }))
}

test('Ustawienia → „Usuń konto” otwiera ekran; bez hasła przycisk nieaktywny', () => {
  const router = renderApp('/ustawienia')
  fireEvent.click(screen.getByRole('link', { name: 'Usuń konto' }))
  expect(router.state.location.pathname).toBe('/ustawienia/usun-konto')
  expect(
    (screen.getByRole('button', { name: 'Usuń konto na zawsze' }) as HTMLButtonElement).disabled,
  ).toBe(true)
})

test('założycielka z domownikiem: domyślnie „Przekaż dom” Krzysiowi → po haśle konto znika', async () => {
  const onDeleteAccount = vi.fn()
  const router = renderApp('/ustawienia/usun-konto', { onDeleteAccount })
  expect(screen.getByText('Co z domem „Dom na Leśnej”?')).toBeDefined()
  expect(screen.getByRole('button', { name: 'Krzyś' }).getAttribute('aria-pressed')).toBe('true')
  expect(screen.getByText(/przejmie Krzyś/)).toBeDefined()
  typePassword('tajne-haslo')
  confirm()
  await vi.waitFor(() => expect(router.state.location.pathname).toBe('/logowanie'))
  expect(onDeleteAccount).toHaveBeenCalledWith({ kind: 'transfer', to: 'krzys' })
})

test('założycielka: „Usuń u wszystkich” – ostrzeżenie i usunięcie domu', async () => {
  const onDeleteAccount = vi.fn()
  renderApp('/ustawienia/usun-konto', { onDeleteAccount })
  fireEvent.click(screen.getByRole('radio', { name: 'Usuń u wszystkich' }))
  expect(screen.getByText(/zostanie usunięty u wszystkich/)).toBeDefined()
  typePassword('tajne-haslo')
  confirm()
  await vi.waitFor(() => expect(onDeleteAccount).toHaveBeenCalledWith({ kind: 'delete-house' }))
})

test('złe hasło – komunikat, nic nie usunięte, zostajemy na ekranie', async () => {
  const onDeleteAccount = vi.fn()
  const router = renderApp('/ustawienia/usun-konto', { onDeleteAccount })
  typePassword('zle')
  confirm()
  expect(await screen.findByText('Nieprawidłowe hasło.')).toBeDefined()
  expect(onDeleteAccount).not.toHaveBeenCalled()
  expect(router.state.location.pathname).toBe('/ustawienia/usun-konto')
})

test('domownik (Krzyś): bez wyboru – wychodzi z domu, wspólne zostają', async () => {
  const onDeleteAccount = vi.fn()
  renderApp('/ustawienia/usun-konto', { onDeleteAccount, as: 'krzys' })
  expect(screen.queryByText(/Co z domem/)).toBeNull()
  expect(screen.getByText(/Opuścisz dom „Dom na Leśnej”/)).toBeDefined()
  typePassword('tajne-haslo')
  confirm()
  await vi.waitFor(() => expect(onDeleteAccount).toHaveBeenCalledWith({ kind: 'leave' }))
})
