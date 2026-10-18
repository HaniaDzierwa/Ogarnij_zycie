import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import { routes } from '../../app/router.tsx'
import { MockStoreProvider } from '../../data/MockStore.tsx'
import { MemoryAuthProvider } from '../../auth/MemoryAuthProvider.tsx'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function renderAt(url: string, today = '2026-10-09') {
  const router = createMemoryRouter(routes, { initialEntries: [url] })
  render(
    <MemoryAuthProvider>
      <MockStoreProvider today={today}>
        <RouterProvider router={router} />
      </MockStoreProvider>
    </MemoryAuthProvider>,
  )
  return router
}

const tab = (name: RegExp) => screen.getByRole('tab', { name })
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }))

test('nagłówek i zakładki: 12 otwartych, 4 pilne; Do zrobienia 12 · Ogarnięte 7', () => {
  renderAt('/zadania')
  expect(screen.getByText('12 otwartych')).toBeDefined()
  expect(screen.getByText('4 pilne')).toBeDefined()
  expect(tab(/Do zrobienia/).textContent).toBe('Do zrobienia12')
  expect(tab(/Ogarnięte/).textContent).toBe('Ogarnięte7')
  expect(tab(/Do zrobienia/).getAttribute('aria-selected')).toBe('true')
})

test('filtr „Pokaż” nie ma już „Ogarnięte”', () => {
  renderAt('/zadania')
  click(/Filtry/)
  const panel = document.getElementById('panel-filtrow')!
  expect(within(panel).queryByRole('button', { name: 'Ogarnięte' })).toBeNull()
  expect(within(panel).getByRole('button', { name: 'Przy okazji' })).toBeDefined()
})

test('kwadracik: najpierw ptaszek, po chwili „Ogarnięte: … · COFNIJ”; COFNIJ przywraca', () => {
  vi.useFakeTimers()
  renderAt('/zadania')
  click('Oznacz jako ogarnięte: Baterie AA do pilota')
  // animacja zaznaczenia – zadanie jeszcze na liście
  expect(tab(/Ogarnięte/).textContent).toBe('Ogarnięte7')
  act(() => vi.advanceTimersByTime(400))
  expect(screen.getByRole('status').textContent).toBe('Ogarnięte: Baterie AA do pilotaCOFNIJ')
  expect(tab(/Ogarnięte/).textContent).toBe('Ogarnięte8')
  click('COFNIJ')
  expect(tab(/Ogarnięte/).textContent).toBe('Ogarnięte7')
  expect(screen.queryByRole('status')).toBeNull()
})

test('pasek „Cofnij” znika po ok. 4,5 s', () => {
  vi.useFakeTimers()
  renderAt('/zadania')
  click('Oznacz jako ogarnięte: Baterie AA do pilota')
  act(() => vi.advanceTimersByTime(400))
  expect(screen.getByRole('status')).toBeDefined()
  act(() => vi.advanceTimersByTime(4600))
  expect(screen.queryByRole('status')).toBeNull()
})

test('w lewo = do kosza (przycisk dla czytników), pasek i licznik KOSZ', () => {
  renderAt('/zadania')
  click('Przenieś do kosza: Baterie AA do pilota')
  const ask = screen.getByRole('alertdialog', { name: 'Usunąć zadanie?' })
  expect(ask.textContent).toContain(
    '„Baterie AA do pilota” trafi do kosza. Możesz je przywrócić przez 30 dni.',
  )
  fireEvent.click(within(ask).getByText('Anuluj'))
  expect(screen.getByText('12 otwartych')).toBeDefined()
  click('Przenieś do kosza: Baterie AA do pilota')
  fireEvent.click(
    within(screen.getByRole('alertdialog', { name: 'Usunąć zadanie?' })).getByRole('button', {
      name: 'Usuń',
    }),
  )
  expect(screen.getByRole('status').textContent).toContain(
    'Przeniesiono do kosza: Baterie AA do pilota',
  )
  expect(screen.getByText('11 otwartych')).toBeDefined()
  fireEvent.click(tab(/Ogarnięte/))
  // Kosz tylko z Ustawień – w Ogarniętych bez linku
  expect(screen.getByText('Najnowsze na górze')).toBeDefined()
  expect(screen.queryByRole('link', { name: /KOSZ/ })).toBeNull()
})

test('klik w treść otwiera arkusz zadania; edycja w miejscu, „Gotowe” zamyka', () => {
  renderAt('/zadania')
  click('Otwórz zadanie Baterie AA do pilota')
  const sheet = screen.getByRole('dialog', { name: 'Zadanie' })
  expect(within(sheet).getByText('DO ZROBIENIA · ZAKUPY')).toBeDefined()
  expect(within(sheet).getByText(/Dodane: Hania · zmiany zapisują się od razu/)).toBeDefined()
  fireEvent.change(within(sheet).getByLabelText('Nazwa zadania'), {
    target: { value: 'Baterie AAA do pilota' },
  })
  fireEvent.click(within(sheet).getByRole('radio', { name: /Pilne/ }))
  fireEvent.click(within(sheet).getByRole('button', { name: 'Gotowe' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByText('Baterie AAA do pilota')).toBeDefined()
  expect(screen.getByText('5 pilnych')).toBeDefined()
})

test('arkusz: pusta nazwa po „Gotowe” wraca do poprzedniej', () => {
  renderAt('/zadania')
  click('Otwórz zadanie Baterie AA do pilota')
  const sheet = screen.getByRole('dialog', { name: 'Zadanie' })
  fireEvent.change(within(sheet).getByLabelText('Nazwa zadania'), { target: { value: '  ' } })
  fireEvent.click(within(sheet).getByRole('button', { name: 'Gotowe' }))
  expect(screen.getByText('Baterie AA do pilota')).toBeDefined()
})

test('arkusz: „Ogarnij” zamyka i ogarnia; „Usuń” przenosi do kosza', () => {
  renderAt('/zadania')
  click('Otwórz zadanie Baterie AA do pilota')
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Ogarnij' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByText('11 otwartych')).toBeDefined()
  click('Otwórz zadanie Wymienić filtr w okapie')
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Usuń' }))
  fireEvent.click(
    within(screen.getByRole('alertdialog', { name: 'Usunąć zadanie?' })).getByRole('button', {
      name: 'Usuń',
    }),
  )
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByRole('status').textContent).toContain('Przeniesiono do kosza')
})

test('arkusz: termin spoza chipów = chip z datą + kalendarz', () => {
  renderAt('/zadania')
  click('Otwórz zadanie Zapłacić rachunek za prąd')
  const sheet = screen.getByRole('dialog', { name: 'Zadanie' })
  expect(
    within(sheet).getByRole('button', { name: 'CZ 15 PAŹ' }).getAttribute('aria-pressed'),
  ).toBe('true')
  expect((within(sheet).getByLabelText('Data terminu') as HTMLInputElement).value).toBe(
    '2026-10-15',
  )
})

test('podzadania: „˅” tylko przy krokach; odhaczenie ostatnich kroków ogarnia zadanie', () => {
  renderAt('/zadania')
  expect(screen.getAllByRole('button', { name: /Pokaż podzadania|Zwiń podzadania/ })).toHaveLength(
    3,
  )
  click('Zapakować')
  click('Odebrać kwiaty w piątek rano')
  expect(screen.getByRole('status').textContent).toContain(
    'Ogarnięte: Prezent dla mamy na imieniny',
  )
  expect(screen.getByText('11 otwartych')).toBeDefined()
})

test('zakładka Ogarnięte: grupy po dacie, kto i kiedy; kwadracik przywraca', () => {
  renderAt('/zadania?zakladka=ogarniete')
  expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
    'DZIŚ',
    'WCZORAJ',
    'W TYM TYGODNIU',
    'WCZEŚNIEJ',
  ])
  expect(
    screen.getByRole('button', { name: 'Otwórz zadanie Założyć opony zimowe' }).textContent,
  ).toContain('WAŻNEKRZYŚ')
  expect(screen.getByText('11:40')).toBeDefined()
  expect(screen.getByText('wczoraj')).toBeDefined()
  click('Przywróć do „Do zrobienia”: Mleko i chleb')
  expect(screen.getByRole('status').textContent).toContain(
    'Wróciło do „Do zrobienia”: Mleko i chleb',
  )
  expect(screen.getByText('13 otwartych')).toBeDefined()
})

test('Wyczyść: starsze niż 7 dni → 2 zadania do kosza, „Cofnij” je przywraca', () => {
  renderAt('/zadania?zakladka=ogarniete')
  click('Wyczyść')
  const sheet = screen.getByRole('dialog', { name: 'Wyczyść ogarnięte' })
  expect(within(sheet).getByRole('radio', { name: /Starsze niż 7 dni/ }).textContent).toContain(
    '2 zadania',
  )
  fireEvent.click(within(sheet).getByRole('button', { name: /Do kosza \(2\)/ }))
  expect(screen.getByRole('status').textContent).toContain('Przeniesiono do kosza: 2 zadania')
  expect(tab(/Ogarnięte/).textContent).toBe('Ogarnięte5')
  click('COFNIJ')
  expect(tab(/Ogarnięte/).textContent).toBe('Ogarnięte7')
})

test('?pokaz=pilne: filtr aktywny, chip z „×”', () => {
  renderAt('/zadania?pokaz=pilne')
  expect(screen.getByLabelText('Aktywne filtry: 1')).toBeDefined()
  click('Usuń filtr: Pilne')
  expect(screen.queryByLabelText(/Aktywne filtry/)).toBeNull()
})

test('„+” → „Zadanie”: nowe zadanie trafia na listę', () => {
  const router = renderAt('/zadania?nowe=zadanie')
  const sheet = screen.getByRole('dialog', { name: 'Nowe zadanie' })
  fireEvent.change(within(sheet).getByLabelText('CO TRZEBA ZROBIĆ?'), {
    target: { value: 'Kupić żarówki' },
  })
  fireEvent.click(within(sheet).getByRole('button', { name: 'Dodaj zadanie' }))
  expect(router.state.location.search).toBe('')
  expect(screen.getByText('Kupić żarówki')).toBeDefined()
  expect(screen.getByText('13 otwartych')).toBeDefined()
})

test('Kosz (z Ustawień): zadania i wydarzenia, chipy, przywracanie z „Cofnij”, opróżnianie', () => {
  renderAt('/ustawienia/kosz')
  expect(screen.getByRole('link', { name: /USTAWIENIA/ }).getAttribute('href')).toBe('/ustawienia')
  expect(screen.getByText('5 elementów')).toBeDefined()
  expect(screen.getByText(/ZAKUPY · HANIA · 2 DNI TEMU/)).toBeDefined()
  expect(screen.getByText(/WYDARZENIE · ŚR 14 PAŹ · 17:00 · KRZYŚ/)).toBeDefined()
  expect(screen.getByText(/IMPREZA · PT 23 PAŹ · 19:00 · HANIA/)).toBeDefined()
  expect(screen.getByText('zniknie za 3 dni')).toBeDefined()
  // najnowsze najpierw
  expect(
    screen.getAllByRole('button', { name: /^Przywróć: / }).map((x) => x.getAttribute('aria-label')),
  ).toEqual([
    'Przywróć: Basen z dziećmi',
    'Przywróć: Kupić nowy czajnik',
    'Przywróć: Umówić przegląd pieca',
    'Przywróć: Kolacja u Nowaków',
    'Przywróć: Odnowić kartę biblioteczną',
  ])

  click(/^Zadania/)
  expect(screen.queryByText('Basen z dziećmi')).toBeNull()
  expect(screen.getAllByRole('button', { name: /^Przywróć: / })).toHaveLength(3)
  click(/^Wydarzenia/)
  expect(screen.getAllByRole('button', { name: /^Przywróć: / })).toHaveLength(2)
  click(/^Wszystko/)

  click('Przywróć: Kupić nowy czajnik')
  expect(screen.getByRole('status').textContent).toContain('Wróciło do zadań: Kupić nowy czajnik')
  expect(screen.getByText('4 elementy')).toBeDefined()
  click('COFNIJ')
  expect(screen.getByText('5 elementów')).toBeDefined()

  click('Opróżnij kosz')
  const sheet = screen.getByRole('dialog', { name: 'Opróżnij kosz' })
  expect(sheet.textContent).toContain(
    'W koszu jest 5 elementów – zadania i wydarzenia. Tego nie da się cofnąć – znikną też u Krzysia.',
  )
  fireEvent.click(within(sheet).getByRole('button', { name: 'Usuń na zawsze' }))
  expect(screen.getByText('Kosz jest pusty')).toBeDefined()
})

test('panel filtrów zamyka dotknięcie poza nim (tło nad całym ekranem, także nagłówkiem)', () => {
  renderAt('/zadania')
  click('Filtry')
  expect(document.getElementById('panel-filtrow')).not.toBeNull()
  // wybór w panelu go nie zamyka
  const panel = document.getElementById('panel-filtrow')!
  fireEvent.click(within(panel).getByRole('button', { name: 'Pilne' }))
  expect(document.getElementById('panel-filtrow')).not.toBeNull()
  click('Zamknij filtry')
  expect(document.getElementById('panel-filtrow')).toBeNull()
})

test('arkusz: w niedzielę „W tym tygodniu” da się wybrać, choć to ten sam dzień co „Dziś”', () => {
  renderAt('/zadania', '2026-10-18')
  click('Otwórz zadanie Baterie AA do pilota')
  const sheet = screen.getByRole('dialog', { name: 'Zadanie' })
  const chip = (name: string) => within(sheet).getByRole('button', { name })
  fireEvent.click(chip('W tym tygodniu'))
  expect(chip('W tym tygodniu').getAttribute('aria-pressed')).toBe('true')
  expect(chip('Dziś').getAttribute('aria-pressed')).toBe('false')
  fireEvent.click(chip('Dziś'))
  expect(chip('Dziś').getAttribute('aria-pressed')).toBe('true')
  expect(chip('W tym tygodniu').getAttribute('aria-pressed')).toBe('false')
})
