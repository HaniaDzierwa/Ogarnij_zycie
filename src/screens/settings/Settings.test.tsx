import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { renderApp } from '../../test/renderApp.tsx'

afterEach(cleanup)

const renderAt = (url: string) => renderApp(url)

test('Ustawienia: sekcje z projektu, bez Wyglądu (tylko jasny motyw), teksty o Firebase', () => {
  renderAt('/ustawienia')
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Po swojemu')
  for (const s of ['ZADANIA', 'PORZĄDKI', 'POWIADOMIENIA']) {
    expect(screen.getByText(s)).toBeDefined()
  }
  expect(screen.queryByText('WYGLĄD')).toBeNull()
  // wariant A (decyzja Hani 2026-11-20): bez pól nicku i nazwy domu – jeden wiersz „Wspólny dom”
  expect(screen.queryByText('TY')).toBeNull()
  expect(screen.queryByRole('textbox')).toBeNull()
  expect(screen.getByRole('link', { name: /^Wspólny dom/ }).textContent).toContain(
    'DOM NA LEŚNEJ · HANIA, KRZYŚ',
  )
  expect(screen.getByText('Dane w Firebase – widzą je tylko domownicy')).toBeDefined()
  expect(screen.getByText('5 ELEMENTÓW · ZADANIA I WYDARZENIA')).toBeDefined()
})

test('Wspólny dom → „Zmień nick”: podgląd powitania, „Zapisz” – nowy nick na Starcie', () => {
  const router = renderAt('/ustawienia/domownicy')
  fireEvent.click(screen.getByRole('button', { name: 'Zmień nick' }))
  const sheet = screen.getByRole('dialog', { name: 'Twój nick' })
  fireEvent.change(within(sheet).getByLabelText('Twój nick'), { target: { value: 'Mama' } })
  expect(within(sheet).getByText('„Dzień dobry, Mama”')).toBeDefined()
  expect(within(sheet).getByText(/Domownicy zobaczą ten nick/)).toBeDefined()
  fireEvent.click(within(sheet).getByRole('button', { name: 'Zapisz' }))
  expect(screen.queryByRole('dialog', { name: 'Twój nick' })).toBeNull()
  expect(screen.getByText('Mama')).toBeDefined()
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
})

test('Powiadomienia: w Ustawieniach jeden wiersz z opisem; szczegóły na osobnym ekranie', () => {
  const router = renderAt('/ustawienia')
  expect(screen.queryByRole('switch')).toBeNull()
  fireEvent.click(screen.getByRole('link', { name: /^Powiadomienia.*PODSUMOWANIA 8:00, 18:00/ }))
  expect(router.state.location.pathname).toBe('/ustawienia/powiadomienia')
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Powiadomienia po swojemu')

  const house = screen.getByRole('switch', { name: /Zmiany od domowników/ })
  expect(house.getAttribute('aria-checked')).toBe('false')
  fireEvent.click(house)
  expect(house.getAttribute('aria-checked')).toBe('true')
  fireEvent.click(screen.getByRole('switch', { name: /Podsumowania/ }))

  fireEvent.click(screen.getByRole('link', { name: /USTAWIENIA/ }))
  expect(router.state.location.pathname).toBe('/ustawienia')
  expect(screen.getByRole('link', { name: /ZMIANY OD DOMOWNIKÓW/ })).toBeDefined()
  expect(screen.queryByText(/PODSUMOWANIA 8:00/)).toBeNull()
})

test('Porządki → Kosz i „Wspólny dom ›” → ekran domu', () => {
  const router = renderAt('/ustawienia')
  fireEvent.click(screen.getByRole('link', { name: /Kosz/ }))
  expect(router.state.location.pathname).toBe('/ustawienia/kosz')
  fireEvent.click(screen.getByRole('link', { name: /USTAWIENIA/ }))
  fireEvent.click(screen.getByRole('link', { name: /^Wspólny dom/ }))
  expect(router.state.location.pathname).toBe('/ustawienia/domownicy')
})

test('Wspólny dom: nazwa domu w nagłówku, Ty i domownicy z rolą, „Zaproś”, bez synchronizacji', () => {
  const router = renderAt('/ustawienia/domownicy')
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Dom na Leśnej')
  expect(screen.getByText('NAZWA DOMU')).toBeDefined()
  expect(screen.getByText('(Ty)')).toBeDefined()
  expect(screen.getByText('ZAŁOŻYCIEL DOMU')).toBeDefined()
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

test('Wspólny dom: „Zmień” nazwę domu; pustej nie da się zapisać; zmiana i dotknięcie obok – pytanie', () => {
  renderAt('/ustawienia/domownicy')
  fireEvent.click(screen.getByRole('button', { name: 'Zmień nazwę domu' }))
  let sheet = screen.getByRole('dialog', { name: 'Nazwa domu' })
  const input = within(sheet).getByLabelText('Nazwa domu') as HTMLInputElement
  expect(input.value).toBe('Dom na Leśnej')
  fireEvent.change(input, { target: { value: '  ' } })
  expect(
    (within(sheet).getByRole('button', { name: 'Zapisz' }) as HTMLButtonElement).disabled,
  ).toBe(true)
  // zmiana i „Anuluj” – najpierw pytanie
  fireEvent.change(input, { target: { value: 'Dzierwowie' } })
  fireEvent.click(within(sheet).getByRole('button', { name: 'Anuluj' }))
  fireEvent.click(
    within(screen.getByRole('alertdialog', { name: 'Odrzucić zmiany?' })).getByRole('button', {
      name: 'Odrzuć',
    }),
  )
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Dom na Leśnej')
  // zapis
  fireEvent.click(screen.getByRole('button', { name: 'Zmień nazwę domu' }))
  sheet = screen.getByRole('dialog', { name: 'Nazwa domu' })
  fireEvent.change(within(sheet).getByLabelText('Nazwa domu'), { target: { value: 'Dzierwowie' } })
  fireEvent.click(within(sheet).getByRole('button', { name: 'Zapisz' }))
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Dzierwowie')
})

const times = () =>
  screen.getAllByLabelText(/^Godzina podsumowania/).map((i) => (i as HTMLInputElement).value)

test('Podsumowania: domyślnie 8:00 i 18:00; zmiana, dodawanie do 5, ostatniej nie da się usunąć', () => {
  renderAt('/ustawienia/powiadomienia')
  expect(screen.queryByRole('switch', { name: /Terminy zadań/ })).toBeNull()
  expect(screen.queryByRole('switch', { name: /Poranne podsumowanie/ })).toBeNull()
  expect(screen.getByRole('switch', { name: /Podsumowania/ }).getAttribute('aria-checked')).toBe(
    'true',
  )
  expect(times()).toEqual(['08:00', '18:00'])

  // zmiana godziny – lista zostaje uporządkowana
  fireEvent.change(screen.getByLabelText('Godzina podsumowania 2'), { target: { value: '12:00' } })
  expect(times()).toEqual(['08:00', '12:00'])
  // dodawanie – kolejna pełna godzina po ostatniej, najwyżej 5
  const add = () => fireEvent.click(screen.getByRole('button', { name: /Dodaj godzinę/ }))
  add()
  add()
  add()
  expect(times()).toEqual(['08:00', '12:00', '13:00', '14:00', '15:00'])
  expect(screen.queryByRole('button', { name: /Dodaj godzinę/ })).toBeNull()

  // usuwanie – zostaje co najmniej jedna
  for (const t of ['15:00', '14:00', '13:00', '12:00'])
    fireEvent.click(screen.getByRole('button', { name: `Usuń godzinę ${t}` }))
  expect(times()).toEqual(['08:00'])
  expect(
    (screen.getByRole('button', { name: 'Usuń godzinę 08:00' }) as HTMLButtonElement).disabled,
  ).toBe(true)
})

test('Podsumowania: kratki „Co przychodzi”; bez żadnej – wskazówka; wyłączone – bez godzin', () => {
  renderAt('/ustawienia/powiadomienia')
  const box = (name: string) => screen.getByRole('checkbox', { name }) as HTMLInputElement
  const names = [
    'Pilne',
    'Terminy na dziś (i po terminie)',
    'Terminy na jutro',
    'Wydarzenia dziś',
    'Wydarzenia jutro i za tydzień (wg przypomnienia)',
  ]
  expect(names.map((n) => box(n).checked)).toEqual([true, true, true, true, true])
  // „tylko Pilne”
  for (const n of names.slice(1)) fireEvent.click(box(n))
  expect(names.map((n) => box(n).checked)).toEqual([true, false, false, false, false])
  expect(screen.queryByText(/Zaznacz przynajmniej jedną rzecz/)).toBeNull()
  fireEvent.click(box('Pilne'))
  expect(screen.getByText(/Zaznacz przynajmniej jedną rzecz/)).toBeDefined()

  fireEvent.click(screen.getByRole('switch', { name: /Podsumowania/ }))
  expect(screen.queryByLabelText(/^Godzina podsumowania/)).toBeNull()
  expect(screen.queryByRole('checkbox', { name: 'Pilne' })).toBeNull()
})
