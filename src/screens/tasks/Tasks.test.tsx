import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
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

const groupHeads = () =>
  screen
    .getAllByRole('button', { expanded: true })
    .filter((b) => b.closest('section') && b.textContent?.match(/^[A-ZĄĆĘŁŃÓŚŹŻ ]+\d/))

test('nagłówek: 12 otwartych, 4 pilne; grupy kategorii', () => {
  renderAt('/zadania')
  expect(screen.getByText('12 otwartych')).toBeDefined()
  expect(screen.getByText('4 pilne')).toBeDefined()
  expect(groupHeads().map((b) => b.textContent)).toEqual([
    'ZAKUPY2',
    'DOM3',
    'ZDROWIE2',
    'URZĘDY2',
    'AUTO1',
    'RODZINA2',
  ])
})

test('pierwsze zadanie ma rozwinięte podzadania z postępem 50%', () => {
  renderAt('/zadania')
  expect(screen.getByText('50%')).toBeDefined()
  expect(screen.getByText('2 / 4 KROKI')).toBeDefined()
  expect(screen.getByRole('button', { name: 'Wybrać prezent' }).getAttribute('aria-pressed')).toBe(
    'true',
  )
})

test('odhaczenie podzadania zmienia %', () => {
  renderAt('/zadania')
  fireEvent.click(screen.getByRole('button', { name: 'Zapakować' }))
  expect(screen.getByText('75%')).toBeDefined()
})

test('?pokaz=pilne: filtr aktywny, licznik 1, chip z „×”, tylko pilne', () => {
  renderAt('/zadania?pokaz=pilne')
  expect(screen.getByLabelText('Aktywne filtry: 1')).toBeDefined()
  expect(screen.getByRole('button', { name: 'Usuń filtr: Pilne' })).toBeDefined()
  expect(screen.getAllByText('PILNE').length).toBe(4)
  fireEvent.click(screen.getByRole('button', { name: 'Usuń filtr: Pilne' }))
  expect(screen.queryByLabelText(/Aktywne filtry/)).toBeNull()
})

test('?pokaz=ogarniete: tylko „Już ogarnięte” rozwinięte', () => {
  renderAt('/zadania?pokaz=ogarniete')
  const done = screen.getByRole('button', { name: /Już ogarnięte/ })
  expect(done.getAttribute('aria-expanded')).toBe('true')
  expect(screen.getByText('Mleko i chleb')).toBeDefined()
  expect(screen.queryByText('Baterie AA do pilota')).toBeNull()
})

test('panel filtrów: wybór kategorii, kliknięcie obok zamyka, chip i licznik 2 + „Wyczyść”', () => {
  renderAt('/zadania?pokaz=pilne')
  fireEvent.click(screen.getByRole('button', { name: /Filtry/ }))
  const panel = document.getElementById('panel-filtrow')!
  fireEvent.click(within(panel).getByRole('button', { name: /^Dom/ }))
  // kliknięcie obok panelu
  fireEvent.click(document.querySelector('div[aria-hidden="true"][style*="position: fixed"]')!)
  expect(document.getElementById('panel-filtrow')).toBeNull()
  expect(screen.getByLabelText('Aktywne filtry: 2')).toBeDefined()
  fireEvent.click(screen.getByRole('button', { name: 'WYCZYŚĆ' }))
  expect(screen.queryByLabelText(/Aktywne filtry/)).toBeNull()
})

test('„Zwiń wszystko” ⇄ „Rozwiń wszystko”', () => {
  renderAt('/zadania')
  fireEvent.click(screen.getByRole('button', { name: /ZWIŃ WSZYSTKO/ }))
  expect(screen.getByRole('button', { name: /ROZWIŃ WSZYSTKO/ })).toBeDefined()
  expect(screen.queryByText('Baterie AA do pilota')).toBeNull()
  // zwinięta grupa z pilnymi pokazuje plakietkę
  expect(screen.getAllByText('1 PILNE').length).toBeGreaterThan(0)
})

test('odhaczenie zadania przenosi je do „Już ogarnięte”', () => {
  renderAt('/zadania')
  fireEvent.click(
    screen.getByRole('button', { name: 'Oznacz jako zrobione: Baterie AA do pilota' }),
  )
  expect(screen.getByText('11 otwartych')).toBeDefined()
})

test('arkusz „Nowe zadanie” z ?nowe=zadanie dodaje zadanie', () => {
  const router = renderAt('/zadania?nowe=zadanie')
  const sheet = screen.getByRole('dialog', { name: 'Nowe zadanie' })
  fireEvent.change(within(sheet).getByLabelText('CO TRZEBA ZROBIĆ?'), {
    target: { value: 'Kupić żarówki' },
  })
  fireEvent.click(within(sheet).getByRole('radio', { name: /Pilne/ }))
  fireEvent.click(within(sheet).getByRole('button', { name: 'Dziś' }))
  fireEvent.click(within(sheet).getByRole('button', { name: 'Dodaj zadanie' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(router.state.location.search).toBe('')
  expect(screen.getByText('Kupić żarówki')).toBeDefined()
  expect(screen.getByText('13 otwartych')).toBeDefined()
  expect(screen.getByText('5 pilnych')).toBeDefined()
})

test('usunięcie kategorii przenosi zadania do „Bez kategorii”', () => {
  renderAt('/zadania')
  fireEvent.click(screen.getByRole('button', { name: /Filtry/ }))
  fireEvent.click(screen.getByRole('button', { name: 'EDYTUJ' }))
  fireEvent.click(screen.getByRole('button', { name: 'Usuń kategorię Auto' }))
  expect(screen.getAllByText('BEZ KATEGORII').length).toBeGreaterThan(0)
})
