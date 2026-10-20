import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { renderApp } from '../test/renderApp.tsx'

afterEach(cleanup)

const tabBar = () => within(screen.getByRole('navigation', { name: 'Główna nawigacja' }))

const renderAt = (url: string) => renderApp(url)

test('dolny pasek zaznacza aktywną zakładkę', () => {
  renderAt('/kalendarz')
  expect(tabBar().getByRole('link', { name: 'Kalendarz' }).getAttribute('aria-current')).toBe(
    'page',
  )
  expect(tabBar().getByRole('link', { name: 'Start' }).getAttribute('aria-current')).toBeNull()
})

test('Domownicy mają aktywną zakładkę Ustawienia', () => {
  renderAt('/ustawienia/domownicy')
  expect(tabBar().getByRole('link', { name: 'Ustawienia' }).getAttribute('aria-current')).toBe(
    'page',
  )
})

test('„+” otwiera menu „Co dodajesz?”, „Zadanie” prowadzi do nowego zadania', () => {
  const router = renderAt('/')
  fireEvent.click(screen.getByRole('button', { name: 'Dodaj' }))
  expect(screen.getByRole('menu', { name: 'Co dodajesz?' })).toBeDefined()
  fireEvent.click(screen.getByRole('menuitem', { name: 'Zadanie' }))
  expect(router.state.location.pathname).toBe('/zadania')
  expect(router.state.location.search).toBe('?nowe=zadanie')
  expect(screen.queryByRole('menu')).toBeNull()
})

test('kliknięcie obok zamyka menu', () => {
  renderAt('/')
  fireEvent.click(screen.getByRole('button', { name: 'Dodaj' }))
  fireEvent.click(screen.getByRole('button', { name: 'Zamknij' }))
  expect(screen.queryByRole('menu')).toBeNull()
})

test('ekrany bez paska: Zaproś domownika, Dołącz do domu', () => {
  renderAt('/ustawienia/domownicy/zapros')
  expect(screen.queryByRole('navigation', { name: 'Główna nawigacja' })).toBeNull()
})
