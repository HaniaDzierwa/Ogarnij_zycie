# Ogarnij życie – instrukcje dla Claude (Claude Code)

Ten plik czytasz na początku każdej sesji w tym repozytorium.

## Co budujemy

„Ogarnij życie” to webowa aplikacja (PWA) do ogarniania domu: zadania z kategoriami, priorytetami i podzadaniami, kalendarz wydarzeń, wspólny dom z domownikami. Otwierana w przeglądarce telefonu (Android – Chrome, iPhone – Safari), hostowana na Firebase Hosting. Interfejs wyłącznie po polsku.

- Plan etapów: `docs/PLAN.md` – **źródło prawdy o tym, co robimy teraz i co dalej**.
- Wygląd i zachowanie ekranów: `docs/DESIGN.md` + źródła ekranów w `docs/design/ekrany/`.
- Rzeczy w konsoli Firebase robi Hania – Ty piszesz jej instrukcje: `docs/FIREBASE.md`.
- Stan prac: `docs/POSTEP.md` (aktualizujesz go po każdym kroku).

## Stos technologiczny (ustalony)

- React + TypeScript, Vite, PWA (manifest + service worker).
- Firebase JS SDK (modułowe API): Authentication (e‑mail + hasło), Cloud Firestore z pamięcią offline (persistentLocalCache), Hosting.
- Plan Firebase **Spark** (darmowy): **bez Cloud Functions**, bez Firebase Storage. Wszystko, co wymaga serwera, rozwiązujemy regułami Firestore albo (tylko powiadomienia push, etap 7) darmowym Cloudflare Workerem z harmonogramem co minutę.
- Powiadomienia: Web Push (Push API + VAPID). Na iPhonie działa tylko po dodaniu strony do ekranu głównego.
- Testy: Vitest (logika), Firebase Emulator Suite (reguły Firestore), ręczne demo na telefonie.
- Na start **tylko motyw jasny**. Wybór motywu w Ustawieniach ukryty.

Nie zmieniaj stosu bez pytania Hani.

## Jak pracujemy (obowiązkowe)

1. **Jeden etap naraz.** Pracujesz tylko nad bieżącym etapem z `docs/PLAN.md`. Nie wybiegaj do przodu, nawet jeśli to „szybka rzecz”.
2. **Małe kroki.** Etap dzielisz na kroki; każdy krok = osobny commit z opisem po polsku (co zrobiono, jak sprawdzić).
3. **Koniec etapu = demo i stop.** Na końcu etapu:
   - uruchamiasz testy i build,
   - podajesz Hani listę 2–5 rzeczy do kliknięcia i opis oczekiwanego efektu,
   - przechodzisz z nią checklistę „Odbiór” z planu,
   - **czekasz na słowo „akceptuję”**. Bez niego nie zaczynasz kolejnego etapu.
4. **Uwagi Hani** zapisujesz w `docs/POSTEP.md` jako „poprawka teraz” lub „później”. Poprawki „teraz” robisz w tym samym etapie.
5. **Firebase w konsoli robi Hania.** Gdy krok wymaga czegoś w konsoli Firebase / Google / Cloudflare, przerywasz, dopisujesz instrukcję do `docs/FIREBASE.md` (krok po kroku, po polsku, z dokładnymi nazwami przycisków) i prosisz Hanię o wykonanie i podanie wyniku (np. konfiguracji aplikacji). Nigdy nie zakładaj, że coś w konsoli jest już ustawione.
6. **Sekrety** (klucz prywatny VAPID, konto serwisowe) nigdy nie trafiają do repozytorium. Konfiguracja aplikacji web Firebase (apiKey itd.) może być w `.env` / kodzie – to nie jest sekret, ale chronią ją reguły Firestore.
7. **Wierność projektowi.** Ekrany mają wyglądać jak w `docs/design/ekrany/`. Jeśli coś trzeba zmienić w wyglądzie, najpierw pytasz Hanię.

## Słownictwo (spójne w całej aplikacji)

- **Kategoria** (nie „pokój”, nie „lista”). Domyślne: Zakupy, Dom, Zdrowie, Urzędy, Auto, Rodzina; usunięcie kategorii przenosi zadania do „Bez kategorii”.
- **Priorytety: Pilne · Ważne · Przy okazji** – wszędzie te trzy nazwy (etykiety, grupy, filtry, Start). Nie używaj „wysoki/średni/niski”.
- **Termin** to nie status. „DZIŚ” przy niezrobionym zadaniu = czerwona plakietka; pozostałe terminy (JUTRO, DO 15 PAŹ) zwykłym mosiężnym tekstem.
- „Ogarnięte” = zrobione. „Już ogarnięte” = sekcja zrobionych.
- „Domownik”, „Wspólny dom”, „Zaproś domownika”, „Dołącz do domu”.
- Filtr „Pokaż”: Wszystkie · Pilne · Ważne · Przy okazji (bez „Na dziś” i bez „Ogarnięte” – ogarnięte mają własną zakładkę).
- Zakładki na ekranie Zadania: „Do zrobienia” i „Ogarnięte”.
- „Kosz”: **jeden wspólny** na zadania i wydarzenia; usunięte czekają 30 dni na przywrócenie, potem znikają same. Stałe wejście tylko w Ustawienia → Porządki → Kosz (bez ikon kosza na ekranach Zadania i Kalendarz); na co dzień pomyłki naprawia pasek „Cofnij”.

## Interakcje na liście zadań (ustalone)

- Kwadracik po lewej (pole 56 px × cała wysokość wiersza) = ogarnięte / przywróć.
- Klik w treść zadania = arkusz zadania (edycja w miejscu, na dole „Usuń” i „Ogarnij/Przywróć”).
- Przeciągnięcie w prawo = ogarnij (w zakładce Ogarnięte: przywróć); w lewo = do kosza. Próg ok. 90 px.
- Każde usunięcie zadania lub wydarzenia (gest, „Usuń” w arkuszu) najpierw pyta „Usunąć zadanie?” / „Usunąć wydarzenie?” (Anuluj / Usuń). Usunięte trafiają do Kosza.
- Każda taka akcja pokazuje pasek „… · COFNIJ” (ok. 4,5 s).
- Strzałka „˅” rozwija podzadania (tylko gdy zadanie je ma).
- Odhaczenie wszystkich podzadań ogarnia zadanie; odznaczenie kroku przywraca je.

## Komendy

Firebase CLI jest zależnością projektu (nie globalną) – komendy Firebase zawsze przez `npx firebase …`.

- `npm run dev` – serwer deweloperski (`npm run dev:telefon` – dostępny w sieci domowej)
- `npm test` – testy (Vitest, jednorazowo); `npm run test:watch` – w trybie ciągłym
- `npm run lint` – ESLint; `npm run format` – Prettier
- `npm run build` – build produkcyjny (`tsc -b` + Vite)
- `npm run emulators` – emulatory (Auth, Firestore)
- `npx firebase deploy` – robi Hania albo Ty po jej zgodzie
- Projekt Firebase: `ogarnij-zycie`
