// Odbiór etapu 5: liczby na Starcie = lista zadań (także po zmianach); wydarzenie z Kosza wraca
// na swój dzień.

import { act, cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { renderApp } from '../test/renderApp.tsx'

afterEach(cleanup)

/** Kafelek Startu (link) z danym napisem – ten sam napis może być też w wierszach niżej. */
const tile = (label: string) =>
  screen
    .getAllByRole('link')
    .find((a) => a.textContent?.includes(label) && /\d/.test(a.textContent))!
const tileNumber = (label: string) => Number(/\d+/.exec(tile(label).textContent ?? '')![0])
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }))

/** Z ekranu Zadania: „12 otwartych”, „4 pilne”, zakładka „Ogarnięte 7”. */
function tasksNumbers() {
  const openText = screen.getByText(/\d+ otwartych|\d+ otwarte|\d+ otwarty/).textContent!
  const urgent = screen.queryByText(/\d+ piln/)?.textContent ?? '0'
  return { open: parseInt(openText), urgent: parseInt(urgent) }
}

test('liczby na Starcie zgadzają się z listą zadań – przed i po zmianach', async () => {
  const router = renderApp('/?pora=dzien')
  const fromStart = () => ({ open: tileNumber('DO ZROBIENIA'), urgent: tileNumber('PILNE') })
  const fromTasks = async () => {
    await act(() => router.navigate('/zadania'))
    const n = tasksNumbers()
    return n
  }
  const check = async () => {
    await act(() => router.navigate('/?pora=dzien'))
    const s = fromStart()
    expect(s).toEqual(await fromTasks())
  }

  await check()

  // ogarnięcie zadania (kwadracik) – mniej do zrobienia
  await act(() => router.navigate('/zadania'))
  click('Oznacz jako ogarnięte: Baterie AA do pilota')
  await act(() => new Promise((r) => setTimeout(r, 400)))
  await check()

  // nowe pilne zadanie
  await act(() => router.navigate('/zadania?nowe=zadanie'))
  const sheet = screen.getByRole('dialog', { name: 'Nowe zadanie' })
  fireEvent.change(within(sheet).getByLabelText('CO TRZEBA ZROBIĆ?'), {
    target: { value: 'Pilne nowe' },
  })
  fireEvent.click(within(sheet).getByRole('radio', { name: 'Pilne' }))
  fireEvent.click(within(sheet).getByRole('button', { name: 'Dodaj zadanie' }))
  await check()
  await act(() => router.navigate('/?pora=dzien'))
  expect(tileNumber('PILNE')).toBe(5)
})

test('usunięte wydarzenie jest w Koszu i po „Przywróć” wraca na swój dzień', async () => {
  const router = renderApp('/kalendarz?dzien=2026-10-14')
  const agenda = () => screen.getByRole('heading', { level: 2, name: /,/ }).closest('section')!
  // „Basen z dziećmi” (śr 14 paź) leży w koszu – w kalendarzu go nie ma
  expect(agenda().textContent).not.toContain('Basen z dziećmi')
  await act(() => router.navigate('/ustawienia/kosz'))
  click('Przywróć: Basen z dziećmi')
  await act(() => router.navigate('/kalendarz?dzien=2026-10-14'))
  expect(agenda().textContent).toContain('Basen z dziećmi')
})
