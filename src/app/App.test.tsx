import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, test } from 'vitest'
import { routes } from './router.tsx'
import { screens } from './screens.ts'

afterEach(cleanup)

function renderAt(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] })
  render(<RouterProvider router={router} />)
  return router
}

const knownPaths = new Set(screens.map((s) => s.path))

describe('mapa ekranów', () => {
  test.each(screens)('$number $name ($path) ma swój ekran', (s) => {
    renderAt(s.path)
    expect(screen.getByRole('heading', { level: 1, name: s.name })).toBeDefined()
  })

  test.each(screens)('przejścia z ekranu $number prowadzą do istniejących ekranów', (s) => {
    for (const t of s.transitions) {
      expect(knownPaths.has(t.to.split('?')[0]), `${s.name} → ${t.to}`).toBe(true)
    }
  })

  test('kafelek „Pilne” na Starcie otwiera Zadania z filtrem', () => {
    const router = renderAt('/')
    fireEvent.click(screen.getByRole('link', { name: 'Kafelek „Pilne”' }))
    expect(router.state.location.pathname).toBe('/zadania')
    expect(router.state.location.search).toBe('?pokaz=pilne')
    expect(screen.getByText('Wariant: pokaz = pilne')).toBeDefined()
  })

  test('mapa ekranów zawiera wszystkie ekrany', () => {
    renderAt('/mapa')
    expect(screen.getAllByRole('link')).toHaveLength(screens.length)
  })
})
