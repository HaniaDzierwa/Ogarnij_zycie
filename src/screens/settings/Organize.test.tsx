import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { renderApp } from '../../test/renderApp.tsx'

afterEach(cleanup)

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }))
const rowNames = () =>
  screen
    .getAllByRole('button')
    .map((b) => b.textContent ?? '')
    .filter((t) => /ZADA|BRAK ZADAŃ/.test(t))

test('Ustawienia: sekcja „Zadania” z wierszami Kategorie i Priorytety', () => {
  const router = renderApp('/ustawienia')
  expect(screen.getByText('ZADANIA')).toBeDefined()
  expect(screen.getByText('6 KATEGORII')).toBeDefined()
  expect(screen.getByText('3 WBUDOWANE · DODAJ WŁASNY')).toBeDefined()
  fireEvent.click(screen.getByRole('link', { name: /^Kategorie/ }))
  expect(router.state.location.pathname).toBe('/ustawienia/kategorie')
  fireEvent.click(screen.getByRole('link', { name: /USTAWIENIA/ }))
  fireEvent.click(screen.getByRole('link', { name: /^Priorytety/ }))
  expect(router.state.location.pathname).toBe('/ustawienia/priorytety')
})

test('Kategorie: zmiana nazwy i koloru widać na liście Zadań', () => {
  const router = renderApp('/ustawienia/kategorie')
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Kategorie zadań')
  click(/^Auto/)
  const sheet = screen.getByRole('dialog', { name: 'Kategoria' })
  const name = within(sheet).getByLabelText('NAZWA')
  fireEvent.change(name, { target: { value: 'Samochód' } })
  fireEvent.blur(name)
  fireEvent.click(within(sheet).getByRole('radio', { name: 'Kolor malinowy' }))
  expect(
    within(sheet).getByRole('radio', { name: 'Kolor malinowy' }).getAttribute('aria-checked'),
  ).toBe('true')
  click('Zamknij')
  expect(screen.getByText('Samochód')).toBeDefined()
  router.navigate('/zadania')
  return screen.findByText('SAMOCHÓD')
})

test('Kategorie: przeciąganie za uchwyt – ta sama kolejność w Ustawieniach i na liście Zadań', async () => {
  const router = renderApp('/ustawienia/kategorie')
  // Zakupy · Dom · Zdrowie · Urzędy · Auto · Rodzina; wiersz ~64 px
  const grip = screen.getByRole('button', { name: 'Przesuń: Auto' })
  fireEvent.pointerDown(grip, { clientY: 300, pointerId: 1 })
  fireEvent.pointerMove(grip, { clientY: 200, pointerId: 1 })
  fireEvent.pointerMove(grip, { clientY: 0, pointerId: 1 })
  fireEvent.pointerUp(grip, { pointerId: 1 })
  expect(rowNames()[0]).toMatch(/^Auto/)
  expect(rowNames()[1]).toMatch(/^Zakupy/)
  // za uchwyt nie otwiera się arkusz kategorii
  expect(screen.queryByRole('dialog', { name: 'Kategoria' })).toBeNull()
  // krótkie przesunięcie (mniej niż pół wiersza) – nic się nie zmienia
  const zakupy = screen.getByRole('button', { name: 'Przesuń: Zakupy' })
  fireEvent.pointerDown(zakupy, { clientY: 100, pointerId: 2 })
  fireEvent.pointerMove(zakupy, { clientY: 120, pointerId: 2 })
  fireEvent.pointerUp(zakupy, { pointerId: 2 })
  expect(rowNames()[1]).toMatch(/^Zakupy/)

  router.navigate('/zadania')
  // nagłówki grup (zwijane) – w kolejności kategorii
  const groups = (await screen.findAllByRole('button', { expanded: true }))
    .map((b) => (b.textContent ?? '').toLowerCase())
    .filter((t) => /^(zakupy|dom|zdrowie|urzędy|auto|rodzina)/.test(t))
  expect(groups[0]).toMatch(/^auto/)
  expect(groups[1]).toMatch(/^zakupy/)
})

test('Kategorie: uchwyt działa też strzałkami z klawiatury', () => {
  renderApp('/ustawienia/kategorie')
  const grip = screen.getByRole('button', { name: 'Przesuń: Zakupy' })
  fireEvent.keyDown(grip, { key: 'ArrowDown' })
  expect(rowNames()[0]).toMatch(/^Dom/)
  expect(rowNames()[1]).toMatch(/^Zakupy/)
  fireEvent.keyDown(screen.getByRole('button', { name: 'Przesuń: Zakupy' }), { key: 'ArrowUp' })
  expect(rowNames()[0]).toMatch(/^Zakupy/)
})

test('Kategorie: nie da się usunąć kategorii z zadaniami; nowa pusta – usuwa się po pytaniu', () => {
  renderApp('/ustawienia/kategorie')
  click(/^Auto/)
  const sheet = screen.getByRole('dialog', { name: 'Kategoria' })
  expect(
    (within(sheet).getByRole('button', { name: /Usuń kategorię/ }) as HTMLButtonElement).disabled,
  ).toBe(true)
  expect(within(sheet).getByText(/Nie można usunąć – przypięte zadania: 2/)).toBeDefined()
  click('Zamknij')

  click('+ Nowa kategoria')
  fireEvent.change(screen.getByLabelText('NAZWA NOWEJ KATEGORII'), { target: { value: 'Ogród' } })
  click('Dodaj kategorię')
  expect(rowNames().some((t) => t.startsWith('OgródBRAK ZADAŃ'))).toBe(true)
  click(/^Ogród/)
  click(/Usuń kategorię/)
  expect(screen.getByRole('alertdialog', { name: 'Usunąć kategorię?' })).toBeDefined()
  click('Usuń')
  expect(screen.queryByText('Ogród')).toBeNull()
})

test('Priorytety: wbudowane bez edycji i bez uchwytu; nowy „Na weekend” na końcu, przeciągnięty po „Ważne” – w arkuszu, filtrze i grupach', async () => {
  const router = renderApp('/ustawienia/priorytety')
  expect(screen.getAllByText(/^WBUDOWANY/)).toHaveLength(3)
  expect(screen.queryByRole('button', { name: /^Pilne/ })).toBeNull()
  expect(screen.queryByRole('button', { name: /^Przesuń/ })).toBeNull()

  click('+ Nowy priorytet')
  fireEvent.change(screen.getByLabelText('NAZWA NOWEGO PRIORYTETU'), {
    target: { value: 'Na weekend' },
  })
  click('Dodaj priorytet')
  expect(rowNames().map((t) => t.split(/WBUDOWANY|BRAK|\d/)[0])).toEqual(['Na weekend'])
  const names = () =>
    screen.getAllByText(/^(Pilne|Ważne|Na weekend|Przy okazji)$/).map((e) => e.textContent)
  expect(names()).toEqual(['Pilne', 'Ważne', 'Przy okazji', 'Na weekend'])

  // o jeden wiersz w górę (~64 px)
  const grip = screen.getByRole('button', { name: 'Przesuń: Na weekend' })
  fireEvent.pointerDown(grip, { clientY: 300, pointerId: 1 })
  fireEvent.pointerMove(grip, { clientY: 230, pointerId: 1 })
  fireEvent.pointerUp(grip, { pointerId: 1 })
  expect(names()).toEqual(['Pilne', 'Ważne', 'Na weekend', 'Przy okazji'])

  router.navigate('/zadania?nowe=zadanie')
  const sheet = await screen.findByRole('dialog', { name: 'Nowe zadanie' })
  fireEvent.click(within(sheet).getByRole('button', { name: /^Priorytet/ }))
  const radios = within(within(sheet).getByRole('radiogroup', { name: 'Priorytet' }))
    .getAllByRole('radio')
    .map((r) => r.textContent)
  expect(radios).toEqual(['Pilne', 'Ważne', 'Na weekend', 'Przy okazji'])
  click('Zamknij')
  click(/Filtry/)
  expect(screen.getByRole('button', { name: 'Na weekend' })).toBeDefined()
})

test('Priorytety: własny z zadaniem nie do usunięcia; bez zadań – usuwa się', async () => {
  const router = renderApp('/ustawienia/priorytety')
  click('+ Nowy priorytet')
  fireEvent.change(screen.getByLabelText('NAZWA NOWEGO PRIORYTETU'), {
    target: { value: 'Kiedyś' },
  })
  click('Dodaj priorytet')

  // przypnij zadanie
  router.navigate('/zadania')
  fireEvent.click(await screen.findByText('Przegląd techniczny'))
  const detail = screen.getByRole('dialog')
  fireEvent.click(within(detail).getByRole('button', { name: 'Edytuj' }))
  fireEvent.click(within(detail).getByRole('button', { name: /^Priorytet/ }))
  fireEvent.click(within(detail).getByRole('radio', { name: 'Kiedyś' }))
  fireEvent.click(within(detail).getByRole('button', { name: 'Zapisz' }))
  click('Zamknij')

  router.navigate('/ustawienia/priorytety')
  fireEvent.click(await screen.findByRole('button', { name: /^Kiedyś/ }))
  expect(
    (screen.getByRole('button', { name: /Usuń priorytet/ }) as HTMLButtonElement).disabled,
  ).toBe(true)
  expect(screen.getByText(/Przenieś je najpierw na inny priorytet/)).toBeDefined()
})

test('Zadania → Filtry: tylko filtrowanie, bez edycji i dodawania kategorii', () => {
  renderApp('/zadania')
  click(/Filtry/)
  expect(screen.queryByRole('button', { name: 'EDYTUJ' })).toBeNull()
  expect(screen.queryByRole('button', { name: '+ Nowa kategoria' })).toBeNull()
  expect(screen.queryByRole('button', { name: /Usuń kategorię/ })).toBeNull()
})
