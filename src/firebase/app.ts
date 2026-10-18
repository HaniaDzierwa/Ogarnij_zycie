// Firebase w aplikacji: konto (Auth) i baza (Firestore z pamięcią offline).
// Tryb emulatorów (lokalne Auth i Firestore, nic nie trafia do prawdziwej bazy): `npm run dev:emulatory`.

import { initializeApp } from 'firebase/app'
import {
  browserLocalPersistence,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  initializeAuth,
} from 'firebase/auth'
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { firebaseConfig } from './config.ts'

export const app = initializeApp(firebaseConfig)

/** Stałe logowanie – sesja zostaje do „Wyloguj” (decyzja Hani, etap 0). */
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
})
auth.languageCode = 'pl'

/** Dane zapisane też w telefonie: aplikacja działa bez internetu, zmiany wyślą się same. */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

if (import.meta.env.VITE_EMULATORS === '1') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}
