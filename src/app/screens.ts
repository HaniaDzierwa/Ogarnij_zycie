// Mapa ekranów i przejść z docs/DESIGN.md i docs/design/ekrany/.

export type ScreenId =
  | 'ladowanie'
  | 'pierwsze'
  | 'logowanie'
  | 'rejestracja'
  | 'haslo'
  | 'start'
  | 'zadania'
  | 'kosz'
  | 'kalendarz'
  | 'ustawienia'
  | 'domownicy'
  | 'kategorie'
  | 'priorytety'
  | 'usunKonto'
  | 'zapros'
  | 'dolacz'

export type Transition = { label: string; to: string }

export type Tab = 'start' | 'zadania' | 'kalendarz' | 'ustawienia'

export type Screen = {
  id: ScreenId
  path: string
  /** Numer z projektu, np. „3”. */
  number: string
  /** Nazwa z projektu, np. „Zadania”. */
  name: string
  /** Pliki źródłowe w docs/design/ekrany/. */
  source: string
  /** Aktywna zakładka dolnego paska; brak = ekran bez paska. */
  tab?: Tab
  /** Dokąd prowadzi „wstecz” w nagłówku. */
  back?: { to: string; label: string }
  transitions: Transition[]
}

export const paths = {
  ladowanie: '/ladowanie',
  pierwsze: '/witaj',
  logowanie: '/logowanie',
  rejestracja: '/rejestracja',
  haslo: '/haslo',
  start: '/',
  zadania: '/zadania',
  zadaniaPilne: '/zadania?pokaz=pilne',
  /** Zakładka „Ogarnięte”. */
  zadaniaOgarniete: '/zadania?zakladka=ogarniete',
  /** Wspólny Kosz zadań i wydarzeń (Ustawienia → Porządki). */
  kosz: '/ustawienia/kosz',
  /** Zadania z otwartym arkuszem „Nowe zadanie” (menu „+”). */
  zadaniaNowe: '/zadania?nowe=zadanie',
  kalendarz: '/kalendarz',
  kalendarzDzien: (dzien: string) => `/kalendarz?dzien=${dzien}`,
  /** Kalendarz z otwartym arkuszem nowego wydarzenia (menu „+”). */
  kalendarzNowe: '/kalendarz?nowe=wydarzenie',
  ustawienia: '/ustawienia',
  domownicy: '/ustawienia/domownicy',
  /** Ustawienia → Zadania: kategorie i własne priorytety (decyzja Hani 2026-10-20). */
  kategorie: '/ustawienia/kategorie',
  priorytety: '/ustawienia/priorytety',
  /** Usunięcie konta (etap 7). */
  usunKonto: '/ustawienia/usun-konto',
  zapros: '/ustawienia/domownicy/zapros',
  dolacz: '/dolacz',
} as const

const tabs: Transition[] = [
  { label: 'Start', to: paths.start },
  { label: 'Zadania', to: paths.zadania },
  { label: 'Kalendarz', to: paths.kalendarz },
  { label: 'Ustawienia', to: paths.ustawienia },
]

export const screens: Screen[] = [
  {
    id: 'ladowanie',
    path: paths.ladowanie,
    number: '1',
    name: 'Ładowanie',
    source: 'PowitanieDzien.dc.html, PowitanieNoc.dc.html',
    transitions: [
      { label: 'Zaloguj się (bez konta)', to: paths.logowanie },
      { label: 'Pierwsze uruchomienie (konto bez domu)', to: paths.pierwsze },
      { label: 'Start (konto z domem)', to: paths.start },
    ],
  },
  {
    id: 'pierwsze',
    path: paths.pierwsze,
    number: '1a',
    name: 'Pierwsze uruchomienie',
    source: 'Pierwsze.dc.html',
    transitions: [
      { label: 'Załóż nowy dom', to: paths.start },
      { label: 'Dołącz do domu', to: paths.dolacz },
    ],
  },
  {
    id: 'logowanie',
    path: paths.logowanie,
    number: '1b',
    name: 'Zaloguj się',
    source: 'nowy ekran (Claude, etap 1)',
    transitions: [
      { label: 'Zaloguj się → Start', to: paths.start },
      { label: 'Nie pamiętam hasła', to: paths.haslo },
      { label: 'Załóż konto', to: paths.rejestracja },
    ],
  },
  {
    id: 'rejestracja',
    path: paths.rejestracja,
    number: '1b',
    name: 'Załóż konto',
    source: 'nowy ekran (Claude, etap 1)',
    back: { to: paths.logowanie, label: 'ZALOGUJ SIĘ' },
    transitions: [
      { label: 'Załóż konto → Pierwsze uruchomienie', to: paths.pierwsze },
      { label: 'Zaloguj się', to: paths.logowanie },
    ],
  },
  {
    id: 'haslo',
    path: paths.haslo,
    number: '1b',
    name: 'Nie pamiętam hasła',
    source: 'nowy ekran (Claude, etap 1)',
    back: { to: paths.logowanie, label: 'ZALOGUJ SIĘ' },
    transitions: [{ label: 'Wróć do logowania', to: paths.logowanie }],
  },
  {
    id: 'start',
    tab: 'start',
    path: paths.start,
    number: '2',
    name: 'Start',
    source: 'Kategorie.dc.html, StartDzien.dc.html, StartNoc.dc.html',
    transitions: [
      ...tabs,
      { label: 'Kafelek „Pilne”', to: paths.zadaniaPilne },
      { label: 'Kafelek „Ogarnięte dziś”', to: paths.zadaniaOgarniete },
      { label: 'Wydarzenie: imieniny (16 paź)', to: paths.kalendarzDzien('2026-10-16') },
      { label: 'Wydarzenie: urodziny (17 paź)', to: paths.kalendarzDzien('2026-10-17') },
    ],
  },
  {
    id: 'zadania',
    tab: 'zadania',
    path: paths.zadania,
    number: '3',
    name: 'Zadania',
    source:
      'Zadania.dc.html, ZadaniaPilne.dc.html, ZadaniaOgarniete.dc.html, ZadaniaPrawo/Lewo/Arkusz/Wyczysc.dc.html',
    transitions: tabs,
  },
  {
    id: 'kosz',
    path: paths.kosz,
    number: '3a',
    name: 'Kosz',
    source: 'Kosz.dc.html, KoszPotwierdzenie.dc.html',
    tab: 'ustawienia',
    back: { to: paths.ustawienia, label: 'USTAWIENIA' },
    transitions: [{ label: 'Wróć do Ustawień', to: paths.ustawienia }],
  },
  {
    id: 'kalendarz',
    tab: 'kalendarz',
    path: paths.kalendarz,
    number: '4',
    name: 'Kalendarz',
    source: 'Kalendarz.dc.html, KalendarzImieniny.dc.html, KalendarzUrodziny.dc.html',
    transitions: tabs,
  },
  {
    id: 'ustawienia',
    tab: 'ustawienia',
    path: paths.ustawienia,
    number: '5',
    name: 'Ustawienia',
    source: 'Ustawienia.dc.html',
    transitions: [
      ...tabs,
      { label: 'Wspólny dom → Domownicy', to: paths.domownicy },
      { label: 'Zadania → Kategorie', to: paths.kategorie },
      { label: 'Zadania → Priorytety', to: paths.priorytety },
      { label: 'Porządki → Kosz', to: paths.kosz },
    ],
  },
  {
    id: 'kategorie',
    path: paths.kategorie,
    number: '5g',
    name: 'Kategorie',
    source: 'brak w projekcie – lista w stylu Kosza / Domowników (decyzja Hani 2026-10-20)',
    tab: 'ustawienia',
    back: { to: paths.ustawienia, label: 'USTAWIENIA' },
    transitions: [{ label: 'Wróć do Ustawień', to: paths.ustawienia }],
  },
  {
    id: 'usunKonto',
    path: paths.usunKonto,
    number: '5i',
    name: 'Usuń konto',
    source: 'brak w projekcie – decyzja Hani 2026-10-18 (przekazać dom / usunąć dom)',
    tab: 'ustawienia',
    back: { to: paths.ustawienia, label: 'USTAWIENIA' },
    transitions: [{ label: 'Wróć do Ustawień', to: paths.ustawienia }],
  },
  {
    id: 'priorytety',
    path: paths.priorytety,
    number: '5h',
    name: 'Priorytety',
    source: 'brak w projekcie – lista w stylu Kosza / Domowników (decyzja Hani 2026-10-20)',
    tab: 'ustawienia',
    back: { to: paths.ustawienia, label: 'USTAWIENIA' },
    transitions: [{ label: 'Wróć do Ustawień', to: paths.ustawienia }],
  },
  {
    id: 'domownicy',
    back: { to: paths.ustawienia, label: 'USTAWIENIA' },
    tab: 'ustawienia',
    path: paths.domownicy,
    number: '5a',
    name: 'Domownicy',
    source: 'Synchronizacja.dc.html (bez części o synchronizacji)',
    transitions: [
      { label: 'Wróć do Ustawień', to: paths.ustawienia },
      { label: 'Zaproś domownika', to: paths.zapros },
      ...tabs,
    ],
  },
  {
    id: 'zapros',
    back: { to: paths.domownicy, label: 'DOMOWNICY' },
    path: paths.zapros,
    number: '5c–d',
    name: 'Zaproś domownika',
    source: 'Zaproszenie.dc.html, ZaproszenieGotowe.dc.html',
    transitions: [{ label: 'Wróć do Domowników', to: paths.domownicy }],
  },
  {
    id: 'dolacz',
    back: { to: paths.pierwsze, label: 'WITAJ' },
    path: paths.dolacz,
    number: '5e–f',
    name: 'Dołącz do domu',
    source: 'Dolacz.dc.html, DolaczZnaleziono.dc.html',
    transitions: [
      { label: 'Wróć do Pierwszego uruchomienia', to: paths.pierwsze },
      { label: 'Dołącz → Start', to: paths.start },
    ],
  },
]
