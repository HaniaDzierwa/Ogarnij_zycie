# Firebase – instrukcje dla Hani

Wszystko w konsoli Firebase robisz Ty; Claude pisze kod i dopisuje tu kolejne kroki, gdy będą potrzebne. Nazwy przycisków mogą się nieco różnić od opisu – jeśli coś wygląda inaczej, zrób zrzut ekranu i pokaż Claude.

**Zasada:** zostajemy na darmowym planie **Spark**. Jeśli konsola zaproponuje „Upgrade” / plan Blaze albo poprosi o kartę – nie klikaj, zapytaj Claude.

---

## Etap 0 – projekt, aplikacja web, Hosting

### 1. Narzędzia na komputerze
1. Zainstaluj Node.js w wersji LTS: https://nodejs.org (instalator, wszystko domyślnie).
2. Firebase CLI jest zainstalowane **lokalnie w projekcie** (w `package.json`), nie globalnie. Po pobraniu repozytorium wystarczy w jego katalogu `npm install`.
3. Każdą komendę Firebase poprzedzasz `npx` (działa tylko w katalogu repozytorium).
4. `npx firebase login` – otworzy się przeglądarka, zaloguj się tym samym kontem Google, którego użyjesz w konsoli. Pytania o Gemini i o zbieranie danych o użyciu: odpowiedz **No**.

### 2. Projekt Firebase
1. Wejdź na https://console.firebase.google.com i kliknij **Utwórz projekt** (Create a project).
2. Nazwa: `ogarnij-zycie` (identyfikator projektu może dostać dopisek – zanotuj go).
3. Google Analytics: możesz **wyłączyć** (nie jest potrzebne).
4. Po utworzeniu sprawdź na dole menu po lewej: plan **Spark**.

### 3. Aplikacja web
1. Na stronie głównej projektu kliknij ikonę **`</>`** (Web / Dodaj aplikację).
2. Nazwa: `Ogarnij życie web`. Zaznacz **Skonfiguruj też Firebase Hosting**.
3. Konsola pokaże blok `const firebaseConfig = { apiKey: ..., authDomain: ..., projectId: ..., ... }`. **Skopiuj go i wklej Claude** w konsoli (to nie jest tajne hasło – dane chronią reguły).
4. Kolejne kroki kreatora (instalacja SDK, CLI, deploy) możesz przeklikać „Dalej” – zrobi to Claude w repozytorium.

### 4. Połączenie repozytorium z projektem
Zrobione w repozytorium: plik `.firebaserc` wskazuje projekt `ogarnij-zycie` (zamiast `npx firebase use --add`). Hosting jest włączony – strona `ogarnij-zycie`, adres docelowy `https://ogarnij-zycie.web.app` (na razie pusty; publikujemy tam dopiero w etapie 7).

### 5. Publikacja testowa (kanał podglądu)
W katalogu repozytorium:
1. `npm run build`
2. `npx firebase hosting:channel:deploy test` – na końcu pojawi się adres podglądu (`https://ogarnij-zycie--test-….web.app`). Otwórz go na telefonie.
3. Adres podglądu wygasa po 7 dniach; kolejne uruchomienie tej komendy odświeża go i przedłuża. Na dłużej: `npx firebase hosting:channel:deploy test --expires 30d`.

---

## Etap 2 – logowanie i baza

### Authentication
1. Konsola → **Build → Authentication → Get started**.
2. Zakładka **Sign-in method** → **Email/Password** → włącz pierwszy przełącznik (Email/Password) → **Zapisz**. „Email link” zostaw wyłączony.
3. Zakładka **Settings → Authorized domains**: powinny być `localhost` i domeny `…web.app` / `…firebaseapp.com`. Adres wersji testowej (`ogarnij-zycie--test-….web.app`) dopisze sam Claude przy następnej publikacji – wcześniej się nie dało, bo Authentication było wyłączone. Jeśli będzie własna domena – dodasz ją tu później.
4. Zakładka **Templates** (Szablony): kliknij ikonę ołówka przy dowolnym szablonie, na dole **Template language** (Język szablonu) → **Polish / polski** → **Save**. Dzięki temu e‑mail „Nie pamiętam hasła” przyjdzie po polsku.

### Firestore
1. Konsola → **Build → Firestore Database → Create database**.
2. Edycja: **Standard**. Lokalizacja: **europe-central2 (Warszawa)** – *nie da się jej później zmienić*.
3. Tryb: **production mode** (reguły i tak wgra Claude).
4. Gdy Claude przygotuje reguły: `npx firebase deploy --only firestore:rules,firestore:indexes`

### Testy reguł – na drugim komputerze (z Javą 21)
Na głównym komputerze Javy nie aktualizujemy; testy reguł uruchamiasz na komputerze, na którym jest Java 21. Emulator działa na fikcyjnym projekcie `demo-ogarnij-zycie` – **nie łączy się z prawdziwym Firebase** i nie wymaga logowania.

1. **Skopiuj projekt** na drugi komputer: cały folder `Ogarnij_zycie` **bez** podfolderów `node_modules` i `dist` (np. spakuj do zipa i przenieś pendrivem / przez OneDrive). Folder `.git` może zostać – nie przeszkadza.
2. Na drugim komputerze potrzebne są: **Node.js LTS** (https://nodejs.org) i **Java 21** – sprawdź w terminalu: `node -v` oraz `java -version` (ma pokazać 21).
3. W terminalu, w katalogu projektu: `npm install` (raz, kilka minut).
4. `npm run test:reguly` – za pierwszym razem pobierze emulator Firestore (ok. 60 MB), uruchomi go, przeprowadzi testy i sam go wyłączy.
5. Na końcu pojawi się podsumowanie, np. `Tests  27 passed (27)`. **Skopiuj Claude cały wynik** (zwłaszcza linie z ✗ / ×, jeśli jakiś test nie przejdzie).
6. Przy każdej zmianie reguł Claude poprosi o powtórzenie kroków 1 (tylko pliki `firestore.rules` i `tests/`, albo cały folder), 4 i 5.

### Wgranie reguł do prawdziwej bazy
Dopiero gdy wszystkie testy reguł przejdą: na głównym komputerze w katalogu projektu `npx firebase deploy --only firestore:rules` (albo Claude – po Twojej zgodzie). Do tego czasu w bazie są reguły „wszystko zamknięte”.

---

## Etap 6 – powiadomienia push

Powiadomienia wysyła darmowy **Cloudflare Worker** (mały program w chmurze Cloudflare), który co minutę sprawdza, co jest do wysłania. Potrzebuje dwóch **tajnych** kluczy – wpisujesz je Ty, prosto do Cloudflare. **Żaden tajny klucz nie trafia do repozytorium ani na czat z Claude.** Claude dostaje od Ciebie tylko **klucz publiczny** (nie jest tajny).

Wszystkie komendy wpisujesz w terminalu (PowerShell) **w katalogu repozytorium**, na komputerze, na którym pracuje Claude. Najpierw: `git pull` i `npm install` (doszło narzędzie Cloudflare – `wrangler`).

### A. Konto Cloudflare (darmowe)
1. Wejdź na https://dash.cloudflare.com/sign-up.
2. Wpisz e‑mail i hasło → **Sign up** (Zarejestruj). Potwierdź adres e‑mail z wiadomości od Cloudflare.
3. Jeśli Cloudflare zapyta o plan albo o dodanie strony (domeny) – **pomiń** (Skip). Plan **Free**, **bez karty płatniczej**. Jeśli coś każe podać kartę – nie podawaj, zapytaj Claude.

### A2. Subdomena workers.dev (jednorazowo, wymagana dla harmonogramu)
1. https://dash.cloudflare.com → menu po lewej **Compute (Workers)** → **Workers & Pages** (albo samo **Workers & Pages**).
2. Przy pierwszym wejściu Cloudflare tworzy subdomenę konta albo prosi o nazwę – wpisz np. `hania-dzierwa` (bez polskich znaków) → **Set up** / **Continue**. Nic więcej nie klikaj.
3. Nasz Worker i tak nie ma publicznego adresu (`workers_dev = false`) – działa tylko z harmonogramu.

### B. Połączenie komputera z kontem Cloudflare
1. `npx wrangler login` – otworzy się przeglądarka z pytaniem o dostęp → **Allow** (Zezwól).
2. `npx wrangler whoami` – powinno pokazać Twój e‑mail i nazwę konta. Napisz Claude: **„wrangler zalogowany”**.

### C. Klucze do powiadomień (VAPID)
1. `npx web-push@3.6.7 generate-vapid-keys` (za pierwszym razem zapyta „Ok to proceed?” → **y**). Pokaże dwa klucze: **Public Key** i **Private Key**.
2. **Public Key** – skopiuj i wklej Claude na czacie (nie jest tajny, trafi do aplikacji).
3. **Private Key** – wpisz tylko do Cloudflare:
   - `npx wrangler secret put VAPID_PRIVATE_KEY --config worker/wrangler.toml`
   - Na pytanie, czy utworzyć nowego Workera („There doesn't seem to be a Worker called … Do you want to create a new Worker…?”) → **y**.
   - Na „Enter a secret value” wklej **Private Key** i naciśnij Enter (wklejony tekst może być niewidoczny – to normalne).
4. Wyczyść okno terminala: `cls`. Klucza prywatnego nigdzie nie zapisuj.

### D. Klucz konta serwisowego Firebase (dla Workera)
Worker czyta zadania, wydarzenia i ustawienia domowników – potrzebuje własnego „konta” w Firebase.
1. https://console.firebase.google.com → projekt **ogarnij-zycie**.
2. Koło zębate obok **Przegląd projektu** (Project overview) → **Ustawienia projektu** (Project settings).
3. Zakładka **Konta usługi** (Service accounts) → przycisk **Wygeneruj nowy klucz prywatny** (Generate new private key) → **Wygeneruj klucz** (Generate key). Pobierze się plik `ogarnij-zycie-firebase-adminsdk-….json` (zwykle do **Pobrane**).
4. Wpisz go do Cloudflare jedną komendą (bez otwierania pliku):
   - `Get-Content (Get-ChildItem "$HOME\Downloads\ogarnij-zycie-firebase-adminsdk-*.json" | Select-Object -First 1) -Raw | npx wrangler secret put FIREBASE_SERVICE_ACCOUNT --config worker/wrangler.toml`
5. **Usuń pobrany plik JSON** (i opróżnij Kosz Windows). Nie wysyłaj go nikomu, nie kopiuj do repozytorium.

### E. Sprawdzenie
1. `npx wrangler secret list --config worker/wrangler.toml` – na liście powinny być **VAPID_PRIVATE_KEY** i **FIREBASE_SERVICE_ACCOUNT** (same nazwy, bez wartości).
2. Napisz Claude: wynik tej komendy (same nazwy) + **Public Key** z kroku C.

Gdyby coś poszło nie tak (np. wklejony zły klucz) – po prostu powtórz komendę `secret put` z tą samą nazwą; nowa wartość zastąpi starą.

## Etap 7 – publikacja

- `npx firebase deploy --only hosting` → adres docelowy `https://<projekt>.web.app`.
- Opcjonalnie własna domena: Hosting → Add custom domain.
