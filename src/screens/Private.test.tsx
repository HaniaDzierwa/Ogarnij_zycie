// „Wspólne / Tylko ja” przy zadaniach i wydarzeniach (etap 4, decyzja Hani 2026-10-25).

import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { renderApp } from '../test/renderApp.tsx'

afterEach(cleanup)

const agenda = () => screen.getByRole('heading', { level: 2, name: /,/ }).closest('section')!

test('nowe zadanie: domyślnie „Wspólne”; „Tylko ja” – na liście z dopiskiem TYLKO JA', () => {
  renderApp('/zadania?nowe=zadanie')
  const sheet = screen.getByRole('dialog', { name: 'Nowe zadanie' })
  expect(within(sheet).getByRole('radio', { name: 'Wspólne' }).getAttribute('aria-checked')).toBe(
    'true',
  )
  expect(within(sheet).getByText('Widzą wszyscy domownicy.')).toBeDefined()
  fireEvent.change(within(sheet).getByLabelText('CO TRZEBA ZROBIĆ?'), {
    target: { value: 'Prezent dla Krzysia' },
  })
  fireEvent.click(within(sheet).getByRole('radio', { name: 'Tylko ja' }))
  expect(within(sheet).getByText(/Widzisz tylko Ty/)).toBeDefined()
  fireEvent.click(within(sheet).getByRole('button', { name: 'Dodaj zadanie' }))
  const row = screen.getByText('Prezent dla Krzysia').closest('li') ?? document.body
  expect(within(row as HTMLElement).getByText('TYLKO JA')).toBeDefined()
})

test('arkusz własnego zadania: przełączenie na „Tylko ja” i z powrotem', () => {
  renderApp('/zadania')
  fireEvent.click(screen.getByText('Baterie AA do pilota'))
  const detail = screen.getByRole('dialog', { name: 'Zadanie' })
  const setVisibility = (name: string) => {
    fireEvent.click(within(detail).getByRole('button', { name: 'Edytuj' }))
    fireEvent.click(within(detail).getByRole('radio', { name }))
    fireEvent.click(within(detail).getByRole('button', { name: 'Zapisz' }))
  }
  setVisibility('Tylko ja')
  expect(within(detail).getByText('Tylko ja')).toBeDefined()
  expect(screen.getAllByText('TYLKO JA')).toHaveLength(1)
  setVisibility('Wspólne')
  expect(screen.queryByText('TYLKO JA')).toBeNull()
})

test('cudze wspólne zadanie: bez przełącznika, „Zmienić może tylko Krzyś”', () => {
  renderApp('/zadania')
  fireEvent.click(screen.getByText('Zebranie w szkole'))
  const detail = screen.getByRole('dialog', { name: 'Zadanie' })
  fireEvent.click(within(detail).getByRole('button', { name: 'Edytuj' }))
  expect(within(detail).queryByRole('radio', { name: 'Tylko ja' })).toBeNull()
  expect(within(detail).getByText(/Zmienić może tylko Krzyś/)).toBeDefined()
})

test('nowe wydarzenie „Tylko ja” – w agendzie z dopiskiem „Tylko ja”', () => {
  renderApp('/kalendarz?nowe=wydarzenie')
  const sheet = screen.getByRole('dialog', { name: 'Nowe wydarzenie' })
  fireEvent.change(within(sheet).getByLabelText('NAZWA'), { target: { value: 'Fryzjer' } })
  fireEvent.click(within(sheet).getByRole('radio', { name: 'Tylko ja' }))
  fireEvent.click(within(sheet).getByRole('button', { name: 'Dodaj do kalendarza' }))
  expect(agenda().textContent).toContain('Fryzjer')
  expect(agenda().textContent).toMatch(/TYLKO JA/i)
})
