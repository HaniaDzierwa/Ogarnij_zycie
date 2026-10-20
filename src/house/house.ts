// Profil zalogowanego użytkownika i jego dom: czy ma już dom, zakładanie nowego domu.
// W aplikacji dostarcza je FirebaseHouseProvider (Firestore); w testach MemoryHouseProvider.

import { createContext, useContext } from 'react'

export type Profile = { name: string; houseId: string | null }

export type HouseApi = {
  /** Profil już wczytany (pierwszy odczyt z Firestore albo z pamięci telefonu). */
  ready: boolean
  /** null – konto bez profilu (świeżo założone). */
  profile: Profile | null
  /** „Załóż nowy dom”: dom, założyciel, profil, domyślne kategorie i rodzaje wydarzeń. */
  createHouse: (houseName: string, userName: string) => Promise<void>
}

/** Nazwa domu, gdy pole zostanie puste. */
export const DEFAULT_HOUSE_NAME = 'Nasz dom'

export const HouseContext = createContext<HouseApi | null>(null)

export function useHouse(): HouseApi {
  const ctx = useContext(HouseContext)
  if (!ctx)
    throw new Error('useHouse() poza providerem domu (FirebaseHouseProvider / MemoryHouseProvider)')
  return ctx
}
