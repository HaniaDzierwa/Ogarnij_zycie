import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import { renderApp } from '../test/renderApp.tsx'
import { screens } from './screens.ts'

afterEach(cleanup)

const renderAt = (url: string) => renderApp(url)

const knownPaths = new Set(screens.map((s) => s.path))

describe('mapa ekranów', () => {
  test.each(screens)('$number $name ($path) ma swój ekran', (s) => {
    // Pierwsze uruchomienie widzi tylko konto bez domu
    const router = renderApp(s.path, { noHouse: s.id === 'pierwsze' })
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
