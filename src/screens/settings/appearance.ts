import type { ThemeChoice } from '../../theme'

/** Opcje motywu (kanwa „Motyw jasny i ciemny”): nazwa, podpowiedź, opis wiersza w Ustawieniach. */
export const THEMES: { id: ThemeChoice; name: string; hint: string; meta: string }[] = [
  { id: 'system', name: 'Systemowy', hint: 'Jak w telefonie.', meta: 'JAK W TELEFONIE' },
  { id: 'light', name: 'Jasny', hint: 'Zawsze jasny.', meta: 'JASNY' },
  { id: 'dark', name: 'Ciemny', hint: 'Zawsze ciemny.', meta: 'CIEMNY' },
]

/** Opis wiersza „Wygląd” w Ustawieniach. */
export const themeMeta = (t: ThemeChoice) => (THEMES.find((o) => o.id === t) ?? THEMES[0]).meta
