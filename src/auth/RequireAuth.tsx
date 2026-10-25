import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { paths } from '../app/screens.ts'
import { useStore } from '../data/store.ts'
import { useHouse } from '../house/house.ts'
import { LoadingScreen } from '../screens/LoadingScreen.tsx'
import { useAuth } from './auth.ts'

/**
 * Ekran tylko dla zalogowanych. Dopóki wczytuje się konto, profil i dane domu – ekran ładowania;
 * bez konta – logowanie z zapamiętanym adresem (`?dalej=`), żeby po zalogowaniu wrócić tutaj.
 * `house`: 'required' – ekrany domu (bez domu → Pierwsze uruchomienie); 'firstRun' – Pierwsze
 * uruchomienie (z domem → Start); 'any' – Dołącz do domu.
 *
 * Wszystkie etapy czekania pokazują TEN SAM ekran ładowania (to samo miejsce w drzewie) – inaczej
 * przy każdym etapie animacja zaczynałaby się od nowa (na Androidzie wyglądało to jak ciągłe
 * odświeżanie – uwaga Hani 2026-10-25).
 */
export function RequireAuth({
  children,
  house = 'required',
}: {
  children: ReactNode
  house?: 'required' | 'firstRun' | 'any'
}) {
  const auth = useAuth()
  const { ready: houseReady, profile } = useHouse()
  const { ready: dataReady } = useStore()
  const location = useLocation()

  const loading = <LoadingScreen waiting />
  if (!auth.ready) return loading
  if (!auth.user) {
    const back = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`${paths.logowanie}?dalej=${back}`} replace />
  }
  if (house === 'any') return children
  if (!houseReady) return loading
  const hasHouse = !!profile?.houseId
  if (house === 'required' && !hasHouse) return <Navigate to={paths.pierwsze} replace />
  if (house === 'firstRun' && hasHouse) return <Navigate to={paths.start} replace />
  // dane domu jeszcze nie przyszły (np. tuż po zalogowaniu) – ładowanie zamiast pustych list
  if (house === 'required' && !dataReady) return loading
  return children
}
