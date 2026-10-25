import { act, cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { renderApp } from '../../test/renderApp.tsx'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const renderAt = (url: string, today = '2026-10-09') => renderApp(url, { today })

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

/** Otwiera arkusz zadania i przechodzi w „Edytuj”. */
function editTask(title: string) {
  click(`Otwórz zadanie ${title}`)
  const sheet = screen.getByRole('dialog', { name: 'Zadanie' })
  fireEvent.click(within(sheet).getByRole('button', { name: 'Edytuj' }))
  return sheet
}

test('arkusz zadania: najpierw do odczytu, „Edytuj” → zmiany → „Zapisz”', () => {
  renderAt('/zadania')
  click('Otwórz zadanie Baterie AA do pilota')
  const sheet = screen.getByRole('dialog', { name: 'Zadanie' })
  expect(within(sheet).getByText('DO ZROBIENIA · ZAKUPY')).toBeDefined()
  expect(within(sheet).getByText('Dodane: Hania')).toBeDefined()
  // odczyt: bez pól do wpisywania, z opisem
  expect(within(sheet).queryByLabelText('NAZWA')).toBeNull()
  expect(within(sheet).getByRole('heading', { name: 'Baterie AA do pilota' })).toBeDefined()
  expect(within(sheet).getByText('PRIORYTET')).toBeDefined()

  fireEvent.click(within(sheet).getByRole('button', { name: 'Edytuj' }))
  expect(within(sheet).queryByRole('button', { name: 'Usuń' })).toBeNull()
  fireEvent.change(within(sheet).getByLabelText('NAZWA'), {
    target: { value: 'Baterie AAA do pilota' },
  })
  fireEvent.click(within(sheet).getByRole('radio', { name: /Pilne/ }))
  fireEvent.click(within(sheet).getByRole('button', { name: 'Zapisz' }))
  // po zapisie – znów odczyt, z nowymi danymi
  expect(within(sheet).getByRole('heading', { name: 'Baterie AAA do pilota' })).toBeDefined()
  expect(within(sheet).getByRole('button', { name: 'Edytuj' })).toBeDefined()
  click('Zamknij')
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByText('Baterie AAA do pilota')).toBeDefined()
  expect(screen.getByText('5 pilnych')).toBeDefined()
})

test('arkusz: pusta nazwa – „Zapisz” nieaktywne; zamknięcie bez zapisu pyta „Odrzucić zmiany?”', () => {
  renderAt('/zadania')
  const sheet = editTask('Baterie AA do pilota')
  fireEvent.change(within(sheet).getByLabelText('NAZWA'), { target: { value: '  ' } })
  expect(
    (within(sheet).getByRole('button', { name: 'Zapisz' }) as HTMLButtonElement).disabled,
  ).toBe(true)
  click('Zamknij')
  const ask = screen.getByRole('alertdialog', { name: 'Odrzucić zmiany?' })
  // „Anuluj” – zostaje w edycji
  fireEvent.click(within(ask).getAllByRole('button', { name: 'Anuluj' }).at(-1)!)
  expect(within(sheet).getByLabelText('NAZWA')).toBeDefined()
  click('Zamknij')
  fireEvent.click(
    within(screen.getByRole('alertdialog', { name: 'Odrzucić zmiany?' })).getByRole('button', {
      name: 'Odrzuć',
    }),
  )
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByText('Baterie AA do pilota')).toBeDefined()
})

test('arkusz: „Anuluj” w edycji bez zmian – od razu wraca do odczytu', () => {
  renderAt('/zadania')
  const sheet = editTask('Baterie AA do pilota')
  fireEvent.click(within(sheet).getByRole('button', { name: 'Anuluj' }))
  expect(screen.queryByRole('alertdialog')).toBeNull()
  expect(within(sheet).getByRole('button', { name: 'Edytuj' })).toBeDefined()
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
  const sheet = editTask('Zapłacić rachunek za prąd')
  expect(
    within(sheet).getByRole('button', { name: 'CZ 15 PAŹ' }).getAttribute('aria-pressed'),
  ).toBe('true')
  expect((within(sheet).getByLabelText('Data terminu') as HTMLInputElement).value).toBe(
    '2026-10-15',
  )
})

test('podzadania: „˅” tylko przy krokach; odhaczenie ostatnich kroków ogarnia zadanie', () => {
  renderAt('/zadania')
  // po otwarciu wszystkie podzadania zwinięte
  const toggles = screen.getAllByRole('button', { name: /Pokaż podzadania|Zwiń podzadania/ })
  expect(toggles).toHaveLength(3)
  expect(toggles.every((b) => b.getAttribute('aria-expanded') === 'false')).toBe(true)
  expect(screen.queryByRole('button', { name: 'Zapakować' })).toBeNull()
  fireEvent.click(toggles[0])
  expect(toggles[0].getAttribute('aria-expanded')).toBe('true')
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
    'W koszu jest 5 elementów – zadania i wydarzenia. Tego nie da się cofnąć – znikną też u domownika.',
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
  const sheet = editTask('Baterie AA do pilota')
  const chip = (name: string) => within(sheet).getByRole('button', { name })
  fireEvent.click(chip('W tym tygodniu'))
  expect(chip('W tym tygodniu').getAttribute('aria-pressed')).toBe('true')
  expect(chip('Dziś').getAttribute('aria-pressed')).toBe('false')
  fireEvent.click(chip('Dziś'))
  expect(chip('Dziś').getAttribute('aria-pressed')).toBe('true')
  expect(chip('W tym tygodniu').getAttribute('aria-pressed')).toBe('false')
})

test('notatka: przy nowym zadaniu i w arkuszu zadania („Zapisz”)', () => {
  renderAt('/zadania?nowe=zadanie')
  const sheet = screen.getByRole('dialog', { name: 'Nowe zadanie' })
  fireEvent.change(within(sheet).getByLabelText('CO TRZEBA ZROBIĆ?'), {
    target: { value: 'Odebrać paczkę' },
  })
  fireEvent.change(within(sheet).getByLabelText(/NOTATKA/), {
    target: { value: 'Paczkomat przy Biedronce, kod 4821' },
  })
  fireEvent.click(within(sheet).getByRole('button', { name: 'Dodaj zadanie' }))
  click('Otwórz zadanie Odebrać paczkę')
  const detail = screen.getByRole('dialog', { name: 'Zadanie' })
  expect(within(detail).getByText('Paczkomat przy Biedronce, kod 4821')).toBeDefined()
  fireEvent.click(within(detail).getByRole('button', { name: 'Edytuj' }))
  const note = within(detail).getByLabelText(/NOTATKA/) as HTMLTextAreaElement
  expect(note.value).toBe('Paczkomat przy Biedronce, kod 4821')
  fireEvent.change(note, { target: { value: 'Kod 4821 – ważny do piątku' } })
  fireEvent.click(within(detail).getByRole('button', { name: 'Zapisz' }))
  expect(within(detail).getByText('Kod 4821 – ważny do piątku')).toBeDefined()
})

test('„Cofnij” cofa tylko ogarnięcie – późniejsza zmiana innego zadania zostaje', () => {
  vi.useFakeTimers()
  renderAt('/zadania')
  click('Oznacz jako ogarnięte: Baterie AA do pilota')
  // animacja ptaszka (~0,35 s), potem zadanie przechodzi do Ogarniętych
  act(() => vi.advanceTimersByTime(400))
  expect(screen.getByRole('status').textContent).toContain('Ogarnięte: Baterie AA do pilota')
  // w ciągu 4,5 s zmiana innego zadania (np. z drugiego telefonu albo w arkuszu)
  const sheet = editTask('Wymienić filtr w okapie')
  fireEvent.change(within(sheet).getByLabelText('NAZWA'), {
    target: { value: 'Wymienić filtr w okapie i umyć kratkę' },
  })
  fireEvent.click(within(sheet).getByRole('button', { name: 'Zapisz' }))
  click('Zamknij')
  click('COFNIJ')
  expect(screen.getByRole('button', { name: 'Otwórz zadanie Baterie AA do pilota' })).toBeDefined()
  expect(
    screen.getByRole('button', { name: 'Otwórz zadanie Wymienić filtr w okapie i umyć kratkę' }),
  ).toBeDefined()
})

test('zadanie z kosza wraca na swoje miejsce: kategoria, priorytet, termin, kroki', async () => {
  const router = renderAt('/zadania')
  const row = () =>
    screen.getByRole('button', { name: 'Otwórz zadanie Prezent dla mamy na imieniny' })
  const before = row().textContent
  expect(before).toContain('PILNE')
  expect(before).toContain('DO 16 PAŹ')
  expect(before).toContain('2 / 4 KROKI')
  const group = () => row().closest('section')!.querySelector('button')!.textContent

  expect(group()).toContain('ZAKUPY')
  click('Przenieś do kosza: Prezent dla mamy na imieniny')
  fireEvent.click(
    within(screen.getByRole('alertdialog', { name: 'Usunąć zadanie?' })).getByRole('button', {
      name: 'Usuń',
    }),
  )
  expect(screen.queryByRole('button', { name: /Otwórz zadanie Prezent/ })).toBeNull()

  await act(() => router.navigate('/ustawienia/kosz'))
  click('Przywróć: Prezent dla mamy na imieniny')
  await act(() => router.navigate('/zadania'))
  expect(row().textContent).toBe(before)
  expect(group()).toContain('ZAKUPY')
  fireEvent.click(
    within(row().parentElement!.parentElement!).getByRole('button', { name: 'Pokaż podzadania' }),
  )
  for (const step of [
    'Wybrać prezent',
    'Kupić kartkę',
    'Zapakować',
    'Odebrać kwiaty w piątek rano',
  ])
    expect(screen.getByRole('button', { name: step })).toBeDefined()
})
