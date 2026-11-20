// Zdjęcia w arkuszu zadania (etap 9, krok 2) – na przykładowych danych (MockStore udaje zmniejszanie).

import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { renderApp } from '../../test/renderApp.tsx'

afterEach(cleanup)

const photoFile = () => new File(['zdjecie'], 'kran.jpg', { type: 'image/jpeg' })

/** Wybór zdjęcia z aparatu / galerii (ukryte pole pliku w arkuszu). */
async function pickPhoto(sheet: HTMLElement, n: number) {
  const input = sheet.querySelector<HTMLInputElement>('input[type="file"]')!
  expect(input.accept).toBe('image/*')
  fireEvent.change(input, { target: { files: [photoFile()] } })
  await within(sheet).findByAltText(`Zdjęcie ${n}`)
}

const newTaskSheet = () => {
  renderApp('/zadania?nowe=zadanie', { today: '2026-10-09' })
  return screen.getByRole('dialog', { name: 'Nowe zadanie' })
}

test('nowe zadanie: „+ Zdjęcie” → sekcja ZDJĘCIA z licznikiem; × usuwa, COFNIJ przywraca', async () => {
  const sheet = newTaskSheet()
  expect(within(sheet).queryByText('ZDJĘCIA')).toBeNull()
  expect(within(sheet).getByRole('button', { name: 'Zdjęcie' })).toBeDefined()

  await pickPhoto(sheet, 1)
  expect(within(sheet).getByText('ZDJĘCIA')).toBeDefined()
  expect(within(sheet).getByText('1 z 5')).toBeDefined()
  // „+ Zdjęcie” znika – dalej kafelki „Aparat” i „Galeria”
  expect(within(sheet).queryByRole('button', { name: 'Zdjęcie' })).toBeNull()
  expect(within(sheet).getByRole('button', { name: 'Zrób zdjęcie' })).toBeDefined()
  expect(within(sheet).getByRole('button', { name: 'Dodaj z galerii' })).toBeDefined()
  expect(within(sheet).getByText(/do 1080 px/)).toBeDefined()

  fireEvent.click(within(sheet).getByRole('button', { name: 'Usuń zdjęcie 1' }))
  expect(within(sheet).queryByAltText('Zdjęcie 1')).toBeNull()
  expect(screen.getByRole('status').textContent).toBe('Usunięto zdjęcieCOFNIJ')
  fireEvent.click(screen.getByRole('button', { name: 'COFNIJ' }))
  expect(within(sheet).getByAltText('Zdjęcie 1')).toBeDefined()
})

test('najwyżej 5 zdjęć: potem bez „Dodaj” i z podpowiedzią', async () => {
  const sheet = newTaskSheet()
  for (let n = 1; n <= 5; n++) await pickPhoto(sheet, n)
  expect(within(sheet).getByText('5 z 5')).toBeDefined()
  expect(within(sheet).queryByRole('button', { name: 'Zrób zdjęcie' })).toBeNull()
  expect(within(sheet).queryByRole('button', { name: 'Dodaj z galerii' })).toBeNull()
  expect(within(sheet).getByText('To już 5 zdjęć – usuń jedno, żeby dodać kolejne.')).toBeDefined()
})

test('zdjęcia zapisują się razem z nowym zadaniem; w edycji widać je i można dodać kolejne', async () => {
  const sheet = newTaskSheet()
  fireEvent.change(within(sheet).getByLabelText('CO TRZEBA ZROBIĆ?'), {
    target: { value: 'Naprawić kran' },
  })
  await pickPhoto(sheet, 1)
  fireEvent.click(within(sheet).getByRole('button', { name: 'Dodaj zadanie' }))

  fireEvent.click(screen.getByText('Naprawić kran'))
  const detail = screen.getByRole('dialog', { name: 'Zadanie' })
  fireEvent.click(within(detail).getByRole('button', { name: 'Edytuj' }))
  expect(await within(detail).findByAltText('Zdjęcie 1')).toBeDefined()
  expect(within(detail).getByText('1 z 5')).toBeDefined()

  // dodane w edycji i „Anuluj” → nic się nie zapisuje
  await pickPhoto(detail, 2)
  fireEvent.click(within(detail).getByRole('button', { name: 'Anuluj' }))
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /Odrzuć/ }))
  fireEvent.click(within(detail).getByRole('button', { name: 'Edytuj' }))
  expect(within(detail).getByText('1 z 5')).toBeDefined()

  // dodane i „Zapisz” → zostaje
  await pickPhoto(detail, 2)
  fireEvent.click(within(detail).getByRole('button', { name: 'Zapisz' }))
  fireEvent.click(within(detail).getByRole('button', { name: 'Edytuj' }))
  expect(await within(detail).findByText('2 z 5')).toBeDefined()
})

// ── Krok 3: arkusz do odczytu, podgląd, lista ──────────────────────────────

/** Nowe zadanie z `n` zdjęciami – jak w aplikacji. */
async function taskWithPhotos(title: string, n: number) {
  const sheet = newTaskSheet()
  fireEvent.change(within(sheet).getByLabelText('CO TRZEBA ZROBIĆ?'), { target: { value: title } })
  for (let i = 1; i <= n; i++) await pickPhoto(sheet, i)
  fireEvent.click(within(sheet).getByRole('button', { name: 'Dodaj zadanie' }))
}

test('lista: ikona aparatu z liczbą zdjęć i miniatura; arkusz do odczytu – rząd miniatur', async () => {
  await taskWithPhotos('Naprawić kran', 2)
  expect(await screen.findByLabelText('2 zdjęcia')).toBeDefined()
  const row = screen.getByRole('button', { name: 'Otwórz zadanie Naprawić kran' }).parentElement!
  expect(row.querySelector('img')?.getAttribute('src')).toContain('base64,MINI')

  fireEvent.click(screen.getByText('Naprawić kran'))
  const detail = screen.getByRole('dialog', { name: 'Zadanie' })
  expect(within(detail).getByText('ZDJĘCIA')).toBeDefined()
  expect(within(detail).getByText(/2\s+zdjęcia/)).toBeDefined()
  expect(within(detail).getByRole('button', { name: 'Otwórz zdjęcie 2 z 2' })).toBeDefined()
})

test('podgląd: „1 / 2”, następne, zapis na telefonie (pobranie pliku), Escape zamyka', async () => {
  const created = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:pelne')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  const downloads: string[] = []
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloads.push(this.download)
  })
  await taskWithPhotos('Naprawić kran', 2)
  fireEvent.click(screen.getByText('Naprawić kran'))
  fireEvent.click(screen.getByRole('button', { name: 'Otwórz zdjęcie 1 z 2' }))
  const viewer = screen.getByRole('dialog', { name: 'Podgląd zdjęcia' })
  expect(within(viewer).getByText('1 / 2')).toBeDefined()
  fireEvent.click(within(viewer).getByRole('button', { name: 'Następne zdjęcie' }))
  expect(within(viewer).getByText('2 / 2')).toBeDefined()
  // pełna wersja wczytana dopiero w podglądzie
  const save = within(viewer).getByRole('button', { name: 'Zapisz na telefonie' })
  await waitFor(() => expect((save as HTMLButtonElement).disabled).toBe(false))
  expect(created).toHaveBeenCalled()
  fireEvent.click(save)
  await waitFor(() => expect(downloads).toEqual(['naprawic-kran-2.webp']))
  fireEvent.keyDown(window, { key: 'Escape' })
  expect(screen.queryByRole('dialog', { name: 'Podgląd zdjęcia' })).toBeNull()
  vi.restoreAllMocks()
})

test('podgląd: „Usuń zdjęcie” pyta; COFNIJ przywraca; bez cofnięcia zdjęcie znika po chwili', async () => {
  await taskWithPhotos('Naprawić kran', 1)
  fireEvent.click(screen.getByText('Naprawić kran'))
  const detail = screen.getByRole('dialog', { name: 'Zadanie' })
  const openViewer = () => {
    fireEvent.click(within(detail).getByRole('button', { name: 'Otwórz zdjęcie 1 z 1' }))
    return screen.getByRole('dialog', { name: 'Podgląd zdjęcia' })
  }
  let viewer = openViewer()
  fireEvent.click(within(viewer).getByRole('button', { name: 'Usuń zdjęcie' }))
  const ask = within(viewer).getByRole('alertdialog', { name: 'Usunąć zdjęcie?' })
  expect(
    within(ask).getByText('Zniknie z zadania. Możesz je przywrócić paskiem COFNIJ.'),
  ).toBeDefined()
  fireEvent.click(within(ask).getByRole('button', { name: 'Usuń' }))
  // jedyne zdjęcie – podgląd się zamyka, w arkuszu go nie ma, pasek COFNIJ przywraca
  expect(screen.queryByRole('dialog', { name: 'Podgląd zdjęcia' })).toBeNull()
  expect(within(detail).queryByText('ZDJĘCIA')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'COFNIJ' }))
  expect(within(detail).getByText('ZDJĘCIA')).toBeDefined()

  vi.useFakeTimers()
  viewer = openViewer()
  fireEvent.click(within(viewer).getByRole('button', { name: 'Usuń zdjęcie' }))
  fireEvent.click(
    within(within(viewer).getByRole('alertdialog')).getByRole('button', { name: 'Usuń' }),
  )
  await act(async () => {
    vi.advanceTimersByTime(4600)
  })
  vi.useRealTimers()
  // zapisane: przy zadaniu na liście już bez zdjęć
  await waitFor(() => expect(screen.queryByLabelText('1 zdjęcie')).toBeNull())
  expect(within(detail).queryByText('ZDJĘCIA')).toBeNull()
})

// ── Krok 4: zadania cykliczne ──────────────────────────────────────────────

test('zadanie cykliczne: wybór „przy każdym powtórzeniu” / „tylko tym razem”; następne ma zdjęcia serii', async () => {
  renderApp('/zadania', { today: '2026-10-09' })
  fireEvent.click(screen.getByRole('button', { name: 'Otwórz zadanie Zebranie w szkole' }))
  const detail = screen.getByRole('dialog', { name: 'Zadanie' })
  fireEvent.click(within(detail).getByRole('button', { name: 'Edytuj' }))

  // „+ Zdjęcie” → najpierw pytanie, domyślnie „Tylko tym razem”
  fireEvent.click(within(detail).getByRole('button', { name: 'Zdjęcie' }))
  const choice = within(detail).getByRole('group', { name: 'Gdzie dodać zdjęcie?' })
  expect(
    within(choice)
      .getByRole('button', { name: /^Tylko tym razem/ })
      .getAttribute('aria-pressed'),
  ).toBe('true')
  fireEvent.click(within(choice).getByRole('button', { name: /^Przy każdym powtórzeniu/ }))
  fireEvent.click(within(choice).getByRole('button', { name: 'Z galerii' }))
  await pickPhoto(detail, 1)
  expect(within(detail).getByText('PRZY KAŻDYM POWTÓRZENIU')).toBeDefined()
  expect(within(detail).getByText('1 z 5 razem')).toBeDefined()

  // drugie – „tylko tym razem”
  fireEvent.click(within(detail).getByRole('button', { name: 'Dodaj zdjęcie' }))
  fireEvent.click(within(detail).getByRole('button', { name: 'Z galerii' }))
  await pickPhoto(detail, 2)
  expect(within(detail).getByText('TYLKO TYM RAZEM')).toBeDefined()
  expect(within(detail).getByText('2 z 5 razem')).toBeDefined()
  fireEvent.click(within(detail).getByRole('button', { name: 'Zapisz' }))
  expect(await screen.findByLabelText('2 zdjęcia')).toBeDefined()

  // ogarnięte → następne powtórzenie ma tylko zdjęcie serii
  fireEvent.click(within(detail).getByRole('button', { name: 'Ogarnij' }))
  expect(await screen.findByLabelText('1 zdjęcie')).toBeDefined()
  fireEvent.click(screen.getByRole('button', { name: 'Otwórz zadanie Zebranie w szkole' }))
  const next = screen.getByRole('dialog', { name: 'Zadanie' })
  expect(within(next).getByText(/1\s+zdjęcie/)).toBeDefined()
  expect(within(next).getByRole('button', { name: 'Otwórz zdjęcie 1 z 1' })).toBeDefined()
})

test('podgląd zadania cyklicznego: „Przenieś do…” i pytanie o usunięcie ze wszystkich powtórzeń', async () => {
  renderApp('/zadania', { today: '2026-10-09' })
  fireEvent.click(screen.getByRole('button', { name: 'Otwórz zadanie Zebranie w szkole' }))
  const detail = screen.getByRole('dialog', { name: 'Zadanie' })
  fireEvent.click(within(detail).getByRole('button', { name: 'Edytuj' }))
  fireEvent.click(within(detail).getByRole('button', { name: 'Zdjęcie' }))
  fireEvent.click(within(detail).getByRole('button', { name: 'Z galerii' }))
  await pickPhoto(detail, 1)
  fireEvent.click(within(detail).getByRole('button', { name: 'Zapisz' }))

  fireEvent.click(await within(detail).findByRole('button', { name: 'Otwórz zdjęcie 1 z 1' }))
  const viewer = screen.getByRole('dialog', { name: 'Podgląd zdjęcia' })
  fireEvent.click(
    within(viewer).getByRole('button', { name: 'Przenieś do: przy każdym powtórzeniu' }),
  )
  expect(
    await within(viewer).findByRole('button', { name: 'Przenieś do: tylko tym razem' }),
  ).toBeDefined()
  expect(within(viewer).getByText(/przy każdym powtórzeniu$/)).toBeDefined()
  fireEvent.click(within(viewer).getByRole('button', { name: 'Usuń zdjęcie' }))
  expect(within(viewer).getByText('Usunąć ze wszystkich powtórzeń?')).toBeDefined()
})

// ── Krok 5: miejsce na zdjęcia w Ustawieniach ──────────────────────────────

test('Ustawienia → Porządki: „Miejsce na zdjęcia” – zajęte z 150 MB, z paskiem', () => {
  renderApp('/ustawienia', { today: '2026-10-09' })
  expect(screen.getByText('Miejsce na zdjęcia')).toBeDefined()
  expect(screen.getByText('0 MB z 150 MB')).toBeDefined()
  expect(
    screen
      .getByRole('progressbar', { name: 'Zajęte miejsce na zdjęcia' })
      .getAttribute('aria-valuenow'),
  ).toBe('0')
  expect(screen.getByText(/mieści się ok\. 1000 zdjęć/)).toBeDefined()
})

// ── Poprawki Hani 2026-11-20 ───────────────────────────────────────────────

test('kilka zdjęć naraz z galerii; ponad limit – dodane pierwsze, z komunikatem', async () => {
  const sheet = newTaskSheet()
  const input = sheet.querySelector<HTMLInputElement>('input[type="file"]')!
  expect(input.multiple).toBe(true)
  fireEvent.change(input, { target: { files: [photoFile(), photoFile(), photoFile()] } })
  expect(await within(sheet).findByAltText('Zdjęcie 3')).toBeDefined()
  expect(within(sheet).getByText('3 z 5')).toBeDefined()
  fireEvent.change(input, {
    target: { files: [photoFile(), photoFile(), photoFile(), photoFile()] },
  })
  expect(await within(sheet).findByAltText('Zdjęcie 5')).toBeDefined()
  expect(within(sheet).getByText('5 z 5')).toBeDefined()
  expect(within(sheet).getByRole('alert').textContent).toBe(
    'Zmieszczą się jeszcze tylko 2 – dodano pierwsze 2.',
  )
})

test('„Edytuj” – bez klawiatury: pole nazwy nie dostaje kursora od razu', () => {
  renderApp('/zadania', { today: '2026-10-09' })
  fireEvent.click(screen.getByRole('button', { name: 'Otwórz zadanie Baterie AA do pilota' }))
  const detail = screen.getByRole('dialog', { name: 'Zadanie' })
  fireEvent.click(within(detail).getByRole('button', { name: 'Edytuj' }))
  expect(document.activeElement).not.toBe(within(detail).getByLabelText('NAZWA'))
})

test('Kosz: „Wybierz” → zaznaczone elementy usunięte na zawsze, reszta zostaje', () => {
  renderApp('/ustawienia/kosz', { today: '2026-10-09' })
  expect(screen.getByText('5 elementów')).toBeDefined()
  fireEvent.click(screen.getByRole('button', { name: 'Wybierz' }))
  // w trybie wyboru – bez „Przywróć”, przycisk na dole nieaktywny, dopóki nic nie zaznaczone
  expect(screen.queryByRole('button', { name: /^Przywróć: / })).toBeNull()
  const remove = screen.getByRole('button', { name: /Zaznacz, co usunąć/ })
  expect((remove as HTMLButtonElement).disabled).toBe(true)
  const boxes = screen.getAllByRole('checkbox')
  fireEvent.click(boxes[0])
  fireEvent.click(boxes[1])
  expect(boxes[0].getAttribute('aria-checked')).toBe('true')
  fireEvent.click(screen.getByRole('button', { name: /Usuń zaznaczone \(2\)/ }))
  const sheet = screen.getByRole('dialog', { name: 'Usuń zaznaczone' })
  expect(within(sheet).getByText(/Zaznaczone: 2 elementy/)).toBeDefined()
  fireEvent.click(within(sheet).getByRole('button', { name: 'Usuń na zawsze' }))
  expect(screen.getByText('3 elementy')).toBeDefined()
  // po usunięciu – znów zwykły widok z „Przywróć”
  expect(screen.getAllByRole('button', { name: /^Przywróć: / })).toHaveLength(3)
})

test('„+ Zdjęcie”: od razu „Aparat” (zdjęcie z aparatu) i „Galeria” (kilka naraz)', async () => {
  const sheet = newTaskSheet()
  fireEvent.click(within(sheet).getByRole('button', { name: 'Zdjęcie' }))
  expect(within(sheet).getByText('ZDJĘCIA')).toBeDefined()
  expect(within(sheet).getByRole('button', { name: 'Zrób zdjęcie' })).toBeDefined()
  expect(within(sheet).getByRole('button', { name: 'Dodaj z galerii' })).toBeDefined()
  const camera = sheet.querySelector<HTMLInputElement>('input[data-zrodlo="aparat"]')!
  expect(camera.getAttribute('capture')).toBe('environment')
  expect(camera.multiple).toBe(false)
  fireEvent.change(camera, { target: { files: [photoFile()] } })
  expect(await within(sheet).findByAltText('Zdjęcie 1')).toBeDefined()
})

test('przycinanie: „Przytnij zdjęcie” otwiera ramkę; „Anuluj” – bez zmian', async () => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:zdjecie')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  const sheet = newTaskSheet()
  await pickPhoto(sheet, 1)
  fireEvent.click(within(sheet).getByRole('button', { name: 'Przytnij zdjęcie 1' }))
  const cropper = await screen.findByRole('dialog', { name: 'Przytnij zdjęcie' })
  expect(within(cropper).getByRole('group', { name: 'Ramka przycięcia' })).toBeDefined()
  expect(within(cropper).getByRole('button', { name: 'Prawy dolny róg ramki' })).toBeDefined()
  fireEvent.click(within(cropper).getByRole('button', { name: 'Anuluj' }))
  expect(screen.queryByRole('dialog', { name: 'Przytnij zdjęcie' })).toBeNull()
  expect(within(sheet).getByText('1 z 5')).toBeDefined()
  vi.restoreAllMocks()
})
