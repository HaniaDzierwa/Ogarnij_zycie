// Wspólne renderowanie aplikacji w testach: router z prawdziwymi trasami, konto, dom i dane w pamięci.

import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '../app/router.tsx'
import { MemoryAuthProvider } from '../auth/MemoryAuthProvider.tsx'
import { MockStoreProvider } from '../data/MockStore.tsx'
import { MemoryHouseProvider } from '../house/MemoryHouseProvider.tsx'

export type RenderOptions = {
  /** „Dziś” w przykładowych danych – domyślnie dzień z projektu (piątek 9 paź 2026). */
  today?: string
  /** Konto: na start wylogowane; każda akcja konta kończy się tym błędem Firebase. */
  signedOut?: boolean
  failWith?: string
  /** Konto bez domu (świeże); podgląd tego, co zapisałby „Załóż nowy dom”. */
  noHouse?: boolean
  onCreateHouse?: (houseName: string, userName: string) => void
  /** Dane bez domowników (konto bez domu). */
  noMembers?: boolean
  /** Rodzaje wydarzeń jeszcze nie wczytane; dane domu jeszcze się wczytują. */
  noEventTypes?: boolean
  notReady?: boolean
}

export function renderApp(url: string, opts: RenderOptions = {}) {
  const router = createMemoryRouter(routes, { initialEntries: [url] })
  render(
    <MemoryAuthProvider signedOut={opts.signedOut} failWith={opts.failWith}>
      <MemoryHouseProvider noHouse={opts.noHouse} onCreate={opts.onCreateHouse}>
        <MockStoreProvider
          today={opts.today ?? '2026-10-09'}
          noMembers={opts.noMembers}
          noEventTypes={opts.noEventTypes}
          notReady={opts.notReady}
        >
          <RouterProvider router={router} />
        </MockStoreProvider>
      </MemoryHouseProvider>
    </MemoryAuthProvider>,
  )
  return router
}
