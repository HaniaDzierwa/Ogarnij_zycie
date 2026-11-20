// Zdjęcia w arkuszu zadania (etap 9, krok 2) – na przykładowych danych (MockStore udaje zmniejszanie).

import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
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
