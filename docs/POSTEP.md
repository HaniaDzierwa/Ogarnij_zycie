# Postęp prac

Aktualny etap: **0 – Przygotowanie** (w toku)

| Etap | Status | Akceptacja |
| --- | --- | --- |
| 0 Przygotowanie | w toku | – |
| 1 Klikalny mockup | – | – |
| 2 Konta i dane | – | – |
| 3 Zadania | – | – |
| 4 Kategorie i filtry | – | – |
| 5 Kalendarz | – | – |
| 6 Start | – | – |
| 7 Ustawienia i push | – | – |
| 8 Wspólny dom | – | – |
| 9 Testy i publikacja | – | – |

## Uwagi Hani

| Data | Etap | Uwaga | Kiedy | Status |
| --- | --- | --- | --- | --- |

## Dziennik kroków

<!-- Claude: po każdym kroku dopisz: data · etap · co zrobiono · jak sprawdzić -->

- 2026-10-18 · Etap 0 · Krok 1: szkielet projektu – Vite + React + TypeScript, ESLint + Prettier, Vitest (jsdom), katalogi `src/app`, `src/screens`, `src/components`, `src/theme`, `src/data`, `src/firebase`; Firebase CLI lokalnie w projekcie (`npx firebase`). · Sprawdzenie: `npm run lint`, `npm test`, `npm run build` przechodzą; `npm run dev` pokazuje napis „Ogarnij życie”.
- 2026-10-18 · Etap 0 · Krok 2: tokeny wyglądu w `src/theme` (kolory, priorytety, kategorie, rodzaje wydarzeń, czcionki Fraunces + Nunito, promienie, cienie, rozmiary) + style bazowe (`global.css`, cienki pasek przewijania) + komponent `Logo`. Dodane kolory używane w ekranach, a brakujące w DESIGN.md: nagłówek dzienny, krem arkuszy `#FFFCF6`, hover linku `#5C4420`, dni tygodnia `#7A8A80`. · Sprawdzenie: `npm run dev` – kremowe tło, zielony kafelek z domkiem i mosiężnym ptaszkiem, napis „Ogarnij *życie*” czcionką Fraunces; `npm test` – 4 testy.
