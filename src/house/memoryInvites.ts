// Przykładowe zaproszenia dla MemoryHouseProvider (testy „Dołącz do domu”).

import { INVITE_MINUTES } from '../firebase/model.ts'
import type { InvitePreview } from './house.ts'

/** Zaproszenie w pamięci: to, co zobaczy dołączający, plus stan. */
export type MemoryInvite = InvitePreview & {
  houseId: string
  createdAt: number
  usedBy: string | null
}

export const MINUTE = 60_000

/** Kody do testów: ważny, przeterminowany, użyty. */
export const MEMORY_INVITE_CODES = { valid: '482913', expired: '111111', used: '222222' }

export function sampleInvites(now: number): Map<string, MemoryInvite> {
  const base = {
    houseId: 'dom-lesna',
    houseName: 'Dom na Leśnej',
    inviterName: 'Hania',
    memberNames: ['Hania', 'Krzyś'],
    scope: { all: true, categoryIds: [], calendar: true },
    usedBy: null,
  }
  const { valid, expired, used } = MEMORY_INVITE_CODES
  return new Map([
    [valid, { ...base, code: valid, createdAt: now - MINUTE }],
    [expired, { ...base, code: expired, createdAt: now - (INVITE_MINUTES + 1) * MINUTE }],
    [used, { ...base, code: used, createdAt: now - MINUTE, usedBy: 'ewa' }],
  ])
}
