import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { paths } from '../app/screens.ts'
import { useHouse } from '../house/house.ts'
import { LoadingScreen } from '../screens/LoadingScreen.tsx'
import { useAuth } from './auth.ts'

/**
 * Ekran tylko dla zalogowanych. Dopóki wczytuje się konto – ekran ładowania; bez konta –
 * logowanie z zapamiętanym adresem (`?dalej=`), żeby po zalogowaniu wrócić tutaj.
 * `house`: 'required' – ekrany domu (bez domu → Pierwsze uruchomienie); 'firstRun' – Pierwsze
 * uruchomienie (z domem → Start); 'any' – Dołącz do domu.
 */
export function RequireAuth({
  children,
  house = 'required',
}: {
  children: ReactNode
  house?: 'required' | 'firstRun' | 'any'
}) {
  const { user, ready } = useAuth()
  const location = useLocation()
  if (!ready) return <LoadingScreen waiting />
  if (!user) {
    const back = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`${paths.logowanie}?dalej=${back}`} replace />
  }
  return house === 'any' ? children : <RequireHouse mode={house}>{children}</RequireHouse>
}

function RequireHouse({ children, mode }: { children: ReactNode; mode: 'required' | 'firstRun' }) {
  const { ready, profile } = useHouse()
  if (!ready) return <LoadingScreen waiting />
  const hasHouse = !!profile?.houseId
  if (mode === 'required' && !hasHouse) return <Navigate to={paths.pierwsze} replace />
  if (mode === 'firstRun' && hasHouse) return <Navigate to={paths.start} replace />
  return children
}
