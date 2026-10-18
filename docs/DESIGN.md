# Ogarnij życie – projekt wyglądu

Styl „domowy elegancki”: butelkowa zieleń, mosiądz i krem, szeryfowy Fraunces z kursywą na akcentach, zaokrąglony Nunito w treści, panorama dachów w nagłówkach, logo „domek z ptaszkiem”. Projekt referencyjny: ekran 390 × 844 px (iPhone 14).

## Źródła ekranów

`docs/design/ekrany/*.dc.html` to ekrany z kanwy projektowej (format Design canvas z claude.ai). Czytaj je jako specyfikację:

- Część w `<x-dc>` to HTML ze stylami inline – dokładne kolory, rozmiary, odstępy, teksty.
- `{{nazwa}}` to wartości z `renderVals()` w skrypcie na dole pliku; `<sc-if value>` = warunek, `<sc-for list as>` = pętla.
- Skrypt (`class Component extends DCLogic`) pokazuje logikę prototypu i przykładowe dane (np. `SEED`, `CATS`, `BASE_TYPES`) – użyj ich jako danych mockupu w etapie 1.
- `data-props` w nagłówku skryptu = warianty ekranu (np. `pora: dzień/noc`, `widok`, `etap`).
- `<dc-import name="X" ...>` w plikach-wrapperach = ekran X z ustawionym wariantem.
- `./support.js` nie jest dołączony – plików nie da się otworzyć w przeglądarce 1:1; to materiał do odczytu.
- `canvas.json` – nazwy i kolejność ekranów.

| Ekran | Plik | Uwagi |
| --- | --- | --- |
| 1 Ładowanie | `Powitanie.dc.html` (+ `PowitanieDzien`, `PowitanieNoc`) | Słońce 6:00–18:00, księżyc w pozostałych godzinach |
| 1a Pierwsze uruchomienie | `Pierwsze.dc.html` | Załóż nowy dom / Dołącz do domu |
| 2 Start | `Kategorie.dc.html` (+ `StartDzien`, `StartNoc`) | Kafelki, Ten tydzień, Pilne, Najbliższe wydarzenia |
| 2b Skróty ze Startu | `ZadaniaPilne`, `ZadaniaOgarniete`, `KalendarzImieniny`, `KalendarzUrodziny` | Zadania/Kalendarz otwarte z filtrem lub dniem |
| 3 Zadania | `Zadania.dc.html` | Filtry, grupy, podzadania, arkusz „Nowe zadanie” |
| 4 Kalendarz | `Kalendarz.dc.html` | Tydzień/miesiąc, agenda, arkusz wydarzenia |
| 5 Ustawienia | `Ustawienia.dc.html` | Ty, Wspólny dom, Powiadomienia, Wygląd (motyw – ukryty na start) |
| 5a Synchronizacja / Domownicy | `Synchronizacja.dc.html` | Teksty o Wi‑Fi do zmiany na Firebase (etap 0) |
| 5b Zmiany od domownika | `Import.dc.html` | Nowe, zmienione, „Do decyzji” |
| 5c–d Zaproś domownika | `Zaproszenie.dc.html`, `ZaproszenieGotowe.dc.html` | Dodać opcję „jednorazowy link” |
| 5e–f Dołącz do domu | `Dolacz.dc.html`, `DolaczZnaleziono.dc.html` | Skan QR / 6 cyfr / link |

## Tokeny

### Kolory

| Token | Wartość | Użycie |
| --- | --- | --- |
| green-900 | `#1F3D2E` | Nagłówki, dolny pasek, główne przyciski, tekst główny |
| green-800 | `#2C5240` | Dalsza panorama dachów, tło skanera |
| green-700 | `#3A6650` | Bliższa panorama dachów |
| brass-300 | `#E8C98E` | Akcenty na ciemnym tle, przycisk „+”, okna w panoramie, kursywa w nagłówkach |
| brass-500 | `#B8925A` | Strzałki, linie, priorytet Ważne |
| brass-700 | `#7A5C2C` | Linki, etykiety sekcji, kursywa na jasnym tle |
| cream | `#F6F1E7` | Tło aplikacji, tekst na ciemnym |
| white | `#FFFFFF` | Karty |
| line | `#EFE8DA` | Separatory w kartach |
| border | `#D9D0BE` | Obramowania pól i chipów |
| border-soft | `#E3DCCD` | Obramowania kart drugorzędnych |
| sand | `#EDE6D8` | Tło przełącznika segmentowego, chipów aktywnych filtrów |
| muted | `#5E6D63` | Tekst pomocniczy, etykiety |
| muted-2 | `#4F5B53` | Dłuższy tekst pomocniczy |
| on-dark-muted | `#C7D8CD`, `#A9C2B2`, `#D6E4DA` | Tekst pomocniczy na zielonym |
| success | `#3F8A5E` / tło `#DDE8DF` | Online, „Znaleziono dom”, czekanie |

### Priorytety

| Priorytet | Linia / ramka | Tło etykiety | Tekst etykiety |
| --- | --- | --- | --- |
| Pilne (`high`) | `#A4492F` | `#F3DCD3` | `#8C3D27` |
| Ważne (`mid`) | `#B8925A` | `#EFE3CC` | `#6E5220` |
| Przy okazji (`low`) | `#9AA59D` | `#E6E8E3` | `#4F5B53` |

Plakietka „DZIŚ”: tło `#A4492F`, tekst biały, 11 px / 800, padding 3–4 × 9–10 px, promień 10.

### Kategorie domyślne

Zakupy `#5E8C6A` · Dom `#B8925A` · Zdrowie `#A4492F` · Urzędy `#6E5F8C` · Auto `#4D7A93` · Rodzina `#1F3D2E`. Kolory nowych kategorii: `#5E8C6A, #3F7A7A, #4D7A93, #6E5F8C, #B4457A, #A4492F, #B8925A, #7A6A5C`. „Bez kategorii”: `#9AA59D`.

### Rodzaje wydarzeń (wbudowane)

| Rodzaj | Kropka | Tło | Tekst |
| --- | --- | --- | --- |
| Termin zadania (systemowy) | `#F3B9A4` | `#F3DCD3` | `#8C3D27` |
| Urodziny | `#F2B8CF` | `#F5DDE6` | `#7D2953` |
| Impreza | `#CDB8F0` | `#E4E0EC` | `#553A7C` |
| Wydarzenie | `#A9CBE8` | `#DCE6EC` | `#2F5670` |
| Lekarz | `#9FD3B4` | `#DDE8DF` | `#2F5A43` |

### Typografia

- **Fraunces** (Google Fonts, 400–700, kursywa): tytuły ekranów 24 px/500, sekcje 21–22 px/500, liczby na kafelkach 30–36 px/500; drugie słowo tytułu kursywą w kolorze mosiądzu („Do *ogarnięcia*”, „Wspólny *dom*”).
- **Nunito** (500–800): treść 15–16 px, nazwy zadań 16 px/700, przyciski 15–17 px/800.
- Etykiety sekcji: 11 px, 800, WERSALIKI, letter-spacing 1.4–1.6 px, kolor brass-700 lub muted.
- Pola formularzy min. 16 px (brak zoomu na iPhonie).

### Kształty i cienie

- Nagłówek ekranu: wysokość **120 px na każdym ekranie**, promień 26, tło green-900, panorama dachów u dołu (dwie warstwy + dwa okienka brass-300).
- Karty: promień 20–22, cień `0 6px 20px rgba(31,61,46,0.07)`.
- Chipy: wysokość 36, promień 18; aktywny = tło green-900, tekst cream.
- Przycisk główny: wysokość 56, promień 28, green-900, ikona w brass-300.
- Pola: wysokość 44–48, promień 14, ramka border.
- Dolny pasek: pływający, `left/right 16px, bottom 20px`, promień 30, green-900, cień `0 12px 30px rgba(31,61,46,0.35)`; środkowy „+” 52 × 52 brass-300; aktywna zakładka brass-300 + kropka.
- Pod paskiem kremowe wyciszenie 116 px (`linear-gradient(180deg, transparent 0%, #F6F1E7 30%)`), lista ma dolny padding ~112–120 px.
- Pasek przewijania: cienki, `rgba(31,61,46,0.22)`, bez strzałek.
- Minimalny obszar dotyku 44 × 44.

## Zachowania (ustalone z Hanią)

- Panel filtrów zamyka kliknięcie w dowolne miejsce poza nim; przycisk „Filtry” ma stałą nazwę i licznik aktywnych filtrów; pod nim chipy aktywnych filtrów z „×”; „Wyczyść” tylko przy 2 filtrach.
- „Zwiń wszystko” ⇄ „Rozwiń wszystko”.
- Kafelki na Starcie otwierają Zadania/Kalendarz z gotowym filtrem lub dniem.
- Na Starcie najpierw „Pilne”, potem „Najbliższe wydarzenia” (min. 2).
- Strzałki tygodnia w kalendarzu pod nagłówkiem, nie w nim.
- Tryb dzień/noc nagłówka Startu i ekranu ładowania wg godziny (6:00–18:00 dzień).

## Model danych (propozycja do etapu 2)

```
users/{uid}                 name, houseId, notif{tasks,events,morning,house}, pushSubscriptions[]
houses/{houseId}            name, ownerUid, createdAt
houses/{houseId}/members/{uid}      name, role(owner|member), scope{all:boolean, categoryIds[], calendar:boolean}, joinedAt
houses/{houseId}/categories/{id}    name, color, order, updatedAt, updatedBy
houses/{houseId}/tasks/{id}         title, categoryId, priority(high|mid|low), due(date|null), done, doneAt,
                                    subtasks[{id,title,done}], updatedAt, updatedBy, deleted(bool)
houses/{houseId}/eventTypes/{id}    name, dot, bg, fg, icon, system
houses/{houseId}/events/{id}        title, date, allDay, from, to, typeId, remind, note, updatedAt, updatedBy, deleted
invites/{code}              houseId, createdBy, expiresAt, usedBy|null, scope
```

Usuwanie jako `deleted: true` (miękkie), żeby konflikty „usunął vs. zmieniła” dało się pokazać w „Do decyzji”.
