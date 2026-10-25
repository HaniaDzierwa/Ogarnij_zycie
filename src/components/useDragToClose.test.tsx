import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { renderApp } from '../test/renderApp.tsx'

afterEach(cleanup)

/** Przeciągnięcie palcem w dół o `dy` px po panelu arkusza. */
function drag(dy: number) {
  const panel = screen.getByTestId('arkusz')
  fireEvent.touchStart(panel, { touches: [{ clientY: 200 }] })
  for (let y = 20; y <= dy; y += 20) fireEvent.touchMove(panel, { touches: [{ clientY: 200 + y }] })
  fireEvent.touchEnd(panel, { touches: [] })
}

const openTask = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Otwórz zadanie Baterie AA do pilota' }))

test('arkusz zadania: przeciągnięcie w dół zwija go; krótki ruch – zostaje', () => {
  renderApp('/zadania')
  openTask()
  drag(20)
  expect(screen.getByRole('dialog', { name: 'Zadanie' })).toBeDefined()
  drag(160)
  expect(screen.queryByRole('dialog', { name: 'Zadanie' })).toBeNull()
})

test('w edycji ze zmianami przeciągnięcie pyta „Odrzucić zmiany?”', () => {
  renderApp('/zadania')
  openTask()
  const sheet = screen.getByRole('dialog', { name: 'Zadanie' })
  fireEvent.click(within(sheet).getByRole('button', { name: 'Edytuj' }))
  fireEvent.change(within(sheet).getByLabelText('NAZWA'), { target: { value: 'Baterie AAA' } })
  drag(160)
  expect(screen.getByRole('alertdialog', { name: 'Odrzucić zmiany?' })).toBeDefined()
  expect(screen.getByRole('dialog', { name: 'Zadanie' })).toBeDefined()
})

test('arkusz wydarzenia też zwija się przeciągnięciem', () => {
  renderApp('/kalendarz?dzien=2026-10-10')
  fireEvent.click(screen.getByRole('button', { name: /^Kino z Krzysiem/ }))
  drag(160)
  expect(screen.queryByRole('dialog', { name: 'Wydarzenie' })).toBeNull()
})
