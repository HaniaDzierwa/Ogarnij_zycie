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

> **Wstawka (decyzja Hani 2026-10-20):** przed krokiem 4 – Ustawienia → Zadania → Kategorie i Priorytety (własne priorytety obok trzech wbudowanych; bez usuwania kategorii / priorytetu z przypiętymi zadaniami); panel „Filtry” na ekranie Zadania tylko filtruje.

1. **Zaproszenie:** jednorazowy link i 6 cyfr (ważne 10 min) – zapisane w Firestore (`invites/{kod}`); „Dołącz do domu” realizuje je, reguły Firestore sprawdzają ważność i jednorazowość. **Bez kodu QR i bez skanowania** (decyzja Hani 2026-10-20) – na „Zaproś domownika” znika obrazek QR, na „Dołącz do domu” skaner z ramką aparatu.
2. **Dołączanie:** po kodzie albo linku „Znaleziono dom” z nazwą domu i domownikami, imię nowego domownika, „Dołącz jako …” → dom widoczny od razu.
3. **Wspólne i prywatne** (decyzja Hani 2026-10-25 – zamiast zakresu „Wszystko / Wybrane” ustawianego domownikowi): każde zadanie i każde wydarzenie jest **„Wspólne”** (widzą wszyscy domownicy) albo **„Tylko ja”** (widzi tylko autor). Nowe – domyślnie „Wspólne”. Zmienić może tylko autor (arkusz zadania / wydarzenia). Reguły to wymuszają: prywatnych nie da się odczytać z innego konta. Z „Zaproś domownika” znika „Co zobaczy domownik”, z „Znaleziono dom” – opis zakresu.
   - Ekran Domownicy: dotknięcie domownika → arkusz (imię, rola, od kiedy w domu); „Usuń z domu” – tylko założyciel; każdy domownik (oprócz założyciela, póki są inni) może sam „Opuścić dom”; zapraszać może każdy (decyzje Hani 2026-10-18 i 2026-10-25). Prywatne zadania i wydarzenia osoby, która wychodzi, nie są widoczne dla pozostałych.
4. **Konflikty:** nowsza zmiana wygrywa; usunięte zawsze można przywrócić z Kosza.
5. Reguły + testy reguł w emulatorze (Hania uruchamia na komputerze z Javą 21), wgranie reguł, publikacja wersji testowej.

**Odbiór:** (zaakceptowany przez Hanię 2026-10-25)
- [x] Zadanie dodane na jednym telefonie pojawia się na drugim w kilka sekund
- [x] Zmiany offline na obu telefonach łączą się bez utraty danych
- [x] Osoba spoza domu nie widzi danych, nawet znając identyfikator
- [x] Zadanie / wydarzenie „Tylko ja” nie pojawia się na telefonie drugiego domownika; po zmianie na „Wspólne” – pojawia się
- [x] Usunięty z domu albo po „Opuść dom” – nie widzi już danych domu, wraca do „Pierwsze uruchomienie”
- [x] Zużyty albo przeterminowany kod nie działa

## Etap 5 – Kategorie, Kalendarz, Start i wspólne testowanie (dawniej 4, 5, 6)

Funkcje są w aplikacji od etapów 1–2; w tym etapie poprawki z testów we dwoje i odbiory.

- **Kategorie i filtry:** własne kategorie z kolorem i własne priorytety (Ustawienia → Zadania); usuwanie tylko kategorii / priorytetu bez przypiętych zadań; panel filtrów (Pokaż + kategoria, bez edycji), chipy aktywnych filtrów z „×”, licznik na „Filtry”, zamykanie kliknięciem obok; grupowanie po kategorii / priorytecie, zwijanie, „Zwiń/Rozwiń wszystko”.
- **Kalendarz:** rodzaje (wbudowane + własne), cały dzień / od–do, przypomnienie (zapisane, wysyłka w etapie 6); tydzień, miesiąc, agenda, „Później”, „Dziś”; terminy zadań w kalendarzu; edycja, usuwanie (z pytaniem) → Kosz, „Cofnij”.
- **Start:** kafelki z danych („Ogarnięte dziś X / Y”: Y = ogarnięte dziś + niezrobione z terminem na dziś lub po terminie), skróty do Zadań / Kalendarza, powitanie dzień/noc; zadania i wydarzenia na Starcie działają jak w Zadaniach i Kalendarzu.
- **Tydzień używania we dwoje** (Hania + domownik), lista uwag, poprawki.

**Odbiór (w tym przeniesiony z etapu 3):** (zaakceptowany przez Hanię 2026-10-25)
- [x] Zadania: przez tydzień prawdziwe zadania i nic nie znika; gesty działają i nie przeszkadzają w przewijaniu; „Cofnij” przywraca dokładnie poprzedni stan; zadanie z kosza wraca na swoje miejsce
- [x] Każda kombinacja filtrów daje poprawną listę, liczniki się zgadzają
- [x] Wydarzenia zapisują się poprawnie i są widoczne u wszystkich domowników; usunięte wydarzenie jest w Koszu i po „Przywróć” wraca na swój dzień
- [x] Liczby na Starcie zawsze zgadzają się z listą zadań

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

**Odbiór:** (zaakceptowany przez Hanię 2026-10-25 – „zamknij wszystkie etapy, działa tak jak ma być”)
- [x] Przypomnienie przychodzi przy zamkniętej stronie z opóźnieniem najwyżej 1 min
- [x] Wyłączone powiadomienie nie przychodzi
- [x] Domownik dostaje push, gdy ktoś inny doda lub ogarnie zadanie
- [x] Działa na Androidzie (Chrome) i na iPhonie (strona dodana do ekranu głównego)

## Etap 7 – Testy i publikacja (dawniej 9)

- Testy automatyczne (filtry, liczniki, reguły) i ręczne w Chrome na Androidzie i Safari na iPhonie.
- Dwa tygodnie codziennego używania w domu, lista poprawek.
- Ikona i ekran startowy po dodaniu do ekranu głównego; usuwanie konta z poziomu aplikacji. Gdy usuwa je założyciel domu, a są inni domownicy – aplikacja pyta: usunąć dom (u wszystkich) czy przekazać go wybranemu domownikowi (decyzja Hani 2026-10-18).
- Publikacja na Firebase Hosting pod docelowym adresem (własna domena opcjonalnie).

> **Usuwanie konta** – najpierw odłożone „na później”, zrobione tego samego dnia na prośbę Hani (2026-10-25): Ustawienia → „Usuń konto”.

**Odbiór:** (zaakceptowany przez Hanię 2026-10-25)
- [x] Brak znanych błędów, które tracą dane
- [x] Aplikacja działa w przeglądarkach telefonów wszystkich domowników

---

## Etap 8 – Powtarzanie i zwarte arkusze (decyzja Hani 2026-11-15)

Projekt: kanwa „Zadania cykliczne” w Claude Design (ekrany 1c/1e – zadanie, 4b – wydarzenie, 5 – usuwanie powtórki). Hania zatwierdziła układ 1c i zmianę wyglądu arkuszy.

- **Zwarte arkusze** „Nowe zadanie” / „Nowe wydarzenie” i tryb edycji: na wierzchu tylko nazwa; w jednej karcie wiersze z wartością, które rozwijają się po dotknięciu (jeden naraz) – zadanie: Kategoria · Priorytet · Termin · Powtarzaj · Kto widzi; wydarzenie: Rodzaj · Dzień · Godzina · Powtarzaj · Przypomnij · Kto widzi. Kroki i Notatka pod „+”. Kategorie, priorytety i rodzaje jako zawijane chipy (dowolnie wiele własnych).
- **Powtarzaj**: Nie powtarzaj · Codziennie · Co tydzień · Co miesiąc · Co rok · Co X dni (2–365); pod spodem „Kolejne: …”.
- **Zadanie cykliczne**: ogarnięcie tworzy następne z kolejnym terminem (liczonym **od terminu**, także „co X dni”; spóźnione – pierwszy termin po dziś); ogarnięte trafia do Ogarniętych; COFNIJ cofa oba. Kroki wracają odznaczone, notatka zostaje. Włączenie przy „Bez terminu” ustawia Dziś. Usunięcie pyta: „Tylko to” (następne się pojawi) / „Całe powtarzanie”.
- **Wydarzenie cykliczne**: wszystkie powtórki widać w kalendarzu, na Starcie i w powiadomieniach; bez końca (na razie). Edycja zmienia wszystkie powtórki. Usunięcie pyta: „Tylko to – dzień” / „Wszystkie powtórki”. Urodziny same ustawiają „Co rok” i cały dzień.
- Ikona ↻ z napisem (np. CO TYDZIEŃ) przy zadaniu na liście i przy wydarzeniu w kalendarzu; w arkuszu do odczytu wiersz „Powtarza się”.
- Baza: opcjonalne pole `repeat` (zadania i wydarzenia) i `skip` (pominięte dni wydarzenia) – stare dokumenty bez zmian; reguły i testy reguł (emulator u Hani).

**Odbiór:**
- [ ] Zadanie co tydzień: ogarnięcie pokazuje następne z terminem za tydzień; COFNIJ cofa oba
- [ ] Wydarzenie co rok / co tydzień widać w kalendarzu w kolejnych miesiącach i latach; „Tylko to” usuwa jedną powtórkę
- [ ] Arkusze nowego zadania i wydarzenia mieszczą się na ekranie telefonu; edycja w tym samym stylu
- [ ] Stare zadania i wydarzenia działają jak wcześniej; testy reguł przechodzą u Hani

---

## Etap 9 – Zdjęcia w zadaniach (plan z 2026-11-16, do dopracowania z Hanią)

**Status:** projekt w Claude Design (kanwa „Zdjęcia w zadaniach”: 1 Nowe zadanie – zdjęcia, 2 Arkusz do odczytu, 3 Lista, 4 Podgląd). Start po odbiorze etapu 8 („akceptuję”) i dopracowaniu projektu.

**Dlaczego tak (decyzja techniczna):** zostajemy na darmowym planie Spark – **bez Firebase Storage** (wymaga planu Blaze z kartą, a Hania nie ma teraz dostępu do konsoli) i bez Cloudflare R2 (Worker musiałby dostać publiczny adres i własną kontrolę dostępu). Zdjęcia trafiają do Firestore jako zmniejszone pliki.

- **Zmniejszanie na telefonie:** po wybraniu zdjęcia (aparat albo galeria – zwykły wybór telefonu, `<input type="file" accept="image/*">`) aplikacja robi trzy wersje:
  - **pełna** – 1080 px po dłuższym boku (decyzja 2026-11-17, wcześniej 1600 px), WebP (na iPhonie, gdy Safari nie zapisze WebP – JPEG), ok. 100–170 KB; wczytywana dopiero w podglądzie,
  - **kafelek** – ok. 300 px, kilkanaście KB; w arkuszu zadania,
  - **miniatura na listę** – ok. 120 px, 3–5 KB, tylko pierwszego zdjęcia, zapisana razem z zadaniem (lista bez dodatkowych odczytów, także offline).
- **Baza (do ustalenia przy wdrożeniu):** zdjęcia jako osobne dokumenty, np. `houses/{dom}/photos/{id}` (kafelek) i osobno pełna wersja, np. `houses/{dom}/photoFull/{id}` – żeby otwarcie arkusza nie ściągało pełnych zdjęć; jeden dokument < 1 MB; z odnośnikiem do zadania; zdjęcia wczytywane tylko dla otwartego zadania (nigdy cała kolekcja w tle); pola ze zdjęciami bez indeksów (wpis w `firestore.indexes.json`, `fieldOverrides`); „Tylko ja” – w części prywatnej, jak zadania. Przy zadaniu: liczba zdjęć i miniatura pierwszego (pola opcjonalne – stare zadania bez zmian). Reguły: tylko domownicy, limit rozmiaru, limit zdjęć na zadanie; testy reguł w emulatorze u Hani.
- **Wygląd (projekt):** w arkuszu „+ Zdjęcie” obok „+ Kroki” / „+ Notatka”; po pierwszym zdjęciu sekcja ZDJĘCIA pod notatką – kafelki 3 w rzędzie, licznik „N z 5”, kafelek „Dodaj”, × na kafelku (z COFNIJ), „Zmniejszam…” na świeżo dodanym. Arkusz do odczytu – rząd miniatur, dotknięcie otwiera podgląd. Lista – ikona aparatu z liczbą i miniatura pierwszego zdjęcia (44 px). Podgląd na cały ekran – ciemne tło, „1 / 3”, przesuwanie, powiększanie palcami, „Usuń zdjęcie” z potwierdzeniem.
- **Zasady:** zadanie do Kosza – zdjęcia razem z nim, po 30 dniach znikają na zawsze (sprzątanie także w Workerze); bez internetu – zdjęcie widać od razu, wyśle się po powrocie sieci.
- **Zadania cykliczne – „Przy każdym powtórzeniu” albo „Tylko tym razem” (prośba Hani z 2026-11-17):** przy dodawaniu zdjęcia do zadania cyklicznego wybór, gdzie ma być. Jedno zadanie może mieć jednocześnie oba rodzaje, każdego jedno lub więcej.
  - **Tylko tym razem** – zdjęcie tego wystąpienia; zostaje przy nim po ogarnięciu, następne startuje bez niego (jak w pierwszej wersji planu).
  - **Przy każdym powtórzeniu** – zdjęcie całej serii; widać je w każdym wystąpieniu (dotychczasowych i następnych). Dodane albo usunięte w jednym wystąpieniu – zmienia się we wszystkich (usuwanie z potwierdzeniem „Usunąć ze wszystkich powtórzeń?” i COFNIJ).
  - Zadanie bez powtarzania – bez wyboru, zdjęcia jak „Tylko tym razem”.
  - **Wygląd:** w sekcji ZDJĘCIA dwie grupy: „PRZY KAŻDYM POWTÓRZENIU” (kafelki z małą ikoną powtarzania) i „TYLKO TYM RAZEM”. Po „+ Zdjęcie” w zadaniu cyklicznym – mały wybór, domyślnie „Tylko tym razem”. W podglądzie: „Przenieś do: przy każdym / tylko tym razem”. Na liście – miniatura pierwszego zdjęcia tego wystąpienia, a gdy go nie ma – serii; liczba = oba rodzaje razem.
  - **Baza:** przy zadaniu nowe, opcjonalne pole `seriesId` (id serii) – przechodzi na następne wystąpienie samo, bo `nextOccurrence` kopiuje zadanie. Stare zadania cykliczne bez tego pola: przy pierwszym zdjęciu „przy każdym” dostają `seriesId` = własne id. Zdjęcie ma rodzaj: wystąpienia (odnośnik do zadania) albo serii (odnośnik do `seriesId`).
  - **Limit:** reguły Firestore nie liczą dokumentów, więc stałe miejsca na zdjęcia – id `{zadanie}_0`…`{zadanie}_4` dla „tylko tym razem” i `{seria}_s0`…`{seria}_s4` dla „przy każdym”; szóste nie ma gdzie trafić.
  - **Kosz:** „Usuń → Tylko to” – wystąpienie do Kosza ze swoimi zdjęciami, zdjęcia serii zostają dla następnego. Usunięcie całej serii – zdjęcia serii też do Kosza. Na zawsze znikają, gdy w serii nie zostało już żadne zadanie (sprzątanie w Workerze).
  - **„Tylko ja”:** przeniesienie zadania cyklicznego – zdjęcia serii idą razem z nim (do decyzji Hani, pytanie 6).
- **Testy reguł (propozycja, w stylu obecnych w `tests/rules/firestore.rules.test.ts`):**
  - dostęp: domownik dodaje i czyta zdjęcia; obcy nie czyta (nawet znając id), nie dodaje, nie zmienia, nie usuwa; niezalogowany – nic; „dodane przez” = zalogowany i nie zmienia się,
  - „Tylko ja”: autor zapisuje i czyta, inny domownik i obcy – nic; przeniesienie do „Tylko ja” razem ze zdjęciami jedną paczką,
  - poprawność: pełna wersja i kafelek to dane binarne z limitem rozmiaru (np. pełna ≤ ok. 700 KB, kafelek ≤ ok. 50 KB); zdjęcie wskazuje zadanie (albo serię) z tego samego domu; nowe pola przy zadaniu (liczba, miniatura, `seriesId`) opcjonalne, stare zadania przechodzą; nieznane pola odrzucone,
  - limit: id spoza miejsc `_0`…`_4` / `_s0`…`_s4` odrzucone,
  - miejsce: oba liczniki (domu i wspólny) muszą wzrosnąć dokładnie o rozmiar dodanego zdjęcia (i zmaleć przy usunięciu); zdjęcie bez zmiany liczników, zaniżony licznik, dom ponad 150 MB albo aplikacja ponad 600 MB – odrzucone; obcy nie zmienia licznika domu; licznika wspólnego nie da się zmienić bez zdjęcia,
  - zdjęcia serii: rodzaj „seria” tylko z `seriesId`, „wystąpienie” tylko z id zadania; domownik czyta zdjęcia serii z każdego wystąpienia,
  - usuwanie: domownik tak, obcy nie; „Opróżnij kosz” i usunięcie domu kasują też zdjęcia; po „Opuść dom” / „Usuń z domu” – brak dostępu.
- **Miejsce – twarde limity (decyzja Hani 2026-11-17):** plan Spark bez karty nie nalicza opłat, ale po przekroczeniu limitu blokuje zapisy – więc pilnujemy sami. Darmowe 1 GB jest jedno na całą aplikację (wszystkie domy razem), dlatego dwa liczniki zajętego miejsca:
  - **wspólny na całą aplikację – 600 MB** (dokument np. `meta/photoUsage`; reszta ok. 400 MB na zadania i zapas),
  - **na dom – 150 MB** (decyzja Hani 2026-11-17, wcześniej 50 MB; pole w dokumencie domu; ok. 1000 zdjęć), żeby jeden dom nie zajął miejsca innym.
  Dodanie / usunięcie zdjęcia zmienia oba liczniki w tej samej paczce; reguły sprawdzają, że zmiana = rozmiar zdjęcia i że żaden limit nie jest przekroczony. Po przekroczeniu: „Miejsce na zdjęcia w Waszym domu się skończyło – usuń stare” (albo – przy wspólnym – „Miejsce na zdjęcia w aplikacji się skończyło”); zadania zapisują się dalej. W Ustawieniach: „Zdjęcia: N MB z 150 MB” (Hania nie ma teraz wglądu w konsolę). Liczby to stałe w regułach – łatwo je zmienić później (na razie 2 domy po 2 osoby; wspólne 600 MB wystarczy na 4 pełne domy). Szacunek: ok. 10 zdjęć tygodniowo na dom ≈ 70 MB rocznie. Gdyby domów było kilkadziesiąt – wrócić do tematu Firebase Storage (plan Blaze). Inne darmowe limity (50 tys. odczytów i 20 tys. zapisów dziennie, ok. 10 GB pobierania miesięcznie) – ze sporym zapasem.
- **Szacunek:** ok. jeden wieczór pracy Claude'a + testy Hani na iPhonie i Androidzie (możliwa jedna runda poprawek pod Safari).

**Do decyzji Hani (przed startem):**
1. Limit zdjęć na zadanie – 5 wystarczy?
2. Zdjęcia także przy wydarzeniach?
3. Pobieranie zdjęcia na telefon z podglądu – potrzebne?
4. Czy wstawić do projektu 2–3 prawdziwe zdjęcia, żeby ocenić miniatury i podgląd?
5. Zadanie cykliczne: limit osobno (5 „tylko tym razem” + 5 „przy każdym”), czy razem 5?
6. Przeniesienie zadania cyklicznego do „Tylko ja” – zdjęcia serii idą z nim (wcześniejsze, ogarnięte wystąpienia we wspólnych je stracą)?

**Odbiór (wstępnie):**
- [ ] Zdjęcie z aparatu i z galerii dodaje się na iPhonie i Androidzie, widać je od razu (także bez internetu)
- [ ] Lista zadań dalej szybka; miniatura i liczba zdjęć przy zadaniu
- [ ] Podgląd: przesuwanie, powiększanie, usuwanie z COFNIJ
- [ ] Zadanie w Koszu i przywrócone – zdjęcia razem z nim; „Tylko ja” – zdjęć nie widzą domownicy
- [ ] Zadanie cykliczne: zdjęcie „przy każdym” widać w następnym wystąpieniu, „tylko tym razem” – nie; oba rodzaje naraz w jednym zadaniu
- [ ] Ustawienia pokazują zajęte miejsce na zdjęcia; po limicie komunikat, a zadania dalej się zapisują
- [ ] Testy reguł przechodzą u Hani

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
