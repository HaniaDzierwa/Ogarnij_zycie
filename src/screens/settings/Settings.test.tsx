import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { renderApp } from '../../test/renderApp.tsx'

afterEach(cleanup)

const renderAt = (url: string) => renderApp(url)

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

test('Domownicy: lista z rolą i „Zaproś”, bez synchronizacji (Firebase robi to sam)', () => {
  const router = renderAt('/ustawienia/domownicy')
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Wspólny dom')
  expect(screen.getByText('Krzyś')).toBeDefined()
  expect(screen.getByText('DOMOWNIK')).toBeDefined()
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

const codeShown = () => screen.getByTestId('kod').textContent!
const waitForCode = () => waitFor(() => expect(codeShown()).toMatch(/^\d{3} \d{3}$/))

test('Zaproś: kod 6 cyfr (bez QR), ważność 10 min, bez wyboru „Co zobaczy domownik”', async () => {
  renderAt('/ustawienia/domownicy/zapros')
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Zaproś domownika')
  expect(screen.getByText('JEDNORAZOWY KOD')).toBeDefined()
  await waitForCode()
  expect(screen.queryByRole('img', { name: /QR/ })).toBeNull()
  expect(screen.getByText('WPISZ NA DRUGIM TELEFONIE')).toBeDefined()
  expect(screen.getByText('10:00')).toBeDefined()
  expect(screen.getByText(/Kod działa raz i wygasa po 10 minutach/)).toBeDefined()
  expect(screen.getByText('Wpisuje 6 cyfr albo otwiera link – i gotowe.')).toBeDefined()
  expect(screen.queryByText(/Skanuje/)).toBeNull()
  expect(screen.getByRole('button', { name: /Wyślij link wiadomością/ })).toBeDefined()

  // każdy sam decyduje „Wspólne / Tylko ja” przy zadaniu (decyzja Hani 2026-10-25)
  expect(screen.queryByText('CO ZOBACZY DOMOWNIK')).toBeNull()
  expect(screen.queryByRole('radio', { name: 'Wybrane' })).toBeNull()
})

test('Zaproś: po 10 minutach kod wygasa, „Nowy kod” daje kolejne 10 minut', async () => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  renderAt('/ustawienia/domownicy/zapros')
  await waitForCode()
  const first = codeShown()
  act(() => vi.advanceTimersByTime(10 * 60 * 1000 + 1000))
  expect(screen.getByText('Kod wygasł')).toBeDefined()
  fireEvent.click(screen.getByRole('button', { name: 'NOWY KOD' }))
  expect(await screen.findByText('10:00')).toBeDefined()
  expect(codeShown()).not.toBe(first)
  vi.useRealTimers()
})

test('Zaproś: gdy domownik użyje kodu – „Krzyś jest z Wami”, „Gotowe” → Domownicy', async () => {
  const router = renderApp('/ustawienia/domownicy/zapros', { inviteUsedBy: 'krzys' })
  expect(await screen.findByText(/Zmiany pojawią się u Was w kilka sekund/)).toBeDefined()
  expect(screen.getByText('jest z Wami').parentElement!.textContent).toBe('Krzyś jest z Wami')
  expect(screen.queryByText('Widzi')).toBeNull()
  fireEvent.click(screen.getByRole('link', { name: /Gotowe/ }))
  expect(router.state.location.pathname).toBe('/ustawienia/domownicy')
})

test('Zaproś: „Anuluj zaproszenie” wraca do Domowników; bez internetu – komunikat', async () => {
  const router = renderAt('/ustawienia/domownicy/zapros')
  await waitForCode()
  fireEvent.click(screen.getByRole('button', { name: 'ANULUJ ZAPROSZENIE' }))
  expect(router.state.location.pathname).toBe('/ustawienia/domownicy')
  cleanup()
  const spy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  renderAt('/ustawienia/domownicy/zapros')
  expect(await screen.findByText(/Brak internetu – zaproszenie wymaga połączenia/)).toBeDefined()
  expect(
    (screen.getByRole('button', { name: /Wyślij link wiadomością/ }) as HTMLButtonElement).disabled,
  ).toBe(true)
  spy.mockRestore()
})

test('Wspólny dom: nazwa domu do zmiany; pusta wraca do „Nasz dom”', () => {
  renderAt('/ustawienia')
  const input = screen.getByLabelText('NAZWA DOMU') as HTMLInputElement
  expect(input.value).toBe('Dom na Leśnej')
  fireEvent.change(input, { target: { value: 'Dzierwowie' } })
  expect(input.value).toBe('Dzierwowie')
  fireEvent.change(input, { target: { value: '  ' } })
  fireEvent.blur(input)
  expect(input.value).toBe('Nasz dom')
})
