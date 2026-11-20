// Motyw jasny / ciemny (decyzja Hani 2026-11-20): wybór „system” (domyślnie), „light”, „dark”.
// Wybór jest zapisany na koncie (profil użytkownika – każdy domownik ma swój) i w pamięci
// telefonu, żeby przy starcie aplikacji od razu był właściwy (zanim przyjdzie profil).
// Bieżący motyw to atrybut data-theme="light|dark" na <html>; kolory – zmienne CSS z `palette`.

import { useSyncExternalStore } from 'react'
import { palette, type PaletteKey } from './tokens.ts'

export type ThemeChoice = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_CHOICES: ThemeChoice[] = ['system', 'light', 'dark']
export const DEFAULT_THEME: ThemeChoice = 'system'
export const THEME_STORAGE_KEY = 'oz-theme'

export function isThemeChoice(x: unknown): x is ThemeChoice {
  return x === 'system' || x === 'light' || x === 'dark'
}

/** Arkusz stylów ze zmiennymi obu motywów (wstawiany raz przy starcie). */
export function themeCss(): string {
  const vars = (i: 0 | 1) =>
    (Object.keys(palette) as PaletteKey[]).map((k) => `--c-${k}:${palette[k][i]};`).join('')
  return (
    `:root{${vars(0)}--c-light:100%;color-scheme:light}` +
    `:root[data-theme="dark"]{${vars(1)}--c-light:0%;color-scheme:dark}`
  )
}

let choice: ThemeChoice = DEFAULT_THEME
const listeners = new Set<() => void>()

const darkQuery = () =>
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null

export function resolveTheme(c: ThemeChoice, systemDark: boolean): ResolvedTheme {
  return c === 'system' ? (systemDark ? 'dark' : 'light') : c
}

function resolved(): ResolvedTheme {
  return resolveTheme(choice, !!darkQuery()?.matches)
}

function apply() {
  if (typeof document === 'undefined') return
  const r = resolved()
  const root = document.documentElement
  if (root.dataset.theme !== r) root.dataset.theme = r
  // pasek stanu / pasek przeglądarki w kolorze tła ekranu
  const meta = document.querySelector('meta[name="theme-color"]')
  meta?.setAttribute('content', palette.cream[r === 'dark' ? 1 : 0])
  listeners.forEach((l) => l())
}

/** Wybór zapamiętany w telefonie (przed przyjściem profilu). */
export function storedThemeChoice(): ThemeChoice {
  try {
    const s = localStorage.getItem(THEME_STORAGE_KEY)
    return isThemeChoice(s) ? s : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

/** Start aplikacji: style zmiennych, motyw z pamięci telefonu, nasłuch motywu systemu. */
export function installTheme() {
  if (typeof document === 'undefined') return
  if (!document.getElementById('oz-theme-vars')) {
    const style = document.createElement('style')
    style.id = 'oz-theme-vars'
    style.textContent = themeCss()
    document.head.appendChild(style)
  }
  choice = storedThemeChoice()
  darkQuery()?.addEventListener?.('change', apply)
  apply()
}

/** Ustawia wybór motywu (z profilu albo z ekranu „Wygląd”) i zapamiętuje go w telefonie. */
export function setThemeChoice(c: ThemeChoice) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, c)
  } catch {
    // tryb prywatny – motyw i tak przyjdzie z profilu
  }
  if (c === choice) return
  choice = c
  apply()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Bieżący motyw (jasny / ciemny) – np. nagłówek Startu w ciemnym zawsze nocny. */
export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(subscribe, resolved, () => 'light')
}
