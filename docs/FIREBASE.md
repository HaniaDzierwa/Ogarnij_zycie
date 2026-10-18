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
W katalogu repozytorium, w terminalu:
1. `npx firebase use --add` → wybierz projekt `ogarnij-zycie`, alias: `default`.
2. Podaj Claude identyfikator projektu, jeśli o niego poprosi.

### 5. Pierwsza publikacja testowa (gdy Claude powie, że gotowe)
1. `npm run build`
2. `npx firebase hosting:channel:deploy test` – na końcu pojawi się adres podglądu (`https://ogarnij-zycie--test-….web.app`). Otwórz go na telefonie.

---

## Etap 2 – logowanie i baza

### Authentication
1. Konsola → **Build → Authentication → Get started**.
2. Zakładka **Sign-in method** → **Email/Password** → włącz pierwszy przełącznik (Email/Password) → **Zapisz**. „Email link” zostaw wyłączony.
3. Zakładka **Settings → Authorized domains**: powinny być `localhost` i domeny `…web.app` / `…firebaseapp.com`. Jeśli będzie własna domena – dodasz ją tu później.

### Firestore
1. Konsola → **Build → Firestore Database → Create database**.
2. Edycja: **Standard**. Lokalizacja: **europe-central2 (Warszawa)** – *nie da się jej później zmienić*.
3. Tryb: **production mode** (reguły i tak wgra Claude).
4. Gdy Claude przygotuje reguły: `npx firebase deploy --only firestore:rules,firestore:indexes`

### Emulatory (do testów reguł, na Twoim komputerze)
1. Zainstaluj Javę (JDK 17+), jeśli `npx firebase emulators:start` o nią poprosi.
2. `npx firebase emulators:start` – uruchamia lokalne Auth i Firestore; nic nie trafia do prawdziwej bazy.

---

## Etap 7 – powiadomienia push (Claude dopisze szczegóły)

- Klucze VAPID (Claude wygeneruje parę; klucz prywatny trzymasz tylko w sekretach Cloudflare).
- Konto serwisowe Firebase (Project settings → Service accounts → Generate new private key) – plik JSON **nigdy** nie trafia do repozytorium ani na czat; tylko jako sekret Workera.
- Darmowe konto Cloudflare + `npx wrangler login`.

## Etap 9 – publikacja

- `npx firebase deploy --only hosting` → adres docelowy `https://<projekt>.web.app`.
- Opcjonalnie własna domena: Hosting → Add custom domain.
