# Teksty o danych – zmiana na Firebase (etap 0, krok 6)

Projekt ekranów zakładał aplikację „bez konta i bez chmury”, z wymianą danych przez Wi‑Fi. Teraz dane są w Firebase (konto e‑mail, Firestore z pamięcią offline), więc te teksty trzeba zmienić.

**Status: zaakceptowane przez Hanię 2026-10-18 (części A i B).** W etapie 1 używamy tych tekstów i zmian zamiast tych z `docs/design/ekrany/`.

## A. Zmiany tekstów (wygląd bez zmian)

| # | Ekran | Było | Proponuję |
| --- | --- | --- | --- |
| 1 | 1a Pierwsze uruchomienie | Bez konta i bez chmury – dane zostają w domu. | Dane Waszego domu widzą tylko domownicy. |
| 2 | 1a Pierwsze uruchomienie (Dołącz do domu) | Ktoś Cię zaprosił – zeskanujesz jego kod. | Ktoś Cię zaprosił – zeskanujesz kod albo otworzysz link. |
| 3 | 5 Ustawienia (Wspólny dom) | Dane trzymane w domu – bez chmury | Dane w Firebase – widzą je tylko domownicy |
| 4 | 5a Synchronizacja – nagłówek karty, gdy nie ma domowników | TRYB LOKALNY | TYLKO TY |
| 5 | 5a Synchronizacja – tytuł karty | Wszystko *zostaje w domu* | Na razie *tylko Ty* |
| 6 | 5a Synchronizacja – opis karty | Zadania i kalendarz są tylko na tym telefonie. Włącz synchronizację, żeby mieć ten sam stan co bliscy. | Zadania i kalendarz są zapisane na Twoim koncie. Zaproś domownika, żeby mieć wspólny dom z bliskimi. |
| 7 | 5a Synchronizacja – stan sieci (online) | WI‑FI · DOM_5G / DANE KOMÓRKOWE | ONLINE · ZSYNCHRONIZOWANO |
| 8 | 5a Synchronizacja – stan sieci (offline) | BRAK WI‑FI · OFFLINE | BRAK INTERNETU · OFFLINE |
| 9 | 5a Synchronizacja – offline, opis | {n} zmiany czekają na telefonie i wyślą się same po połączeniu z Wi‑Fi. | {n} zmiany czekają na telefonie i wyślą się same, gdy wróci internet. |
| 10 | 5c Zaproś domownika – plakietka | WI‑FI · BEZ CHMURY | JEDNORAZOWY KOD |
| 11 | 5c Zaproś domownika – pod kodem | Oba muszą być w tej samej sieci Wi‑Fi. | Kod działa raz i wygasa po 10 minutach. |
| 12 | 5c Zaproś domownika – przycisk | Wyślij kod wiadomością | Wyślij link wiadomością |
| 13 | 5c Zaproś domownika – krok 1 | Domownik instaluje Ogarnij życie na swoim telefonie. | Domownik otwiera Ogarnij życie w przeglądarce telefonu i zakłada konto. |
| 14 | 5c Zaproś domownika – krok 3 | Skanuje kod albo wpisuje 6 cyfr – i gotowe. | Skanuje kod, wpisuje 6 cyfr albo otwiera link – i gotowe. |
| 15 | 5d Zaproszenie gotowe | Jej telefon jest teraz w Waszym domu. Zmiany będą się wymieniać przez Wi‑Fi – bez chmury. | Jej telefon jest teraz w Waszym domu. Zmiany pojawią się u Was w kilka sekund – także te zrobione bez internetu. |
| 16 | 5e Dołącz do domu | Kod widać u osoby, która Cię zaprasza: Ustawienia › Domownicy › Zaproś. Oba telefony muszą być w tej samej sieci Wi‑Fi. | Kod widać u osoby, która Cię zaprasza: Ustawienia › Domownicy › Zaproś. Jest ważny 10 minut. |

## B. Elementy, które przy Firebase tracą sens (do decyzji)

| # | Ekran | Element | Dlaczego | Proponuję |
| --- | --- | --- | --- | --- |
| B1 | 5a Synchronizacja | Sekcja „TRYB PRACY”: *Tylko lokalnie* / *Lokalnie + synchronizacja* | Dane zawsze są na koncie w Firebase; praca bez internetu działa i tak (pamięć offline). Trybu „tylko na telefonie” nie ma. | Usunąć sekcję |
| B2 | 5a Synchronizacja | Przełącznik „Tylko przez Wi‑Fi – nie zużywa danych komórkowych” | Przeglądarka nie pozwala rozróżnić Wi‑Fi i danych komórkowych; Firebase przesyła tylko zmiany (bardzo mało danych). | Usunąć |
| B3 | 5a Synchronizacja | Przełącznik „Synchronizuj automatycznie – zaraz po połączeniu z siecią” | Firebase synchronizuje zawsze, na bieżąco; wyłączenie nie jest możliwe. | Usunąć (razem z B2 cała sekcja „USTAWIENIA”) |
| B4 | 5a Synchronizacja | Przycisk „Synchronizuj teraz” / „Synchronizuję…” | Zmiany wysyłają się same w ciągu sekund; ręczne wywołanie nic nie robi. | Usunąć |
| B5 | 5a Synchronizacja | Liczniki „DO WYSŁANIA” i „OD KRZYSIA”, przycisk „Przejrzyj zmiany od Krzysia” | „Do wysłania” da się policzyć (zmiany czekające offline); „Od Krzysia” i przegląd zmian to funkcja etapu 8. | Zostawić |
| B6 | 5e Dołącz do domu | Brak drogi „przez link” (jest tylko skan kodu i „ALBO WPISZ 6 CYFR”) | DESIGN.md: „Skan QR / 6 cyfr / link”. Link z wiadomości otwiera od razu ekran „Znaleziono dom”, więc na ekranie skanowania wystarczy krótka informacja. | Pod polem 6 cyfr dopisać: „Masz link? Otwórz go na tym telefonie – dołączysz od razu.” |
