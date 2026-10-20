import { collection, doc, onSnapshot, writeBatch } from 'firebase/firestore'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/auth.ts'
import { db } from '../firebase/app.ts'
import { newHouseDocs, paths, type UserDoc } from '../firebase/model.ts'
import { DEFAULT_HOUSE_NAME, HouseContext, type HouseApi, type Profile } from './house.ts'

/** Profil z `users/{uid}` (na żywo) i zakładanie domu jednym zapisem (writeBatch). */
export function FirebaseHouseProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const uid = user?.uid ?? null
  // profil przypisany do konta, z którego pochodzi – po wylogowaniu stary znika sam
  const [loaded, setLoaded] = useState<{ uid: string; profile: Profile | null } | null>(null)

  useEffect(() => {
    if (!uid) return
    return onSnapshot(
      doc(db, paths.user(uid)),
      (snap) => {
        const d = snap.data() as Partial<UserDoc> | undefined
        setLoaded({ uid, profile: d ? { name: d.name ?? '', houseId: d.houseId ?? null } : null })
      },
      // brak dostępu albo błąd sieci przy pierwszym odczycie – traktujemy jak brak profilu
      () => setLoaded({ uid, profile: null }),
    )
  }, [uid])

  const current = loaded && loaded.uid === uid ? loaded : null

  const api = useMemo<HouseApi>(
    () => ({
      ready: !!current,
      profile: current?.profile ?? null,
      createHouse: async (houseName, userName) => {
        if (!uid) throw new Error('createHouse() bez zalogowania')
        const houseId = doc(collection(db, 'houses')).id
        const batch = writeBatch(db)
        for (const d of newHouseDocs({
          houseId,
          houseName: houseName.trim() || DEFAULT_HOUSE_NAME,
          uid,
          userName: userName.trim(),
          newId: () => doc(collection(db, paths.categories(houseId))).id,
        }))
          batch.set(doc(db, d.path), d.data)
        // Bez internetu zapis czeka w telefonie i wyśle się sam – nie czekamy na serwer dłużej niż chwilę;
        // profil (z houseId) i tak pojawia się od razu z pamięci telefonu.
        const committed = batch.commit()
        // odrzucenie po czasie (np. reguły) cofa zapis w telefonie – profil wraca do „bez domu”
        committed.catch(() => {})
        await Promise.race([committed, new Promise((r) => setTimeout(r, 1500))])
      },
    }),
    [current, uid],
  )

  return <HouseContext.Provider value={api}>{children}</HouseContext.Provider>
}
