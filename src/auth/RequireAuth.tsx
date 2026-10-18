import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { paths } from '../app/screens.ts'
import { LoadingScreen } from '../screens/LoadingScreen.tsx'
import { useAuth } from './auth.ts'

/**
 * Ekran tylko dla zalogowanych. Dopóki wczytuje się konto – ekran ładowania; bez konta –
 * logowanie z zapamiętanym adresem (`?dalej=`), żeby po zalogowaniu wrócić tutaj.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth()
  const location = useLocation()
  if (!ready) return <LoadingScreen waiting />
  if (!user) {
    const back = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`${paths.logowanie}?dalej=${back}`} replace />
  }
  return children
}
