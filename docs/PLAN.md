# Ogarnij życie – plan implementacji

Budujemy aplikację w 8 etapach (0–7; kolejność zmieniona 2026-10-20 – patrz etap 3): najpierw klikalny mockup w przeglądarce, potem funkcje jedna po drugiej. Każdy etap kończy się demem, checklistą „Odbiór” i akceptacją Hani. Kolejny etap zaczynamy dopiero po słowie „akceptuję”.

## Decyzje

| Obszar | Decyzja |
| --- | --- |
| Forma | Aplikacja webowa (PWA) na Firebase Hosting, bez instalacji; można dodać do ekranu głównego |
| Technologia | React + TypeScript (Vite) |
| Kod | Pisze Claude w lokalnym repozytorium; konsolę Firebase obsługuje Hania według instrukcji z `docs/FIREBASE.md` |
| Plan Firebase | Spark (darmowy), bez Cloud Functions, bez karty |
| Konta | Firebase Authentication: e‑mail + hasło, z resetem hasła |
| Dane | Cloud Firestore z pamięcią offline w przeglądarce |
| Wspólny dom | Jeden dokument „dom” w Firestore, domownicy jako jego członkowie |
| Bezpieczeństwo | Reguły Firestore: dane domu widzą tylko jego domownicy |
| Zaproszenia | Jednorazowy link lub 6 cyfr, ważne 10 min; ważność i jednorazowość sprawdzają reguły Firestore (bez kodu QR – decyzja Hani 2026-10-20) |
| Powiadomienia | Web Push (VAPID); wysyła darmowy Cloudflare Worker uruchamiany co minutę |
| Wygląd | Tylko motyw jasny; tokeny z `docs/DESIGN.md` |

---

## Etap 0 – Przygotowanie

Cel: pusty projekt, który otwiera się pod adresem testowym w przeglądarce telefonu.

1. Repozytorium: Vite + React + TypeScript, ESLint/Prettier, Vitest, struktura katalogów (`src/app`, `src/screens`, `src/components`, `src/theme`, `src/data`, `src/firebase`).
2. Tokeny wyglądu z `docs/DESIGN.md` (kolory, czcionki Fraunces + Nunito, promienie, cienie) jako jeden moduł `src/theme`.
3. PWA: manifest (nazwa, kolory, ikona domku z ptaszkiem), service worker.
4. Instrukcja dla Hani (`docs/FIREBASE.md`, część „Etap 0”): projekt Firebase, aplikacja web, Hosting, Firebase CLI, kanał podglądu.
5. Mapa ekranów i przejść (z `docs/DESIGN.md`) jako routing (puste ekrany z nazwą).
6. Poprawka tekstów projektu: „bez konta i bez chmury” → teksty zgodne z Firebase (Pierwsze uruchomienie, Ustawienia, Synchronizacja, Zaproszenie). Propozycje do akceptacji Hani.

**Odbiór:**
- [x] Pusta strona z logo domku otwiera się pod adresem testowym w przeglądarce telefonu Hani
- [x] Wszystkie trasy z mapy ekranów istnieją i da się między nimi przejść
- [x] Hania potwierdza nowe teksty o danych w Firebase

## Etap 1 – Klikalny mockup

Cel: wszystkie ekrany z projektu w aplikacji, na przykładowych danych (w pamięci), z działającą nawigacją. Nic się nie zapisuje. Kod mockupu staje się szkieletem aplikacji.

1. Elementy wspólne: nagłówek 120 px z panoramą dachów, pływający dolny pasek (Start, Zadania, +, Kalendarz, Ustawienia) z menu „Co dodajesz?”, kremowe wyciszenie pod paskiem, karty, chipy, przełączniki, arkusze (bottom sheet), przycisk główny.
2. Ładowanie (słońce 6:00–18:00, księżyc wieczorem) i Pierwsze uruchomienie.
3. Start: kafelki, „Ten tydzień”, „Pilne”, „Najbliższe wydarzenia”; wersja dzienna i nocna nagłówka; skróty do filtrów.
4. Zadania: zakładki Do zrobienia / Ogarnięte, grupy, zwijanie, „Zwiń/Rozwiń wszystko”, panel filtrów (zamykany kliknięciem obok), chipy aktywnych filtrów, podzadania z %, gesty przeciągania, arkusz zadania, arkusz „Nowe zadanie”, pasek „Cofnij”, arkusz „Wyczyść”. Kalendarz: arkusz edycji wydarzenia, przeciąganie w lewo, „Cofnij”. Ustawienia → Porządki → wspólny Kosz (zadania i wydarzenia).
5. Kalendarz: tydzień i miesiąc, „Dziś”, agenda dnia, „Później”, arkusz wydarzenia z rodzajami.
6. Ustawienia, Domownicy (bez ekranu synchronizacji i bez „Zmian od domownika” – Firebase synchronizuje sam, decyzja Hani 2026-10-18), Zaproś domownika, Dołącz do domu – z tekstami i zmianami z `docs/TEKSTY.md`.
7. Ekrany konta (nowe – nie ma ich w `docs/design/ekrany/`): Zaloguj się, Załóż konto, Nie pamiętam hasła. Projektuje Claude w stylu pozostałych ekranów (nagłówek 120 px z panoramą, karty, pola 48 px, przycisk główny); Hania akceptuje wygląd przed etapem 2.

**Odbiór:**
- [x] Każdy ekran z `docs/design/ekrany/` jest w aplikacji i wygląda tak samo (porównanie zrzutów obok projektu)
- [x] Wszystkie przyciski i linki prowadzą tam, gdzie w projekcie
- [x] Animacje dzień/noc działają płynnie na telefonie
- [x] Lista poprawek wyglądu zebrana i naniesiona
- [x] Hania akceptuje wygląd ekranów konta (logowanie, rejestracja, reset hasła)

## Etap 2 – Konta i dane w Firestore

1. Model danych (patrz `docs/DESIGN.md` → „Model danych”): dom, domownik, kategoria, zadanie, podzadanie, wydarzenie, rodzaj wydarzenia, ustawienia użytkownika. Każdy rekord: id, `updatedAt`, `updatedBy`.
2. Logowanie e‑mailem i hasłem, rejestracja, reset hasła; Pierwsze uruchomienie → „Załóż nowy dom” tworzy dom.
3. Firestore z pamięcią offline; warstwa dostępu do danych (hooki) zamiast przykładowych danych.
4. Reguły Firestore od pierwszego dnia + testy reguł w emulatorze.
5. Instrukcja dla Hani: włączenie Authentication (e‑mail/hasło) i Firestore, wdrożenie reguł.
6. „Załóż nowy dom”: pole **Nazwa domu** (wpisuje założyciel, np. „Dom na Leśnej”; zmiana w Ustawieniach) – pokazywana m.in. na „Dołącz do domu → Znaleziono dom” (decyzja Hani 2026-10-18).
7. Stałe logowanie (do wylogowania); **„Wyloguj”** jako mały link w stopce Ustawień, z pytaniem „Wylogować?” (decyzja Hani 2026-10-18).
8. Domownik to samo imię – bez formy czasownika (bez „ogarnęła/ogarnął”); wszędzie „HANIA · 9:10”, „Ogarnięte: Hania”, „Dodane: Hania” (decyzja Hani 2026-10-18, już w mockupie).

**Odbiór:**
- [x] Dane przetrwają zamknięcie przeglądarki, działają bez internetu i wracają po zalogowaniu na innym urządzeniu
- [x] Testy reguł: obcy użytkownik nie czyta ani nie zapisuje danych cudzego domu

> **Zmiana kolejności (decyzja Hani 2026-10-20):** Wspólny dom przesunięty zaraz po Zadaniach, żeby testować we dwoje. Odbiory Zadań, Kategorii i filtrów, Kalendarza i Startu – razem, we dwoje, w etapie 5. Push (także „domownik coś dodał”) – etap 6. Dawna numeracja: 4 Kategorie → 5, 5 Kalendarz → 5, 6 Start → 5, 7 Push → 6, 8 Wspólny dom → 4, 9 Publikacja → 7.

## Etap 3 – Zadania

- Dodawanie (arkusz „Nowe zadanie”), edycja w arkuszu zadania (klik w treść), odhaczanie kwadracikiem.
- Zakładki „Do zrobienia” / „Ogarnięte”; ogarnięte pogrupowane po dacie, z informacją kto i kiedy.
- Gesty: przeciągnięcie w prawo = ogarnij / przywróć, w lewo = do kosza; pasek „Cofnij” po każdej akcji (cofa tylko zmiany z tej akcji).
- Wspólny Kosz (wejście z Ustawień → Porządki): miękkie usuwanie (`deleted`, `deletedAt`, `deletedBy`), przywracanie, „Opróżnij kosz” z potwierdzeniem, licznik „zniknie za N dni”, chipy Wszystko / Zadania / Wydarzenia.
- „Wyczyść” w zakładce Ogarnięte: starsze niż 7 dni / 30 dni / wszystkie → do kosza.
- Podzadania z % postępu, termin (czerwona plakietka „DZIŚ”), priorytet Pilne/Ważne/Przy okazji, notatka.

**Status:** kod gotowy (2026-10-20). **Odbiór przeniesiony do etapu 5** (testy we dwoje):
- [ ] Przez tydzień Hania prowadzi w aplikacji prawdziwe zadania i nic nie znika
- [ ] Gesty działają na telefonie i nie przeszkadzają w przewijaniu; „Cofnij” przywraca dokładnie poprzedni stan
- [ ] Zadanie z kosza wraca na swoje miejsce (kategoria, priorytet, kroki)

## Etap 4 – Wspólny dom (dawniej 8)

1. **Zaproszenie:** jednorazowy link i 6 cyfr (ważne 10 min) – zapisane w Firestore (`invites/{kod}`); „Dołącz do domu” realizuje je, reguły Firestore sprawdzają ważność i jednorazowość. **Bez kodu QR i bez skanowania** (decyzja Hani 2026-10-20) – na „Zaproś domownika” znika obrazek QR, na „Dołącz do domu” skaner z ramką aparatu.
2. **Dołączanie:** po kodzie albo linku „Znaleziono dom” z nazwą domu i domownikami, imię nowego domownika, „Dołącz jako …” → dom widoczny od razu.
3. **Zakres:** domownik widzi wszystko albo wybrane kategorie i kalendarz; reguły to wymuszają.
   - Ekran Domownicy: dotknięcie domownika → arkusz: zmiana zakresu (Wszystko / Wybrane) i „Usuń z domu” – tylko założyciel domu; każdy domownik może sam „Opuścić dom”; zapraszać może każdy (decyzja Hani 2026-10-18).
4. **Konflikty:** nowsza zmiana wygrywa; usunięte zawsze można przywrócić z Kosza.
5. Reguły + testy reguł w emulatorze (Hania uruchamia na komputerze z Javą 21), wgranie reguł, publikacja wersji testowej.

**Odbiór:**
- [ ] Zadanie dodane na jednym telefonie pojawia się na drugim w kilka sekund
- [ ] Zmiany offline na obu telefonach łączą się bez utraty danych
- [ ] Osoba spoza domu nie widzi danych, nawet znając identyfikator
- [ ] Zużyty albo przeterminowany kod nie działa

## Etap 5 – Kategorie, Kalendarz, Start i wspólne testowanie (dawniej 4, 5, 6)

Funkcje są w aplikacji od etapów 1–2; w tym etapie poprawki z testów we dwoje i odbiory.

- **Kategorie i filtry:** własne kategorie z kolorem; usuwanie z przeniesieniem zadań do „Bez kategorii”; panel filtrów (Pokaż + kategoria), chipy z „×”, licznik na „Filtry”, zamykanie kliknięciem obok; grupowanie po kategorii / priorytecie, zwijanie, „Zwiń/Rozwiń wszystko”.
- **Kalendarz:** rodzaje (wbudowane + własne), cały dzień / od–do, przypomnienie (zapisane, wysyłka w etapie 6); tydzień, miesiąc, agenda, „Później”, „Dziś”; terminy zadań w kalendarzu; edycja, usuwanie (z pytaniem) → Kosz, „Cofnij”.
- **Start:** kafelki z danych („Ogarnięte dziś X / Y”: Y = ogarnięte dziś + niezrobione z terminem na dziś lub po terminie), skróty do Zadań / Kalendarza, powitanie dzień/noc; zadania i wydarzenia na Starcie działają jak w Zadaniach i Kalendarzu.
- **Tydzień używania we dwoje** (Hania + domownik), lista uwag, poprawki.

**Odbiór (w tym przeniesiony z etapu 3):**
- [ ] Zadania: przez tydzień prawdziwe zadania i nic nie znika; gesty działają i nie przeszkadzają w przewijaniu; „Cofnij” przywraca dokładnie poprzedni stan; zadanie z kosza wraca na swoje miejsce
- [ ] Każda kombinacja filtrów daje poprawną listę, liczniki się zgadzają
- [ ] Wydarzenia zapisują się poprawnie i są widoczne u wszystkich domowników; usunięte wydarzenie jest w Koszu i po „Przywróć” wraca na swój dzień
- [ ] Liczby na Starcie zawsze zgadzają się z listą zadań

## Etap 6 – Ustawienia i powiadomienia push (dawniej 7)

- Profil (imię lub pseudonim), cztery przełączniki powiadomień zapisane w Firestore.
- Porządki: „Sprzątanie ogarniętych” (7 / 30 dni / nigdy) i wejście do Kosza. Automatyczne sprzątanie i trwałe usuwanie z kosza po 30 dniach wykonuje Worker raz dziennie (zapasowo: aplikacja przy uruchomieniu).
- Web Push: zgoda w przeglądarce, subskrypcja zapisana przy użytkowniku, instrukcja „Dodaj do ekranu głównego” na iPhonie.
- Prośba o zgodę na powiadomienia: po Pierwszym uruchomieniu (karta „Włączyć przypomnienia?”) **i** przy włączaniu przełącznika w Ustawieniach (decyzja Hani 2026-10-18).
- „Terminy zadań”: godzina przypomnienia dzień przed terminem do wyboru w Ustawieniach (pod przełącznikiem; domyślnie 18:00 – do potwierdzenia).
- Poranne podsumowanie o 8:00 tylko wtedy, gdy jest coś pilnego, termin na dziś albo wydarzenie dziś – inaczej nie wysyłamy (decyzja Hani 2026-10-18).
- **Zmiany od domowników** (z dawnego etapu 8): push, gdy domownik doda lub ogarnie zadanie (bez osobnego ekranu – zmiany widać od razu na listach).
- Cloudflare Worker (darmowy plan, cron co minutę): sprawdza, co jest do wysłania (terminy, wydarzenia, poranne podsumowanie o 8:00, zmiany domowników), wysyła push. Instrukcja dla Hani: konto Cloudflare, klucze VAPID, konto serwisowe Firebase jako sekret Workera.
- Motyw: tylko jasny, wybór ukryty.

**Odbiór:**
- [ ] Przypomnienie przychodzi przy zamkniętej stronie z opóźnieniem najwyżej 1 min
- [ ] Wyłączone powiadomienie nie przychodzi
- [ ] Domownik dostaje push, gdy ktoś inny doda lub ogarnie zadanie
- [ ] Działa na Androidzie (Chrome) i na iPhonie (strona dodana do ekranu głównego)

## Etap 7 – Testy i publikacja (dawniej 9)

- Testy automatyczne (filtry, liczniki, reguły) i ręczne w Chrome na Androidzie i Safari na iPhonie.
- Dwa tygodnie codziennego używania w domu, lista poprawek.
- Ikona i ekran startowy po dodaniu do ekranu głównego; usuwanie konta z poziomu aplikacji. Gdy usuwa je założyciel domu, a są inni domownicy – aplikacja pyta: usunąć dom (u wszystkich) czy przekazać go wybranemu domownikowi (decyzja Hani 2026-10-18).
- Publikacja na Firebase Hosting pod docelowym adresem (własna domena opcjonalnie).

**Odbiór:**
- [ ] Brak znanych błędów, które tracą dane
- [ ] Aplikacja działa w przeglądarkach telefonów wszystkich domowników

---

## Jak sprawdzamy każdy etap

1. Demo: link do wersji testowej (kanał podglądu Firebase Hosting albo `npm run dev` w sieci domowej) + 2–5 rzeczy do kliknięcia z opisem oczekiwanego efektu.
2. Porównanie z projektem: zrzuty ekranów aplikacji obok ekranów z `docs/design/ekrany/`.
3. Uwagi Hani → `docs/POSTEP.md`, każda jako „poprawka teraz” lub „później”.
4. Poprawki „teraz” w tym samym etapie, ponowne sprawdzenie.
5. Akceptacja („akceptuję”) → kolejny etap.

Blokuje przejście dalej: utrata lub pomieszanie danych, ekran różny od projektu bez zgody, niedziałający przycisk lub przejście.

## Ryzyka

| Ryzyko | Co robimy |
| --- | --- |
| Darmowy Worker ma 10 ms czasu procesora na uruchomienie | Worker wysyła tylko to, co przypada na daną minutę; zapasowo harmonogram w GitHub Actions |
| Push na iPhonie tylko ze strony dodanej do ekranu głównego | Instrukcja przy pierwszym włączeniu powiadomień |
| Przekroczenie limitów planu Spark | Bez karty usługa się zatrzymuje, nie nalicza opłat; przy 2–3 osobach mało prawdopodobne |
| Błędne reguły bezpieczeństwa | Reguły od etapu 2, testy w emulatorze przy każdej zmianie |
| Konflikty offline | Czas i autor przy każdej zmianie; „nowsza wygrywa”; usunięte do Kosza (można przywrócić) |
| Ograniczenia Safari (pamięć) | Testy na iPhonie od etapu 1; dołączanie linkiem lub 6 cyframi (bez aparatu) |
