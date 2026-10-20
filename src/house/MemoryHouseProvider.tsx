import { useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_HOUSE_NAME, HouseContext, type HouseApi, type Profile } from './house.ts'

/**
 * Profil w pamięci (testy): na start z domem (albo `noHouse` – świeże konto bez profilu).
 * `onCreate` – podgląd tego, co zapisałby „Załóż nowy dom”.
 */
export function MemoryHouseProvider({
  children,
  noHouse = false,
  onCreate,
}: {
  children: ReactNode
  noHouse?: boolean
  onCreate?: (houseName: string, userName: string) => void
}) {
  const [profile, setProfile] = useState<Profile | null>(
    noHouse ? null : { name: 'Hania', houseId: 'dom1' },
  )
  const api = useMemo<HouseApi>(
    () => ({
      ready: true,
      profile,
      createHouse: async (houseName, userName) => {
        onCreate?.(houseName.trim() || DEFAULT_HOUSE_NAME, userName.trim())
        setProfile({ name: userName.trim(), houseId: 'nowy-dom' })
      },
    }),
    [profile, onCreate],
  )
  return <HouseContext.Provider value={api}>{children}</HouseContext.Provider>
}
