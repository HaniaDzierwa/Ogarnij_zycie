# Ogarnij życie – plan implementacji

Budujemy aplikację w 10 etapach: najpierw klikalny mockup w przeglądarce, potem funkcje jedna po drugiej. Każdy etap kończy się demem, checklistą „Odbiór” i akceptacją Hani. Kolejny etap zaczynamy dopiero po słowie „akceptuję”.

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
| Zaproszenia | Jednorazowy link, kod QR lub 6 cyfr, ważne 10 min; ważność i jednorazowość sprawdzają reguły Firestore |
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
- [ ] Pusta strona z logo domku otwiera się pod adresem testowym w przeglądarce telefonu Hani
- [ ] Wszystkie trasy z mapy ekranów istnieją i da się między nimi przejść
- [ ] Hania potwierdza nowe teksty o danych w Firebase

## Etap 1 – Klikalny mockup

Cel: wszystkie ekrany z projektu w aplikacji, na przykładowych danych (w pamięci), z działającą nawigacją. Nic się nie zapisuje. Kod mockupu staje się szkieletem aplikacji.

1. Elementy wspólne: nagłówek 120 px z panoramą dachów, pływający dolny pasek (Start, Zadania, +, Kalendarz, Ustawienia) z menu „Co dodajesz?”, kremowe wyciszenie pod paskiem, karty, chipy, przełączniki, arkusze (bottom sheet), przycisk główny.
2. Ładowanie (słońce 6:00–18:00, księżyc wieczorem) i Pierwsze uruchomienie.
3. Start: kafelki, „Ten tydzień”, „Pilne”, „Najbliższe wydarzenia”; wersja dzienna i nocna nagłówka; skróty do filtrów.
4. Zadania: zakładki Do zrobienia / Ogarnięte, grupy, zwijanie, „Zwiń/Rozwiń wszystko”, panel filtrów (zamykany kliknięciem obok), chipy aktywnych filtrów, podzadania z %, gesty przeciągania, arkusz zadania, arkusz „Nowe zadanie”, pasek „Cofnij”, arkusz „Wyczyść”, ekran Kosza.
5. Kalendarz: tydzień i miesiąc, „Dziś”, agenda dnia, „Później”, arkusz wydarzenia z rodzajami.
6. Ustawienia, Synchronizacja (Domownicy), Zmiany od domownika, Zaproś domownika, Dołącz do domu – z tekstami i zmianami z `docs/TEKSTY.md`.
7. Ekrany konta (nowe – nie ma ich w `docs/design/ekrany/`): Zaloguj się, Załóż konto, Nie pamiętam hasła. Projektuje Claude w stylu pozostałych ekranów (nagłówek 120 px z panoramą, karty, pola 48 px, przycisk główny); Hania akceptuje wygląd przed etapem 2.

**Odbiór:**
- [ ] Każdy ekran z `docs/design/ekrany/` jest w aplikacji i wygląda tak samo (porównanie zrzutów obok projektu)
- [ ] Wszystkie przyciski i linki prowadzą tam, gdzie w projekcie
- [ ] Animacje dzień/noc działają płynnie na telefonie
- [ ] Lista poprawek wyglądu zebrana i naniesiona
- [x] Hania akceptuje wygląd ekranów konta (logowanie, rejestracja, reset hasła)

## Etap 2 – Konta i dane w Firestore

1. Model danych (patrz `docs/DESIGN.md` → „Model danych”): dom, domownik, kategoria, zadanie, podzadanie, wydarzenie, rodzaj wydarzenia, ustawienia użytkownika. Każdy rekord: id, `updatedAt`, `updatedBy`.
2. Logowanie e‑mailem i hasłem, rejestracja, reset hasła; Pierwsze uruchomienie → „Załóż nowy dom” tworzy dom.
3. Firestore z pamięcią offline; warstwa dostępu do danych (hooki) zamiast przykładowych danych.
4. Reguły Firestore od pierwszego dnia + testy reguł w emulatorze.
5. Instrukcja dla Hani: włączenie Authentication (e‑mail/hasło) i Firestore, wdrożenie reguł.

**Odbiór:**
- [ ] Dane przetrwają zamknięcie przeglądarki, działają bez internetu i wracają po zalogowaniu na innym urządzeniu
- [ ] Testy reguł: obcy użytkownik nie czyta ani nie zapisuje danych cudzego domu

## Etap 3 – Zadania

- Dodawanie (arkusz „Nowe zadanie”), edycja w arkuszu zadania (klik w treść), odhaczanie kwadracikiem.
- Zakładki „Do zrobienia” / „Ogarnięte”; ogarnięte pogrupowane po dacie, z informacją kto i kiedy.
- Gesty: przeciągnięcie w prawo = ogarnij / przywróć, w lewo = do kosza; pasek „Cofnij” po każdej akcji.
- Kosz: miękkie usuwanie (`deleted`, `deletedAt`), przywracanie, „Opróżnij kosz” z potwierdzeniem, licznik „zniknie za N dni”.
- „Wyczyść” w zakładce Ogarnięte: starsze niż 7 dni / 30 dni / wszystkie → do kosza.
- Podzadania z % postępu, termin (czerwona plakietka „DZIŚ”), priorytet Pilne/Ważne/Przy okazji.

**Odbiór:**
- [ ] Przez tydzień Hania prowadzi w aplikacji prawdziwe zadania i nic nie znika
- [ ] Gesty działają na telefonie i nie przeszkadzają w przewijaniu; „Cofnij” przywraca dokładnie poprzedni stan
- [ ] Zadanie z kosza wraca na swoje miejsce (kategoria, priorytet, kroki)

## Etap 4 – Kategorie i filtry

- Własne kategorie z kolorem; usuwanie z przeniesieniem zadań do „Bez kategorii”.
- Panel filtrów: Pokaż (Wszystkie, Pilne, Ważne, Przy okazji) + kategoria; chipy aktywnych filtrów z „×”; licznik na przycisku „Filtry”; zamykanie kliknięciem obok.
- Grupowanie po kategorii lub priorytecie, zwijanie grup, „Zwiń/Rozwiń wszystko”.

**Odbiór:** każda kombinacja filtrów daje poprawną listę, liczniki się zgadzają.

## Etap 5 – Kalendarz

- Wydarzenia: rodzaj (wbudowane + własne), cały dzień lub od–do, przypomnienie (zapisane, wysyłka w etapie 7).
- Widok tygodnia i miesiąca, agenda dnia, „Później”, „Dziś”; terminy zadań widoczne w kalendarzu.

**Odbiór:** wydarzenia zapisują się poprawnie i są widoczne u wszystkich domowników.

## Etap 6 – Start

- Kafelki liczone z danych: do zrobienia, pilne, w tym tygodniu, ogarnięte dziś.
- Skróty: kafelek otwiera Zadania z filtrem (np. Pilne), zakładkę Ogarnięte albo Kalendarz z zaznaczonym dniem.
- Powitanie z imieniem; wersja dzienna/nocna zależnie od godziny.

**Odbiór:** liczby na Starcie zawsze zgadzają się z listą zadań.

## Etap 7 – Ustawienia i powiadomienia push

- Profil (imię lub pseudonim), cztery przełączniki powiadomień zapisane w Firestore.
- Zadania: „Sprzątanie ogarniętych” (7 / 30 dni / nigdy) i wejście do Kosza. Automatyczne sprzątanie i trwałe usuwanie z kosza po 30 dniach wykonuje Worker raz dziennie (zapasowo: aplikacja przy uruchomieniu).
- Web Push: zgoda w przeglądarce, subskrypcja zapisana przy użytkowniku, instrukcja „Dodaj do ekranu głównego” na iPhonie.
- Cloudflare Worker (darmowy plan, cron co minutę): sprawdza, co jest do wysłania (terminy, wydarzenia, poranne podsumowanie o 8:00), wysyła push. Instrukcja dla Hani: konto Cloudflare, klucze VAPID, konto serwisowe Firebase jako sekret Workera.
- Motyw: tylko jasny, wybór ukryty.

**Odbiór:**
- [ ] Przypomnienie przychodzi przy zamkniętej stronie z opóźnieniem najwyżej 1 min
- [ ] Wyłączone powiadomienie nie przychodzi
- [ ] Działa na Androidzie (Chrome) i na iPhonie (strona dodana do ekranu głównego)

## Etap 8 – Wspólny dom

1. **Zaproszenie:** jednorazowy link oraz kod QR i 6 cyfr (ważne 10 min); „Dołącz do domu” realizuje je, reguły Firestore sprawdzają ważność i jednorazowość.
2. **Zakres:** domownik widzi wszystko albo wybrane kategorie i kalendarz; reguły to wymuszają.
3. **Zmiany od domowników:** ekran „Zmiany od …” i push, gdy ktoś doda lub ogarnie zadanie.
4. **Konflikty:** nowsza zmiana wygrywa; „usunął vs. zmieniła” trafia do „Do decyzji”.

**Odbiór:**
- [ ] Zadanie dodane na jednym telefonie pojawia się na drugim w kilka sekund
- [ ] Zmiany offline na obu telefonach łączą się bez utraty danych
- [ ] Osoba spoza domu nie widzi danych, nawet znając identyfikator
- [ ] Zużyty albo przeterminowany kod nie działa

## Etap 9 – Testy i publikacja

- Testy automatyczne (filtry, liczniki, reguły) i ręczne w Chrome na Androidzie i Safari na iPhonie.
- Dwa tygodnie codziennego używania w domu, lista poprawek.
- Ikona i ekran startowy po dodaniu do ekranu głównego; usuwanie konta z poziomu aplikacji.
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
| Konflikty offline | Czas i autor przy każdej zmianie; „nowsza wygrywa” + „Do decyzji” |
| Ograniczenia Safari (pamięć, aparat do QR) | Testy na iPhonie od etapu 1; dołączanie także linkiem lub 6 cyframi |
