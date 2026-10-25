import { FirebaseError } from 'firebase/app'
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/auth.ts'
import { db } from '../firebase/app.ts'
import {
  inviteLeftMs,
  joinHouseOps,
  newHouseDocs,
  newInviteCode,
  newInviteDoc,
  paths,
  type InviteDoc,
  type UserDoc,
} from '../firebase/model.ts'
import {
  DEFAULT_HOUSE_NAME,
  HouseContext,
  JoinError,
  type HouseApi,
  type Profile,
} from './house.ts'

/**
 * Zaproszenie z serwera (nie z pamięci telefonu – liczy się aktualny stan): brak → 'not-found',
 * użyte → 'used', po 10 minutach → 'expired'. Bez internetu → 'offline'.
 */
async function readInvite(code: string): Promise<InviteDoc & { createdAt: Timestamp }> {
  if (!navigator.onLine) throw new JoinError('offline')
  let snap
  try {
    snap = await getDocFromServer(doc(db, paths.invite(code)))
  } catch (e) {
    if (e instanceof FirebaseError && e.code === 'unavailable') throw new JoinError('offline')
    throw new JoinError('unknown')
  }
  if (!snap.exists()) throw new JoinError('not-found')
  const d = snap.data() as InviteDoc & { createdAt: Timestamp }
  if (d.usedBy) throw new JoinError('used')
  if (inviteLeftMs(d.createdAt) === 0) throw new JoinError('expired')
  return d
}

/** Profil z `users/{uid}` (na żywo), zakładanie domu, zaproszenia i dołączanie. */
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
  const houseId = current?.profile?.houseId ?? null

  // Usunięty z domu przez założyciela (albo dom zniknął): mojego wpisu domownika już nie ma
  // na serwerze – profil bez domu, aplikacja wraca do „Pierwsze uruchomienie”.
  useEffect(() => {
    if (!uid || !houseId) return
    const leave = () => updateDoc(doc(db, paths.user(uid)), { houseId: null }).catch(() => {})
    return onSnapshot(
      doc(db, `${paths.members(houseId)}/${uid}`),
      (snap) => {
        // z pamięci telefonu (np. bez internetu) nie wyciągamy wniosków
        if (!snap.exists() && !snap.metadata.fromCache) leave()
      },
      (e) => {
        if (e instanceof FirebaseError && e.code === 'permission-denied') leave()
      },
    )
  }, [uid, houseId])

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

      createInvite: async ({ scope, houseName, memberNames }) => {
        const houseId = current?.profile?.houseId
        if (!uid || !houseId) throw new Error('createInvite() bez domu')
        if (!navigator.onLine) throw new JoinError('offline')
        // kod już zajęty (rzadko) – reguły odrzucą zapis; próbujemy innego
        for (let attempt = 0; attempt < 3; attempt++) {
          const code = newInviteCode()
          try {
            await setDoc(
              doc(db, paths.invite(code)),
              newInviteDoc({
                houseId,
                houseName,
                uid,
                name: current?.profile?.name ?? '',
                memberNames,
                scope,
              }),
            )
            return code
          } catch (e) {
            if (!(e instanceof FirebaseError && e.code === 'permission-denied')) throw e
          }
        }
        throw new JoinError('unknown')
      },

      watchInvite: (code, onChange) =>
        onSnapshot(doc(db, paths.invite(code)), (snap) => {
          if (!snap.exists()) return onChange(null)
          // czas serwera, zanim przyjdzie – przybliżony z telefonu
          const d = snap.data({ serverTimestamps: 'estimate' }) as Partial<InviteDoc>
          const createdAt = d.createdAt instanceof Timestamp ? d.createdAt.toMillis() : Date.now()
          onChange({ code, createdAt, usedBy: d.usedBy ?? null })
        }),

      cancelInvite: (code) => deleteDoc(doc(db, paths.invite(code))),

      findInvite: async (code) => {
        const d = await readInvite(code)
        return {
          code,
          houseName: d.houseName,
          inviterName: d.inviterName,
          memberNames: d.memberNames ?? [d.inviterName],
          scope: d.scope,
        }
      },

      joinHouse: async (code, userName) => {
        if (!uid) throw new Error('joinHouse() bez zalogowania')
        const d = await readInvite(code)
        const batch = writeBatch(db)
        // dołączenie do innego domu = wyjście z obecnego (założyciel – tylko gdy jest w nim sam)
        if (houseId && houseId !== d.houseId) {
          const members = await getDocs(collection(db, paths.members(houseId))).catch(() => null)
          const me = members?.docs.find((m) => m.id === uid)
          if (me?.data().role === 'owner' && members!.size > 1) throw new JoinError('owner')
          if (me) batch.delete(me.ref)
        }
        for (const op of joinHouseOps({
          code,
          invite: { houseId: d.houseId, scope: d.scope },
          uid,
          userName: userName.trim(),
          hasProfile: !!current?.profile,
        }))
          batch.set(doc(db, op.path), op.data, { merge: !!op.merge })
        try {
          await batch.commit()
        } catch (e) {
          // ktoś był szybszy albo kod właśnie wygasł – reguły odrzuciły
          if (e instanceof FirebaseError && e.code === 'permission-denied') {
            const again = await readInvite(code)
            throw new JoinError(again.usedBy ? 'used' : 'unknown')
          }
          throw e
        }
      },

      removeMember: async (memberUid) => {
        if (!houseId) return
        await deleteDoc(doc(db, `${paths.members(houseId)}/${memberUid}`))
      },

      leaveHouse: async () => {
        if (!uid || !houseId) return
        const batch = writeBatch(db)
        batch.delete(doc(db, `${paths.members(houseId)}/${uid}`))
        batch.update(doc(db, paths.user(uid)), { houseId: null })
        // bez internetu zapis czeka w telefonie – profil bez domu i tak od razu
        const committed = batch.commit()
        committed.catch(() => {})
        await Promise.race([committed, new Promise((r) => setTimeout(r, 1500))])
      },
    }),
    [current, uid, houseId],
  )

  return <HouseContext.Provider value={api}>{children}</HouseContext.Provider>
}
