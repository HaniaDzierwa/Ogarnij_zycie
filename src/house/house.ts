// Profil zalogowanego użytkownika i jego dom: czy ma już dom, zakładanie domu, zaproszenia, dołączanie.
// W aplikacji dostarcza je FirebaseHouseProvider (Firestore); w testach MemoryHouseProvider.

import { createContext, useContext } from 'react'
import type { Member } from '../data/types.ts'

export type Profile = { name: string; houseId: string | null }

export type Scope = Member['scope']

/** Zaproszenie widziane przez zapraszającego (na żywo). */
export type InviteState = {
  code: string
  /** Kiedy utworzone (ms) – liczymy od tego 10 minut ważności. */
  createdAt: number
  /** Kto użył (uid) – wtedy „… jest z Wami”. */
  usedBy: string | null
}

/** Zaproszenie widziane przez dołączającego („Znaleziono dom”). */
export type InvitePreview = {
  code: string
  houseName: string
  inviterName: string
  memberNames: string[]
  scope: Scope
}

/** Dlaczego nie da się dołączyć – komunikat dobiera ekran. */
export type JoinErrorCode = 'not-found' | 'expired' | 'used' | 'offline' | 'owner' | 'unknown'

export class JoinError extends Error {
  code: JoinErrorCode
  constructor(code: JoinErrorCode) {
    super(code)
    this.code = code
  }
}

/**
 * Co z domem przy usuwaniu konta (decyzja Hani 2026-10-18): domownik wychodzi; założyciel bez
 * innych – dom znika; założyciel z domownikami – przekazuje dom wybranemu albo usuwa go u wszystkich.
 */
export type DeleteMode =
  { kind: 'leave' } | { kind: 'transfer'; to: string } | { kind: 'delete-house' }

export type HouseApi = {
  /** Profil już wczytany (pierwszy odczyt z Firestore albo z pamięci telefonu). */
  ready: boolean
  /** null – konto bez profilu (świeżo założone). */
  profile: Profile | null
  /** „Załóż nowy dom”: dom, założyciel, profil, domyślne kategorie i rodzaje wydarzeń. */
  createHouse: (houseName: string, userName: string) => Promise<void>
  /** „Zaproś domownika”: nowe zaproszenie (kod 6 cyfr) do mojego domu. Wymaga internetu. */
  createInvite: (opts: {
    scope: Scope
    houseName: string
    memberNames: string[]
  }) => Promise<string>
  /** Zaproszenie na żywo (odliczanie, „… jest z Wami”); zwraca funkcję kończącą obserwację. */
  watchInvite: (code: string, onChange: (s: InviteState | null) => void) => () => void
  /** „Nowy kod” / „Anuluj zaproszenie”. */
  cancelInvite: (code: string) => Promise<void>
  /** „Dołącz do domu”: zaproszenie po kodzie – rzuca JoinError, gdy nie da się dołączyć. */
  findInvite: (code: string) => Promise<InvitePreview>
  /** „Dołącz jako …” – rzuca JoinError. */
  joinHouse: (code: string, userName: string) => Promise<void>
  /** „Usuń z domu” (tylko założyciel): domownik traci dostęp; jego telefon sam wraca do „Witaj”. */
  removeMember: (uid: string) => Promise<void>
  /** „Opuść dom”: wypisanie siebie z domu, profil bez domu („Pierwsze uruchomienie”). */
  leaveHouse: () => Promise<void>
  /**
   * „Usuń konto”: potwierdzenie hasłem, potem dane (własne „Tylko ja”, dom wg `mode`, powiadomienia,
   * profil) i samo konto. Złe hasło albo brak internetu – AuthError (nic nie usunięte).
   */
  deleteAccount: (password: string, mode: DeleteMode) => Promise<void>
}

/** Nazwa domu, gdy pole zostanie puste. */
export const DEFAULT_HOUSE_NAME = 'Nasz dom'

/** Komunikat po polsku dla błędu dołączania. */
export function joinErrorMessage(code: JoinErrorCode): string {
  switch (code) {
    case 'not-found':
      return 'Nie ma takiego kodu. Sprawdź cyfry albo poproś o nowy kod.'
    case 'expired':
      return 'Ten kod już wygasł (ważny 10 minut). Poproś o nowy kod.'
    case 'used':
      return 'Ten kod został już użyty. Poproś o nowy kod.'
    case 'offline':
      return 'Brak internetu – dołączanie wymaga połączenia.'
    case 'owner':
      return 'Jesteś założycielem domu, w którym są inni domownicy – nie możesz go opuścić.'
    default:
      return 'Nie udało się dołączyć. Spróbuj jeszcze raz.'
  }
}

export const HouseContext = createContext<HouseApi | null>(null)

export function useHouse(): HouseApi {
  const ctx = useContext(HouseContext)
  if (!ctx)
    throw new Error('useHouse() poza providerem domu (FirebaseHouseProvider / MemoryHouseProvider)')
  return ctx
}
