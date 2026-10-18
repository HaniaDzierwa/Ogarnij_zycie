import { FirebaseError } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { auth } from '../firebase/app.ts'
import { AuthContext, AuthError, type AuthApi, type AuthUser } from './auth.ts'

/** Błędy Firebase → AuthError z kodem (komunikat po polsku dobiera ekran). */
async function wrap(run: () => Promise<unknown>): Promise<void> {
  try {
    await run()
  } catch (e) {
    throw new AuthError(e instanceof FirebaseError ? e.code : 'unknown')
  }
}

/** Konto z Firebase Authentication (e‑mail + hasło), sesja zapamiętana do „Wyloguj”. */
export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u ? { uid: u.uid, email: u.email } : null)
        setReady(true)
      }),
    [],
  )

  const api = useMemo<AuthApi>(
    () => ({
      user,
      ready,
      signIn: (email, password) =>
        wrap(() => signInWithEmailAndPassword(auth, email.trim(), password)),
      signUp: (email, password) =>
        wrap(() => createUserWithEmailAndPassword(auth, email.trim(), password)),
      resetPassword: (email) => wrap(() => sendPasswordResetEmail(auth, email.trim())),
      signOut: () => wrap(() => signOut(auth)),
    }),
    [user, ready],
  )

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>
}
