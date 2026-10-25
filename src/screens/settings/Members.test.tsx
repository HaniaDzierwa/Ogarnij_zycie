// Domownicy: arkusz domownika, „Usuń z domu” (założyciel), „Opuść dom” (etap 4, krok 5).

import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { renderApp } from '../../test/renderApp.tsx'

afterEach(cleanup)

test('założycielka: arkusz Krzysia → „Usuń z domu” po pytaniu; bez „Opuść dom”', () => {
  const onRemoveMember = vi.fn()
  renderApp('/ustawienia/domownicy', { onRemoveMember })
  expect(screen.queryByRole('button', { name: 'OPUŚĆ DOM' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: /^Krzyś/ }))
  const sheet = screen.getByRole('dialog', { name: 'Domownik' })
  expect(within(sheet).getByText('DOMOWNIK')).toBeDefined()
  fireEvent.click(within(sheet).getByRole('button', { name: 'Usuń z domu' }))
  const confirm = screen.getByRole('alertdialog', { name: 'Usunąć z domu?' })
  expect(within(confirm).getByText(/Krzyś straci dostęp/)).toBeDefined()
  fireEvent.click(within(confirm).getByRole('button', { name: 'Usuń z domu' }))
  expect(onRemoveMember).toHaveBeenCalledWith('krzys')
  expect(screen.queryByRole('dialog', { name: 'Domownik' })).toBeNull()
})

test('domownik (Krzyś): nie usuwa innych; „Opuść dom” po pytaniu → „Pierwsze uruchomienie”', async () => {
  const router = renderApp('/ustawienia/domownicy', { as: 'krzys' })
  fireEvent.click(screen.getByRole('button', { name: /^Hania/ }))
  const sheet = screen.getByRole('dialog', { name: 'Domownik' })
  expect(within(sheet).queryByRole('button', { name: 'Usuń z domu' })).toBeNull()
  fireEvent.click(within(sheet).getByRole('button', { name: 'Zamknij' }))

  fireEvent.click(screen.getByRole('button', { name: 'OPUŚĆ DOM' }))
  const confirm = screen.getByRole('alertdialog', { name: 'Opuścić dom?' })
  expect(within(confirm).getByText(/Wrócić możesz tylko z nowym zaproszeniem/)).toBeDefined()
  fireEvent.click(within(confirm).getByRole('button', { name: 'Opuść dom' }))
  await vi.waitFor(() => expect(router.state.location.pathname).toBe('/witaj'))
})
