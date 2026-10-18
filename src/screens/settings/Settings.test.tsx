import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
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

test('Ustawienia: sekcje z projektu, bez Wyglądu (tylko jasny motyw), teksty o Firebase', () => {
  renderAt('/ustawienia')
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Po swojemu')
  for (const s of ['TY', 'WSPÓLNY DOM', 'PORZĄDKI', 'POWIADOMIENIA']) {
    expect(screen.getByText(s)).toBeDefined()
  }
  expect(screen.queryByText('WYGLĄD')).toBeNull()
  expect(screen.getByText('KRZYŚ · DZIŚ 13:05')).toBeDefined()
  expect(screen.getByText('Dane w Firebase – widzą je tylko domownicy')).toBeDefined()
  expect(screen.getByText('5 ELEMENTÓW · ZADANIA I WYDARZENIA')).toBeDefined()
})

test('imię zmienia powitanie i trafia na Start', () => {
  const router = renderAt('/ustawienia')
  fireEvent.change(screen.getByLabelText('IMIĘ LUB PSEUDONIM'), { target: { value: 'Mama' } })
  expect(screen.getByText('„Dzień dobry, Mama”')).toBeDefined()
  fireEvent.click(screen.getByRole('link', { name: 'Start' }))
  expect(router.state.location.pathname).toBe('/')
  expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Mama')
})

test('sprzątanie ogarniętych i powiadomienia się przełączają', () => {
  renderAt('/ustawienia')
  expect(screen.getByRole('radio', { name: 'Po 30 dniach' }).getAttribute('aria-checked')).toBe(
    'true',
  )
  fireEvent.click(screen.getByRole('radio', { name: 'Nigdy' }))
  expect(screen.getByText('Ogarnięte zostają, dopóki ich nie wyczyścisz.')).toBeDefined()
  const house = screen.getByRole('switch', { name: /Zmiany od domowników/ })
  expect(house.getAttribute('aria-checked')).toBe('false')
  fireEvent.click(house)
  expect(house.getAttribute('aria-checked')).toBe('true')
})

test('Porządki → Kosz i Wspólny dom → Domownicy', () => {
  const router = renderAt('/ustawienia')
  fireEvent.click(screen.getByRole('link', { name: /Kosz/ }))
  expect(router.state.location.pathname).toBe('/ustawienia/kosz')
  fireEvent.click(screen.getByRole('link', { name: /USTAWIENIA/ }))
  fireEvent.click(screen.getByRole('link', { name: /^Domownicy/ }))
  expect(router.state.location.pathname).toBe('/ustawienia/domownicy')
})

test('Domownicy: lista z zakresem i „Zaproś”, bez synchronizacji (Firebase robi to sam)', () => {
  const router = renderAt('/ustawienia/domownicy')
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Wspólny dom')
  expect(screen.getByText('Krzyś')).toBeDefined()
  expect(screen.getByText('WSZYSTKIE KATEGORIE I KALENDARZ')).toBeDefined()
  for (const gone of [
    'ONLINE · ZSYNCHRONIZOWANO',
    'DO WYSŁANIA',
    'TRYB PRACY',
    'Synchronizuj teraz',
  ]) {
    expect(screen.queryByText(gone)).toBeNull()
  }
  fireEvent.click(screen.getByRole('link', { name: /ZAPROŚ DOMOWNIKA/ }))
  expect(router.state.location.pathname).toBe('/ustawienia/domownicy/zapros')
})

test('Domownicy: pusty dom – „Na razie tylko Ty” (podgląd ?stan=sam)', () => {
  renderAt('/ustawienia/domownicy?stan=sam')
  expect(screen.getByText('TYLKO TY')).toBeDefined()
  expect(screen.getByText(/Zaproś domownika, żeby mieć wspólny dom z bliskimi/)).toBeDefined()
})

test('plakietka OFFLINE tylko bez internetu; online – nic', () => {
  renderAt('/ustawienia')
  expect(screen.queryByText('OFFLINE')).toBeNull()
  expect(screen.queryByText('ONLINE')).toBeNull()
  cleanup()
  const spy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  renderAt('/ustawienia')
  expect(screen.getByRole('status', { name: /Offline/ }).textContent).toBe('OFFLINE')
  spy.mockRestore()
})

test('Zaproś: kod 6 cyfr, ważność 10 min, teksty o Firebase, zakres „Wybrane”', () => {
  renderAt('/ustawienia/domownicy/zapros')
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Zaproś domownika')
  expect(screen.getByText('JEDNORAZOWY KOD')).toBeDefined()
  const code = screen.getByTestId('kod').textContent!
  expect(code).toMatch(/^\d{3} \d{3}$/)
  expect(screen.getByText('10:00')).toBeDefined()
  expect(screen.getByText(/Kod działa raz i wygasa po 10 minutach/)).toBeDefined()
  expect(screen.getByText(/otwiera link – i gotowe/)).toBeDefined()
  expect(screen.queryByText(/Wi‑Fi/)).toBeNull()
  expect(screen.getByRole('button', { name: /Wyślij link wiadomością/ })).toBeDefined()

  fireEvent.click(screen.getByRole('radio', { name: 'Wybrane' }))
  expect(screen.getByRole('button', { name: 'Kalendarz' }).getAttribute('aria-pressed')).toBe(
    'true',
  )
  fireEvent.click(screen.getByRole('button', { name: 'Zdrowie' }))
  expect(screen.getByRole('button', { name: 'Zdrowie' }).getAttribute('aria-pressed')).toBe('true')
})

test('Zaproś: po 10 minutach kod wygasa, „Nowy kod” daje kolejne 10 minut', () => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  renderAt('/ustawienia/domownicy/zapros')
  act(() => vi.advanceTimersByTime(10 * 60 * 1000 + 1000))
  expect(screen.getByText('Kod wygasł')).toBeDefined()
  fireEvent.click(screen.getByRole('button', { name: 'NOWY KOD' }))
  expect(screen.getByText('10:00')).toBeDefined()
  vi.useRealTimers()
})

test('Zaproś: stan „Ola dołączyła” (podgląd ?etap=dolaczyla), „Gotowe” → Domownicy', () => {
  const router = renderAt('/ustawienia/domownicy/zapros?etap=dolaczyla')
  expect(screen.getByText(/Zmiany pojawią się u Was w kilka sekund/)).toBeDefined()
  expect(screen.getByText('WSZYSTKIE KATEGORIE I KALENDARZ')).toBeDefined()
  fireEvent.click(screen.getByRole('link', { name: /Gotowe/ }))
  expect(router.state.location.pathname).toBe('/ustawienia/domownicy')
})
