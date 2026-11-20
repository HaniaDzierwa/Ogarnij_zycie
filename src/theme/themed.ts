// Kolory z danych (kategorie, własne priorytety, rodzaje wydarzeń) w obu motywach.
//
// W bazie są zwykłe '#RRGGBB' (jasne odcienie wyliczone przy zapisie). Przy wyświetlaniu
// `themed(jasny, ciemny)` wybiera wariant motywu bez JS: zmienna --c-light to 100% w jasnym
// i 0% w ciemnym (theme.ts), więc color-mix daje dokładnie jeden z dwóch kolorów.

import { DARK_CARD, DARK_INK, shade } from './tokens.ts'

/** Kolor jasnego motywu albo ciemnego – wg bieżącego motywu (CSS, bez ponownego renderu). */
export function themed(light: string, dark: string): string {
  return `color-mix(in srgb, ${light} var(--c-light, 100%), ${dark})`
}

const mix = (color: string, pct: number, base: string) =>
  `color-mix(in srgb, ${color} ${pct}%, ${base})`

/** Kropka / obwódka koloru z danych – w ciemnym rozjaśniona (np. „Rodzina” #1F3D2E). */
export const tintDot = (color: string) => themed(color, mix(color, 70, DARK_INK))

/** Tło plakietki z koloru z danych: jasny pastel / ciemny odcień na karcie. */
export const tintBg = (color: string) => themed(shade(color, 0.82), mix(color, 26, DARK_CARD))

/** Napis plakietki z koloru z danych: przyciemniony / rozjaśniony. */
export const tintFg = (color: string) => themed(shade(color, -0.35), mix(color, 45, DARK_INK))

/**
 * Rodzaj wydarzenia do wyświetlenia: jasne bg/fg z bazy bez zmian, w ciemnym wyliczone z kropki.
 * (Do zapisu zawsze oryginalny typ – ten wynik to tylko kolory dla stylów.)
 */
export function eventTint(t: { dot: string; bg: string; fg: string }) {
  return {
    dot: themed(t.dot, t.dot),
    bg: themed(t.bg, mix(t.dot, 24, DARK_CARD)),
    fg: themed(t.fg, mix(t.dot, 80, DARK_INK)),
  }
}
