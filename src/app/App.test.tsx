import { cleanup, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, test } from 'vitest'
import { MockStoreProvider } from '../data/MockStore.tsx'
import { routes } from './router.tsx'
import { screens } from './screens.ts'

afterEach(cleanup)

function renderAt(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] })
  render(
    <MockStoreProvider today="2026-10-09">
      <RouterProvider router={router} />
    </MockStoreProvider>,
  )
  return router
}

const knownPaths = new Set(screens.map((s) => s.path))

describe('mapa ekranów', () => {
  test.each(screens)('$number $name ($path) ma swój ekran', (s) => {
    const router = renderAt(s.path)
    expect(router.state.location.pathname).toBe(s.path)
    // nie trafia na mapę ekranów (adres awaryjny)
    expect(screen.queryByRole('heading', { name: 'Mapa ekranów' })).toBeNull()
  })

  test.each(screens)('przejścia z ekranu $number prowadzą do istniejących ekranów', (s) => {
    for (const t of s.transitions) {
      expect(knownPaths.has(t.to.split('?')[0]), `${s.name} → ${t.to}`).toBe(true)
    }
  })

  test('mapa ekranów zawiera wszystkie ekrany', () => {
    renderAt('/mapa')
    expect(screen.getAllByRole('link')).toHaveLength(screens.length)
  })
})
