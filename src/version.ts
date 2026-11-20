// Numer wersji w Ustawieniach (decyzja Hani 2026-11-20): z package.json – każda publikacja na
// oficjalnej stronie +0,1 (1.0 = pierwsza, 25.10.2026; „1.6.0” → „1.6”) i data budowania –
// podstawia Vite (vite.config.ts → define). Historia wersji: docs/POSTEP.md.

import { MONTHS_SHORT, parseKey } from './data/dates.ts'

declare const __APP_VERSION__: string
declare const __BUILD_DATE__: string

/** „ogarnij życie · wersja 1.9 · 20 lis 2026” – bez daty, gdy jej nie ma. */
export function versionLabel(version: string, buildDate?: string): string {
  const v = version.replace(/\.0$/, '')
  if (!buildDate) return `ogarnij życie · wersja ${v}`
  const d = parseKey(buildDate)
  return `ogarnij życie · wersja ${v} · ${d.getDate()} ${MONTHS_SHORT[d.getMonth()].toLowerCase()} ${d.getFullYear()}`
}

export const APP_VERSION_LABEL = versionLabel(
  typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '1.0',
  typeof __BUILD_DATE__ === 'string' ? __BUILD_DATE__ : undefined,
)
