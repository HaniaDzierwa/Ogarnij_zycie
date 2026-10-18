import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, test } from 'vitest'
import { routes } from '../../app/router.tsx'
import { MockStoreProvider } from '../../data/MockStore.tsx'
import { customType, monthGrid, weekCountLabel, weekRangeLabel } from './calendarView.ts'

afterEach(cleanup)

// Dzień z projektu: piątek 9 października 2026.
function renderAt(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] })
  render(
    <MockStoreProvider today="2026-10-09">
      <RouterProvider router={router} />
    </MockStoreProvider>,
  )
  return router
}

const agenda = () => screen.getByRole('heading', { level: 2, name: /,/ }).closest('section')!

describe('calendarView', () => {
  test('październik 2026: 3 puste pola przed czwartkiem 1., 5 tygodni', () => {
    const grid = monthGrid(2026, 9)
    expect(grid.slice(0, 4)).toEqual([null, null, null, '2026-10-01'])
    expect(grid).toHaveLength(35)
  })

  test('zakres tygodnia w jednym i w dwóch miesiącach', () => {
    expect(weekRangeLabel('2026-10-05')).toBe('5–11 października')
    expect(weekRangeLabel('2026-09-28')).toBe('28 wrz – 4 paź')
  })

  test('odmiana licznika tygodnia', () => {
    expect([1, 3, 6].map(weekCountLabel)).toEqual([
      '1 wpis w tym tygodniu',
      '3 wpisy w tym tygodniu',
      '6 wpisów w tym tygodniu',
    ])
  })

  test('nowy rodzaj: kolory jaśniejsze i ciemniejsze od wybranego', () => {
    const t = customType('r1', 'Trening', '#5E8C6A')
    expect(t).toMatchObject({ name: 'Trening', icon: 'custom', fg: 'rgb(61, 91, 69)' })
  })
})

describe('ekran Kalendarz', () => {
  test('tydzień z dziś: nagłówek, zakres, agenda dnia jak w projekcie', () => {
    renderAt('/kalendarz')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Październik 2026')
    expect(screen.getByText('3 wpisy w tym tygodniu')).toBeDefined()
    expect(screen.getByText('5–11 października')).toBeDefined()
    expect(agenda().textContent).toContain('Piątek, 9 października · dziś')
    expect(agenda().textContent).toContain('1 WPIS')
    expect(agenda().textContent).toContain('Zadzwonić do hydraulika')
    expect(agenda().textContent).toContain('TERMIN ZADANIA · DOM · PILNE')
  })

  test('skrót ze Startu: imieniny 16 paź – najpierw termin zadania, potem cały dzień', () => {
    renderAt('/kalendarz?dzien=2026-10-16')
    expect(screen.getByText('6 wpisów w tym tygodniu')).toBeDefined()
    const rows = within(agenda())
      .getAllByText(/termin|cały dzień/)
      .map((el) => el.parentElement!.textContent)
    expect(rows[0]).toContain('Prezent dla mamy na imieniny')
    expect(rows[1]).toContain('Imieniny mamy')
  })

  test('strzałki i „Później”: następny tydzień, klik w wpis wybiera dzień', () => {
    renderAt('/kalendarz')
    const later = screen.getByRole('heading', { name: 'Później' }).closest('section')!
    const first = within(later).getAllByRole('button')[0]
    expect(first.textContent).toContain('Zebranie w szkole')
    expect(first.textContent).toContain('za 4 dni')
    fireEvent.click(first)
    expect(agenda().textContent).toContain('Wtorek, 13 października')

    fireEvent.click(screen.getByRole('button', { name: 'Następny tydzień' }))
    expect(screen.getByText('19–25 października')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'DZIŚ' }))
    expect(screen.getByText('5–11 października')).toBeDefined()
  })

  test('wolny dzień: „Spokojny dzień”', () => {
    renderAt('/kalendarz?dzien=2026-10-11')
    expect(screen.getByText('Spokojny dzień – nic zaplanowanego')).toBeDefined()
  })

  test('miesiąc: siatka, legenda rodzajów, następny miesiąc', () => {
    renderAt('/kalendarz')
    fireEvent.click(screen.getByRole('radio', { name: 'Miesiąc' }))
    expect(screen.getByRole('button', { name: '16 października, są wpisy' })).toBeDefined()
    expect(screen.getByText('Termin zadania')).toBeDefined()
    expect(screen.queryByRole('heading', { name: 'Później' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Następny miesiąc' }))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Listopad 2026')
    expect(agenda().textContent).toContain('Niedziela, 1 listopada')
  })

  test('nowe wydarzenie z nowym rodzajem trafia do agendy wybranego dnia', () => {
    renderAt('/kalendarz?nowe=wydarzenie')
    const sheet = screen.getByRole('dialog', { name: 'Nowe wydarzenie' })
    expect(within(sheet).getByText('PIĄTEK, 9 PAŹDZIERNIKA')).toBeDefined()
    fireEvent.change(within(sheet).getByLabelText('NAZWA'), { target: { value: 'Basen z Olą' } })
    fireEvent.click(within(sheet).getByRole('button', { name: '+ Nowy rodzaj' }))
    fireEvent.change(within(sheet).getByLabelText('NAZWA RODZAJU'), {
      target: { value: 'Trening' },
    })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Dodaj rodzaj' }))
    expect(
      within(sheet).getByRole('button', { name: 'Trening' }).getAttribute('aria-pressed'),
    ).toBe('true')
    fireEvent.click(within(sheet).getByRole('button', { name: 'Dodaj do kalendarza' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(agenda().textContent).toContain('2 WPISY')
    expect(agenda().textContent).toContain('Basen z Olą')
    expect(agenda().textContent).toContain('TRENING · PRZYPOMNIENIE DZIEŃ WCZEŚNIEJ')
    expect(agenda().textContent).toContain('18:00')
  })

  test('menu „+” → „Wydarzenie w kalendarzu” otwiera arkusz na miejscu', () => {
    renderAt('/kalendarz?dzien=2026-10-10')
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Wydarzenie w kalendarzu' }))
    const sheet = screen.getByRole('dialog', { name: 'Nowe wydarzenie' })
    expect(within(sheet).getByText('SOBOTA, 10 PAŹDZIERNIKA')).toBeDefined()
  })
})
