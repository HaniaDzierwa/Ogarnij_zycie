# Postęp prac

Aktualny etap: **1 – Klikalny mockup** (w toku)

| Etap | Status | Akceptacja |
| --- | --- | --- |
| 0 Przygotowanie | zakończony | 2026-10-18 |
| 1 Klikalny mockup | w toku | – |
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
| 2026-10-18 | 0 | Demo na telefonie działa. | – | ok |
| 2026-10-18 | 0 | Teksty o danych z `docs/TEKSTY.md` zaakceptowane (A i B). | teraz | zrobione |
| 2026-10-18 | 0 | Ekrany logowania, rejestracji i resetu hasła projektuje Claude w tym samym stylu – dopisane do etapu 1 w PLAN.md. | później (etap 1) | zapisane |
| 2026-10-18 | 0 | Po założeniu konta użytkownik zostaje zalogowany na stałe (do „Wyloguj” w Ustawieniach); bez ponownego logowania przy każdym otwarciu. Firebase Auth z trwałym zapisem sesji (`browserLocalPersistence`); na iPhonie zalecane dodanie do ekranu głównego. | później (etap 2) | zapisane |

## Dziennik kroków

<!-- Claude: po każdym kroku dopisz: data · etap · co zrobiono · jak sprawdzić -->

- 2026-10-18 · Etap 0 · Krok 1: szkielet projektu – Vite + React + TypeScript, ESLint + Prettier, Vitest (jsdom), katalogi `src/app`, `src/screens`, `src/components`, `src/theme`, `src/data`, `src/firebase`; Firebase CLI lokalnie w projekcie (`npx firebase`). · Sprawdzenie: `npm run lint`, `npm test`, `npm run build` przechodzą; `npm run dev` pokazuje napis „Ogarnij życie”.
- 2026-10-18 · Etap 0 · Krok 2: tokeny wyglądu w `src/theme` (kolory, priorytety, kategorie, rodzaje wydarzeń, czcionki Fraunces + Nunito, promienie, cienie, rozmiary) + style bazowe (`global.css`, cienki pasek przewijania) + komponent `Logo`. Dodane kolory używane w ekranach, a brakujące w DESIGN.md: nagłówek dzienny, krem arkuszy `#FFFCF6`, hover linku `#5C4420`, dni tygodnia `#7A8A80`. · Sprawdzenie: `npm run dev` – kremowe tło, zielony kafelek z domkiem i mosiężnym ptaszkiem, napis „Ogarnij *życie*” czcionką Fraunces; `npm test` – 4 testy.
- 2026-10-18 · Etap 0 · Krok 3: PWA – `vite-plugin-pwa`: manifest (nazwa „Ogarnij życie”, tryb standalone, pionowo, kolor kremowy), service worker (aplikacja i czcionki działają bez internetu, automatyczna aktualizacja), ikony z `public/logo.svg` (64, 192, 512, maskowalna 512, iPhone 180, favicon; ponowne wygenerowanie: `npm run ikony`), znaczniki dla Safari na iPhonie. · Sprawdzenie: `npm run build` tworzy `dist/manifest.webmanifest` i `dist/sw.js`; na telefonie (po publikacji testowej) „Dodaj do ekranu głównego” pokazuje ikonę domku.
- 2026-10-18 · Etap 0 · Krok 4: routing (React Router) – mapa ekranów i przejść w `src/app/screens.ts` (10 ekranów z DESIGN.md, przejścia z linków w `docs/design/ekrany/`), puste ekrany z nazwą i listą przejść, warianty przez parametry (`/zadania?pokaz=pilne|ogarniete`, `/kalendarz?dzien=RRRR-MM-DD`), pomocnicza `/mapa` (też dla nieznanych adresów). Każdy ekran ma w nagłówku logo domku. · Sprawdzenie: `npm run dev` → `/mapa`, kliknij dowolny ekran i jego przejścia; `npm test` – 25 testów (każdy ekran istnieje, każde przejście prowadzi do istniejącego ekranu).
- 2026-10-18 · Etap 0 · Krok 5: połączenie z Firebase – `.firebaserc` (projekt `ogarnij-zycie`), `firebase.json` (Hosting z `dist`, wszystkie adresy → `index.html`, `no-cache` dla `index.html`/`sw.js`/manifestu, długie cache dla `/assets`), konfiguracja aplikacji web w `src/firebase/config.ts`. Hosting w projekcie sprawdzony (`hosting:sites:list`). · Sprawdzenie: `npm run build` + `npx firebase hosting:channel:deploy test` → adres podglądu na telefonie.
- 2026-10-18 · Etap 0 · Publikacja testowa (Hania): https://ogarnij-zycie--test-56tdtc0y.web.app (ważna do 2026-10-25); sprawdzone: strona, podstrona `/zadania?pokaz=pilne`, manifest, service worker, ikona iPhone – 200. Poprawka: no-cache dla podstron (było 1 h).
- 2026-10-18 · Etap 0 · Krok 6: propozycje tekstów o danych zgodnych z Firebase w `docs/TEKSTY.md` (16 zmian tekstu + 5 decyzji o elementach ekranu Synchronizacja). · Sprawdzenie: Hania czyta i akceptuje / poprawia.
- 2026-10-18 · Etap 0 · Odbiór: wszystkie punkty spełnione, Hania: „akceptuję”. Etap 0 zakończony.
- 2026-10-18 · Etap 1 · Krok 1: elementy wspólne w `src/components` – `Header` (120 px, dzień/noc/ciemny, panorama dachów, link „wstecz”), `SyncBadge` (ONLINE), `TabBar` (pływający pasek, mosiężny „+”, menu „Co dodajesz?” → `/zadania?nowe=zadanie` / `/kalendarz?nowe=wydarzenie`, kremowe wyciszenie), `Card`, `Chip`, `Dot`, `Box`, `Toggle`/`ToggleRow`, `Segmented` (mały i pełny), `PrimaryButton`, `Sheet` (arkusz od dołu), `Field`, ikony. Puste ekrany używają nowego nagłówka i paska (pasek tylko na Start, Zadania, Kalendarz, Ustawienia, Domownicy). Galeria `/elementy`. · Sprawdzenie: `/elementy` – porównać z projektem; „+” → menu → „Zadanie”; zakładki w pasku; `npm test` – 30 testów.
- 2026-10-18 · Etap 1 · Krok 2: przykładowe dane – `src/data`: model (`types.ts`), daty po polsku (`dates.ts`: etykiety dni, termin DZIŚ/JUTRO/WT 13 PAŹ/DO 30 PAŹ, `?dzis=RRRR-MM-DD` do porównań z projektem), dane z projektu (`mock.ts`, daty względem dziś), wyliczenia (`selectors.ts`), magazyn w pamięci (`MockStore.tsx`). Teksty #17–18 (Wi‑Fi) dopisane do TEKSTY.md. · Sprawdzenie: `npm test` – 38 testów, m.in. liczby ze Startu w projekcie (12 do zrobienia, 6 kategorii, 4 pilne).
