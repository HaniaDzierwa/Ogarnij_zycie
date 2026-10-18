// Mapa ekranów i przejść z docs/DESIGN.md i docs/design/ekrany/.

export type ScreenId =
  | 'ladowanie'
  | 'pierwsze'
  | 'start'
  | 'zadania'
  | 'kalendarz'
  | 'ustawienia'
  | 'domownicy'
  | 'zmiany'
  | 'zapros'
  | 'dolacz'

export type Transition = { label: string; to: string }

export type Screen = {
  id: ScreenId
  path: string
  /** Numer z projektu, np. „3”. */
  number: string
  /** Nazwa z projektu, np. „Zadania”. */
  name: string
  /** Pliki źródłowe w docs/design/ekrany/. */
  source: string
  transitions: Transition[]
}

export const paths = {
  ladowanie: '/ladowanie',
  pierwsze: '/witaj',
  start: '/',
  zadania: '/zadania',
  zadaniaPilne: '/zadania?pokaz=pilne',
  zadaniaOgarniete: '/zadania?pokaz=ogarniete',
  kalendarz: '/kalendarz',
  kalendarzDzien: (dzien: string) => `/kalendarz?dzien=${dzien}`,
  ustawienia: '/ustawienia',
  domownicy: '/ustawienia/domownicy',
  zmiany: '/ustawienia/domownicy/zmiany',
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
      { label: 'Pierwsze uruchomienie (bez domu)', to: paths.pierwsze },
      { label: 'Start (dom już jest)', to: paths.start },
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
    id: 'start',
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
      { label: 'Plakietka synchronizacji', to: paths.domownicy },
    ],
  },
  {
    id: 'zadania',
    path: paths.zadania,
    number: '3',
    name: 'Zadania',
    source: 'Zadania.dc.html, ZadaniaPilne.dc.html, ZadaniaOgarniete.dc.html',
    transitions: [...tabs, { label: 'Plakietka synchronizacji', to: paths.domownicy }],
  },
  {
    id: 'kalendarz',
    path: paths.kalendarz,
    number: '4',
    name: 'Kalendarz',
    source: 'Kalendarz.dc.html, KalendarzImieniny.dc.html, KalendarzUrodziny.dc.html',
    transitions: tabs,
  },
  {
    id: 'ustawienia',
    path: paths.ustawienia,
    number: '5',
    name: 'Ustawienia',
    source: 'Ustawienia.dc.html',
    transitions: [...tabs, { label: 'Wspólny dom → Domownicy', to: paths.domownicy }],
  },
  {
    id: 'domownicy',
    path: paths.domownicy,
    number: '5a',
    name: 'Synchronizacja / Domownicy',
    source: 'Synchronizacja.dc.html',
    transitions: [
      { label: 'Wróć do Ustawień', to: paths.ustawienia },
      { label: 'Zmiany od domownika', to: paths.zmiany },
      { label: 'Zaproś domownika', to: paths.zapros },
      ...tabs,
    ],
  },
  {
    id: 'zmiany',
    path: paths.zmiany,
    number: '5b',
    name: 'Zmiany od domownika',
    source: 'Import.dc.html',
    transitions: [
      { label: 'Wróć do Domowników', to: paths.domownicy },
      { label: 'Gotowe → Zadania', to: paths.zadania },
    ],
  },
  {
    id: 'zapros',
    path: paths.zapros,
    number: '5c–d',
    name: 'Zaproś domownika',
    source: 'Zaproszenie.dc.html, ZaproszenieGotowe.dc.html',
    transitions: [{ label: 'Wróć do Domowników', to: paths.domownicy }],
  },
  {
    id: 'dolacz',
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
