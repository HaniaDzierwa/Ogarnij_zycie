import { useMemo, useRef, useState, type ReactNode } from 'react'
import { INVITE_MINUTES } from '../firebase/model.ts'
import {
  DEFAULT_HOUSE_NAME,
  HouseContext,
  JoinError,
  type HouseApi,
  type InviteState,
  type Profile,
} from './house.ts'
import { MINUTE, sampleInvites, type MemoryInvite } from './memoryInvites.ts'

/**
 * Profil w pamięci (testy): na start z domem (albo `noHouse` – świeże konto bez profilu).
 * `onCreate` / `onJoin` – podgląd tego, co zapisałyby „Załóż nowy dom” / „Dołącz jako …”.
 * `inviteUsedBy` – ten domownik (uid) „dołącza” chwilę po utworzeniu zaproszenia.
 * `onRemoveMember` – podgląd „Usuń z domu” (lista domowników jest w magazynie danych).
 */
export function MemoryHouseProvider({
  children,
  noHouse = false,
  onCreate,
  onJoin,
  inviteUsedBy,
  onRemoveMember,
}: {
  children: ReactNode
  noHouse?: boolean
  onCreate?: (houseName: string, userName: string) => void
  onJoin?: (code: string, userName: string) => void
  inviteUsedBy?: string
  onRemoveMember?: (uid: string) => void
}) {
  const [profile, setProfile] = useState<Profile | null>(
    noHouse ? null : { name: 'Hania', houseId: 'dom1' },
  )
  const invites = useRef<Map<string, MemoryInvite> | null>(null)
  invites.current ??= sampleInvites(Date.now())

  const api = useMemo<HouseApi>(() => {
    const all = invites.current!
    const online = () => {
      if (!navigator.onLine) throw new JoinError('offline')
    }
    const read = (code: string) => {
      online()
      const inv = all.get(code)
      if (!inv) throw new JoinError('not-found')
      if (inv.usedBy) throw new JoinError('used')
      if (Date.now() - inv.createdAt >= INVITE_MINUTES * MINUTE) throw new JoinError('expired')
      return inv
    }
    return {
      ready: true,
      profile,
      createHouse: async (houseName, userName) => {
        onCreate?.(houseName.trim() || DEFAULT_HOUSE_NAME, userName.trim())
        setProfile({ name: userName.trim(), houseId: 'nowy-dom' })
      },
      createInvite: async ({ scope, houseName, memberNames }) => {
        online()
        let code
        do code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
        while (all.has(code))
        all.set(code, {
          code,
          houseId: profile?.houseId ?? 'dom1',
          houseName,
          inviterName: profile?.name ?? '',
          memberNames,
          scope,
          createdAt: Date.now(),
          usedBy: null,
        })
        return code
      },
      watchInvite: (code, onChange) => {
        const state = (): InviteState | null => {
          const inv = all.get(code)
          return inv ? { code, createdAt: inv.createdAt, usedBy: inv.usedBy } : null
        }
        onChange(state())
        if (!inviteUsedBy) return () => {}
        const t = setTimeout(() => {
          const inv = all.get(code)
          if (inv) inv.usedBy = inviteUsedBy
          onChange(state())
        }, 50)
        return () => clearTimeout(t)
      },
      cancelInvite: async (code) => {
        all.delete(code)
      },
      findInvite: async (code) => {
        const { houseName, inviterName, memberNames, scope } = read(code)
        return { code, houseName, inviterName, memberNames, scope }
      },
      joinHouse: async (code, userName) => {
        const inv = read(code)
        inv.usedBy = 'ja'
        onJoin?.(code, userName.trim())
        setProfile({ name: userName.trim(), houseId: inv.houseId })
      },
      removeMember: async (uid) => {
        onRemoveMember?.(uid)
      },
      leaveHouse: async () => {
        setProfile((p) => (p ? { ...p, houseId: null } : p))
      },
    }
  }, [profile, onCreate, onJoin, inviteUsedBy, onRemoveMember])
  return <HouseContext.Provider value={api}>{children}</HouseContext.Provider>
}
