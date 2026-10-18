import { useMemo, useState, type ReactNode } from 'react'
import { AuthContext, AuthError, type AuthApi, type AuthUser } from './auth.ts'

const memoryUser: AuthUser = { uid: 'hania', email: 'hania@poczta.pl' }

/**
 * Konto w pamięci (testy): na start zalogowane (albo `signedOut`); `failWith` – każda akcja kończy się
 * tym błędem Firebase (np. 'auth/invalid-credential').
 */
export function MemoryAuthProvider({
  children,
  signedOut = false,
  failWith,
}: {
  children: ReactNode
  signedOut?: boolean
  failWith?: string
}) {
  const [user, setUser] = useState<AuthUser | null>(signedOut ? null : memoryUser)
  const api = useMemo<AuthApi>(() => {
    const run = async (fn: () => void) => {
      if (failWith) throw new AuthError(failWith)
      fn()
    }
    return {
      user,
      ready: true,
      signIn: (email) => run(() => setUser({ uid: 'hania', email })),
      signUp: (email) => run(() => setUser({ uid: 'nowy', email })),
      resetPassword: () => run(() => {}),
      signOut: () => run(() => setUser(null)),
    }
  }, [user, failWith])
  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>
}
