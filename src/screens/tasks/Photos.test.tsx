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
  // „+ Zdjęcie” znika – dalej kafelek „Dodaj”
  expect(within(sheet).queryByRole('button', { name: 'Zdjęcie' })).toBeNull()
  expect(within(sheet).getByRole('button', { name: 'Dodaj zdjęcie' })).toBeDefined()
  expect(within(sheet).getByText(/zmniejszamy do 1080 px/)).toBeDefined()

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
  expect(within(sheet).queryByRole('button', { name: 'Dodaj zdjęcie' })).toBeNull()
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
