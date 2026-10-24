import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { MEMORY_INVITE_CODES } from '../house/memoryInvites.ts'
import { renderApp } from '../test/renderApp.tsx'

afterEach(cleanup)

const { valid, expired, used } = MEMORY_INVITE_CODES

const typeCode = (value: string) =>
  fireEvent.change(screen.getByLabelText('WPISZ 6 CYFR'), { target: { value } })

test('Dołącz: 6 cyfr (bez skanera), teksty bez Wi‑Fi, podpowiedź o linku', async () => {
  renderApp('/dolacz', { noHouse: true, noMembers: true })
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Dołącz do domu')
  expect(screen.queryByRole('button', { name: /Skanuj/ })).toBeNull()
  expect(screen.queryByText(/aparat/)).toBeNull()
  expect(screen.getByText(/Jest ważny 10 minut/)).toBeDefined()
  expect(
    screen.getByText('Masz link? Otwórz go na tym telefonie – dołączysz od razu.'),
  ).toBeDefined()
  expect(screen.queryByText(/Wi‑Fi/)).toBeNull()
  typeCode('4829')
  expect((screen.getByLabelText('WPISZ 6 CYFR') as HTMLInputElement).value).toBe('482 9')
  typeCode(valid)
  expect(await screen.findByText('ZNALEZIONO DOM')).toBeDefined()
  expect(screen.getByText('na Leśnej')).toBeDefined()
  expect(screen.getByText(/^Hania i Krzyś$/)).toBeDefined()
})

test('zły, przeterminowany albo użyty kod – komunikat, bez „Znaleziono dom”', async () => {
  renderApp('/dolacz', { noHouse: true, noMembers: true })
  typeCode('999999')
  expect((await screen.findByRole('alert')).textContent).toBe(
    'Nie ma takiego kodu. Sprawdź cyfry albo poproś o nowy kod.',
  )
  typeCode(expired)
  expect((await screen.findByRole('alert')).textContent).toMatch(/Ten kod już wygasł/)
  typeCode(used)
  expect((await screen.findByRole('alert')).textContent).toMatch(/Ten kod został już użyty/)
  expect(screen.queryByText('ZNALEZIONO DOM')).toBeNull()
})

test('bez internetu – komunikat o połączeniu', async () => {
  const spy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  renderApp('/dolacz', { noHouse: true, noMembers: true })
  typeCode(valid)
  expect((await screen.findByRole('alert')).textContent).toBe(
    'Brak internetu – dołączanie wymaga połączenia.',
  )
  spy.mockRestore()
})

test('link z zaproszenia (?kod=) od razu pokazuje dom; „To nie ten dom” wraca', async () => {
  renderApp(`/dolacz?kod=${valid}`, { noHouse: true, noMembers: true })
  expect(await screen.findByText('ZNALEZIONO DOM')).toBeDefined()
  fireEvent.click(screen.getByRole('button', { name: 'TO NIE TEN DOM' }))
  expect(screen.getByLabelText('WPISZ 6 CYFR')).toBeDefined()
})

test('„Dołącz jako Ola” zapisuje domownika i otwiera Start', async () => {
  const onJoin = vi.fn()
  const router = renderApp(`/dolacz?kod=${valid}`, { noHouse: true, onJoin })
  await screen.findByText('ZNALEZIONO DOM')
  const button = screen.getByRole('button', { name: /Dołącz jako domownik/ }) as HTMLButtonElement
  expect(button.disabled).toBe(true)
  fireEvent.change(screen.getByLabelText('JAK MAJĄ CIĘ WIDZIEĆ DOMOWNICY?'), {
    target: { value: ' Ola ' },
  })
  fireEvent.click(screen.getByRole('button', { name: /Dołącz jako Ola/ }))
  await vi.waitFor(() => expect(router.state.location.pathname).toBe('/'))
  expect(onJoin).toHaveBeenCalledWith(valid, 'Ola')
})
