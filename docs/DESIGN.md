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
| 1 Ładowanie | brak – `Powitanie.dc.html` nie ma w eksporcie (`PowitanieDzien`/`PowitanieNoc` to tylko odwołania); zaprojektował Claude w etapie 1 na bazie banera z `Pierwsze.dc.html` i nagłówka Startu (`src/screens/LoadingScreen.tsx`) | Słońce 6:00–18:00, księżyc 18:00–6:00; zaakceptowane 2026-10-18 |
| 1a Pierwsze uruchomienie | `Pierwsze.dc.html` | Załóż nowy dom / Dołącz do domu |
| 1b Konto: Zaloguj się, Załóż konto, Nie pamiętam hasła | brak – zaprojektował Claude w etapie 1 (`src/screens/AccountScreens.tsx`) | Ładowanie → Zaloguj się → Start; Załóż konto → Pierwsze uruchomienie; hasło min. 8 znaków, ikona oka; zaakceptowane 2026-10-18 |
| 2 Start | `Kategorie.dc.html` (+ `StartDzien`, `StartNoc`) | Kafelki, Ten tydzień, Pilne, Najbliższe wydarzenia |
| 2b Skróty ze Startu | `ZadaniaPilne`, `ZadaniaOgarniete`, `KalendarzImieniny`, `KalendarzUrodziny` | Zadania/Kalendarz otwarte z filtrem lub dniem |
| 3 Zadania | `Zadania.dc.html` | Zakładki Do zrobienia / Ogarnięte, filtry, grupy, podzadania, gesty, arkusz zadania, arkusz „Nowe zadanie”, pasek „Cofnij”; wariant `demo` pokazuje stany |
| 3a Gesty | `ZadaniaPrawo`, `ZadaniaLewo` | Odsłonięte tło przy przeciąganiu w prawo (ogarnij) i w lewo (do kosza) |
| 3a Arkusz zadania | `ZadaniaArkusz` | Edycja w miejscu: nazwa, kategoria, priorytet, termin, kroki; Usuń / Ogarnij |
| 3a Wyczyść ogarnięte | `ZadaniaWyczysc` | Zakładka Ogarnięte + arkusz: starsze niż 7 dni / 30 dni / wszystkie |
| 3a Kosz | `Kosz.dc.html` (+ `KoszPotwierdzenie`) | Wspólny kosz zadań i wydarzeń (wejście z Ustawień): chipy Wszystko / Zadania / Wydarzenia, licznik dni, Przywróć, Opróżnij kosz z potwierdzeniem |
| 4a Kalendarz – usuwanie | `KalendarzLewo`, `KalendarzArkusz` | Przeciągnięcie wydarzenia w lewo = do kosza; klik w wydarzenie = arkusz wydarzenia. **Arkusz zostaje jak w aplikacji** (edycja w miejscu z polem DZIEŃ i „Gotowe”, nie „Edytuj wydarzenie / Zapisz zmiany” z projektu – decyzja Hani 2026-10-18) |
| 4 Kalendarz | `Kalendarz.dc.html` | Tydzień/miesiąc, agenda, arkusz nowego i edytowanego wydarzenia, przeciąganie w lewo, pasek „Cofnij”; wariant `demo` |
| 5 Ustawienia | `Ustawienia.dc.html` | Ty, Wspólny dom, Porządki (sprzątanie ogarniętych 7/30 dni/nigdy, Kosz), Powiadomienia, Wygląd (motyw – ukryty na start) |
| 5a Domownicy | `Synchronizacja.dc.html` – **tylko** część „Domownicy” (lista + „Zaproś domownika”) i karta „Na razie tylko Ty” (TEKSTY #4–6) | Bez karty synchronizacji, liczników, trybu pracy i ustawień sieci – Firebase synchronizuje sam (decyzja Hani 2026-10-18). Ustawienia → Wspólny dom → „Domownicy” |
| ~~5b Zmiany od domownika~~ | `Import.dc.html` | **Nie robimy** (decyzja Hani 2026-10-18): zmiany domownika pojawiają się same w kilka sekund; informuje o nich push (etap 8) |
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

- Nagłówek ekranu: wysokość **120 px na każdym ekranie**, promień 26, tło green-900, panorama dachów u dołu (dwie warstwy; **bez okienek** – usunięte na prośbę Hani 2026-10-18, pogarszały czytelność; zostają tylko na animowanym ekranie ładowania).
- Karty: promień 20–22, cień `0 6px 20px rgba(31,61,46,0.07)`.
- Chipy: wysokość 36, promień 18; aktywny = tło green-900, tekst cream.
- Przycisk główny: wysokość 56, promień 28, green-900, ikona w brass-300.
- Pola: wysokość 44–48, promień 14, ramka border.
- Dolny pasek: pływający, `left/right 16px, bottom 20px`, promień 30, green-900, cień `0 12px 30px rgba(31,61,46,0.35)`; środkowy „+” 52 × 52 brass-300; aktywna zakładka brass-300 + kropka.
- Pod paskiem kremowe wyciszenie 116 px (`linear-gradient(180deg, transparent 0%, #F6F1E7 30%)`), lista ma dolny padding ~112–120 px.
- Pasek przewijania: cienki, `rgba(31,61,46,0.22)`, bez strzałek.
- Minimalny obszar dotyku 44 × 44.

## Zachowania (ustalone z Hanią)

### Lista zadań – interakcje

| Gdzie / jak | Akcja |
| --- | --- |
| Kwadracik po lewej (pole 56 px × wysokość wiersza) | Ogarnięte – najpierw animacja: zielony kwadracik z ptaszkiem, treść blednie, po ~0,35 s zadanie przechodzi do Ogarniętych; w zakładce Ogarnięte – przywróć od razu |
| Klik w treść zadania | Arkusz zadania (edycja w miejscu, zmiany zapisują się od razu) |
| Przeciągnięcie w prawo (> ~90 px) | Ogarnij – tło `#1F3D2E`, ptaszek i napis w `#E8C98E`; w zakładce Ogarnięte: Przywróć – tło `#E8C98E` |
| Przeciągnięcie w lewo (> ~90 px) | Do kosza – tło `#A4492F`, kosz i „Usuń” na biało; najpierw pytanie „Usunąć zadanie?” (Anuluj / Usuń) |
| Strzałka „˅” (tylko gdy są kroki) | Rozwija podzadania |
| Po każdej akcji | Pasek na dole nad menu: „Ogarnięte: … / Przeniesiono do kosza: … · COFNIJ”, znika po ~4,5 s |

- Gest: `touch-action: pan-y`, rozpoznanie poziomego ruchu po 8 px, przewijanie pionowe ma pierwszeństwo; po przeciągnięciu klik nie otwiera arkusza.
- Pod listą jednozdaniowa podpowiedź o gestach.
- Na iPhonie gest zaczyna się na wierszu (margines 16 px od krawędzi), żeby nie wywołać „wstecz” w Safari.
- Usunięcie zadania lub wydarzenia (gest w lewo, „Usuń” w arkuszu) zawsze poprzedza okienko „Usunąć zadanie?” / „Usunąć wydarzenie?” z tekstem „„…” trafi do kosza. Możesz je przywrócić przez 30 dni.” (Anuluj / Usuń); po usunięciu pasek COFNIJ (ustalone 2026-10-18).
- Kalendarz: wydarzenie jak zadanie – dotknięcie = arkusz z edycją w miejscu, w lewo = do kosza; termin zadania w kalendarzu = wiersz zadania (dotknięcie = arkusz zadania, w prawo ogarnij, w lewo do kosza). Tak samo wiersze w „Później”; po zamknięciu arkusza kalendarz przechodzi do dnia wpisu (ustalone 2026-10-18). Te zasady mają pierwszeństwo przed aktualizacją projektu 2, w której terminów zadań nie dało się ruszać z kalendarza, a pytania przed usunięciem nie było (decyzja Hani 2026-10-18).
- Odhaczenie wszystkich podzadań ogarnia zadanie; odznaczenie kroku w ogarniętym zadaniu przywraca je (ustalone 2026-10-18).
- Plakietka w nagłówkach (Start, Zadania, Ustawienia): tylko „OFFLINE”, gdy telefon nie ma internetu – nie jest linkiem; online nic nie pokazuje (ustalone 2026-10-18, zamiast „ONLINE” prowadzącego do Synchronizacji).

### Zakładki i kosz

- Zakładki pod nagłówkiem: „Do zrobienia N · Ogarnięte N” (przełącznik segmentowy jak w Kalendarzu).
- Ogarnięte pogrupowane: Dziś, Wczoraj, W tym tygodniu, Wcześniej; przy zadaniu kto ogarnął („OGARNĘŁA HANIA / OGARNĄŁ KRZYŚ”) i kiedy (godzina, „wczoraj”, data).
- W zakładce Ogarnięte: „Najnowsze na górze” i przycisk „Wyczyść” (arkusz: starsze niż 7 dni / 30 dni / wszystkie, z licznikiem). Bez linku do kosza.
- **Kosz jest jeden, wspólny dla zadań i wydarzeń.** Stałe wejście: Ustawienia → Porządki → Kosz („5 ELEMENTÓW · ZADANIA I WYDARZENIA”). Na ekranach Zadania i Kalendarz nie ma ikony ani linku do kosza – pomyłki naprawia pasek „Cofnij”.
- Ekran Kosza: powrót „‹ USTAWIENIA”; chipy Wszystko · Zadania · Wydarzenia z licznikami; przy elemencie ikonka rodzaju (kwadracik w kolorze kategorii albo kalendarz w kolorze rodzaju wydarzenia); zadanie: kategoria · kto usunął · kiedy; wydarzenie: rodzaj · data i godzina · kto usunął.
- Usunięte czekają 30 dni („zniknie za N dni”, czerwone gdy ≤ 5); „Przywróć” odkłada element na miejsce (lista zadań / kalendarz); „Opróżnij kosz” z potwierdzeniem „Usunąć na zawsze?”.
- Ustawienia → Porządki: „Sprzątanie ogarniętych: po 7 dniach / po 30 dniach / nigdy” (domyślnie 30) i wejście do Kosza.

### Kalendarz – edycja i usuwanie

- Klik w wydarzenie (agenda dnia i „Później”) = arkusz wydarzenia z edycją w miejscu (nazwa, rodzaj, dzień, cały dzień / od–do, przypomnienie), na dole „Usuń” (obrys terakota) i „Gotowe”.
- Przeciągnięcie wydarzenia w lewo (> ~90 px) = do kosza (tło `#A4492F`, „Usuń”), po pytaniu „Usunąć wydarzenie?”. W prawo nic nie robi (przy terminie zadania – ogarnij).
- Po usunięciu pasek „Przeniesiono do kosza: … · COFNIJ”.

### Pozostałe

- Arkusze (bottom sheet): nad arkuszem zawsze widać pas przyciemnienia (min. 88 px + pasek stanu) – dotknięcie go zamyka arkusz; dłuższa treść przewija się w arkuszu (ustalone 2026-10-18).
- Panel filtrów zamyka dotknięcie w dowolne miejsce poza nim, także nagłówka i zakładek; przycisk „Filtry” ma stałą nazwę i licznik aktywnych filtrów; pod nim chipy aktywnych filtrów z „×”; „Wyczyść” tylko przy 2 filtrach.
- „Zwiń wszystko” ⇄ „Rozwiń wszystko”.
- Kafelki na Starcie otwierają Zadania/Kalendarz z gotowym filtrem lub dniem.
- Na Starcie najpierw „Pilne”, potem „Najbliższe wydarzenia” (min. 2).
- Strzałki tygodnia w kalendarzu pod nagłówkiem, nie w nim.
- Tryb dzień/noc nagłówka Startu i ekranu ładowania wg godziny (6:00–18:00 dzień).
- Termin zadania (jedna zasada, 2026-10-18): dziś → **DZIŚ** (czerwona plakietka), jutro → **JUTRO**, w ciągu 7 dni → dzień i data (**WT 13 PAŹ**), dalej → **DO 30 PAŹ**.
- „Najbliższe wydarzenia” na Starcie (2026-10-18): dwa najbliższe wydarzenia dowolnego rodzaju (bez terminów zadań).

## Model danych (propozycja do etapu 2)

```
users/{uid}                 name, houseId, notif{tasks,events,morning,house}, cleanupDays(7|30|null), pushSubscriptions[]
houses/{houseId}            name, ownerUid, createdAt
houses/{houseId}/members/{uid}      name, role(owner|member), scope{all:boolean, categoryIds[], calendar:boolean}, joinedAt
houses/{houseId}/categories/{id}    name, color, order, updatedAt, updatedBy
houses/{houseId}/tasks/{id}         title, categoryId, priority(high|mid|low), due(date|null), done, doneAt,
                                    subtasks[{id,title,done}], createdBy, doneAt, doneBy,
                                    deleted(bool), deletedAt, deletedBy, updatedAt, updatedBy
houses/{houseId}/eventTypes/{id}    name, dot, bg, fg, icon, system
houses/{houseId}/events/{id}        title, date, allDay, from, to, typeId, remind, note, createdBy,
                                    deleted(bool), deletedAt, deletedBy, updatedAt, updatedBy
invites/{code}              houseId, createdBy, expiresAt, usedBy|null, scope
```

Usuwanie jako `deleted: true` + `deletedAt` (miękkie) = Kosz. Po 30 dniach od `deletedAt` dokument usuwamy naprawdę. Konflikt „usunął vs. zmieniła”: usunięte jest w Koszu i można je przywrócić (bez osobnego „Do decyzji”).
