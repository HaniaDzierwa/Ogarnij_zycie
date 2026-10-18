// Konto użytkownika dla ekranów: kto jest zalogowany i akcje (logowanie, rejestracja, reset, wylogowanie).
// W aplikacji dostarcza je FirebaseAuthProvider; w testach MemoryAuthProvider (konto w pamięci).

import { createContext, useContext } from 'react'

export type AuthUser = { uid: string; email: string | null }

export type AuthApi = {
  user: AuthUser | null
  /** Stan konta już wczytany (na starcie Firebase odczytuje zapisaną sesję). */
  ready: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

/** Błąd konta z kodem Firebase (np. 'auth/invalid-credential'). */
export class AuthError extends Error {
  code: string
  constructor(code: string) {
    super(code)
    this.code = code
  }
}

/** Komunikat po polsku i pole, przy którym go pokazać. */
export function authErrorMessage(code: string): { field?: 'email' | 'password'; message: string } {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return { field: 'password', message: 'Nieprawidłowy e‑mail lub hasło.' }
    case 'auth/invalid-email':
      return { field: 'email', message: 'Wpisz poprawny adres e‑mail.' }
    case 'auth/email-already-in-use':
      return { field: 'email', message: 'Na ten e‑mail jest już konto – zaloguj się.' }
    case 'auth/weak-password':
      return { field: 'password', message: 'Hasło musi mieć co najmniej 8 znaków.' }
    case 'auth/too-many-requests':
      return { message: 'Za dużo prób. Spróbuj ponownie za kilka minut.' }
    case 'auth/network-request-failed':
      return { message: 'Brak internetu – logowanie wymaga połączenia.' }
    default:
      return { message: 'Coś poszło nie tak. Spróbuj jeszcze raz.' }
  }
}

export const AuthContext = createContext<AuthApi | null>(null)

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext)
  if (!ctx)
    throw new Error('useAuth() poza providerem konta (FirebaseAuthProvider / MemoryAuthProvider)')
  return ctx
}
