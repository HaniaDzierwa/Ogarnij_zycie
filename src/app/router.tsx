import type { ReactNode } from 'react'
import type { RouteObject } from 'react-router'
import { LoginScreen, RegisterScreen, ResetPasswordScreen } from '../screens/AccountScreens.tsx'
import { CalendarRoute } from '../screens/calendar/CalendarScreen.tsx'
import { ElementsScreen } from '../screens/ElementsScreen.tsx'
import { FirstRunScreen } from '../screens/FirstRunScreen.tsx'
import { JoinScreen } from '../screens/JoinScreen.tsx'
import { LoadingScreen } from '../screens/LoadingScreen.tsx'
import { MapScreen } from '../screens/MapScreen.tsx'
import { PlaceholderScreen } from '../screens/PlaceholderScreen.tsx'
import { SettingsScreen } from '../screens/settings/SettingsScreen.tsx'
import { InviteScreen } from '../screens/settings/InviteScreen.tsx'
import { MembersScreen } from '../screens/settings/MembersScreen.tsx'
import { StartScreen } from '../screens/StartScreen.tsx'
import { TasksRoute } from '../screens/tasks/TasksScreen.tsx'
import { TrashScreen } from '../screens/tasks/TrashScreen.tsx'
import { RequireAuth } from '../auth/RequireAuth.tsx'
import { screens, type ScreenId } from './screens.ts'

/** Gotowe ekrany; pozostałe pokazują PlaceholderScreen do czasu ich zbudowania. */
const built: Partial<Record<ScreenId, ReactNode>> = {
  ladowanie: <LoadingScreen />,
  pierwsze: <FirstRunScreen />,
  logowanie: <LoginScreen />,
  rejestracja: <RegisterScreen />,
  haslo: <ResetPasswordScreen />,
  start: <StartScreen />,
  zadania: <TasksRoute />,
  kosz: <TrashScreen />,
  kalendarz: <CalendarRoute />,
  ustawienia: <SettingsScreen />,
  domownicy: <MembersScreen />,
  zapros: <InviteScreen />,
  dolacz: <JoinScreen />,
}

/** Ekrany dostępne bez konta; pozostałe tylko po zalogowaniu. */
const PUBLIC: ScreenId[] = ['ladowanie', 'logowanie', 'rejestracja', 'haslo']

/** Ekrany przed założeniem / dołączeniem do domu; pozostałe wymagają domu. */
const HOUSE_MODE: Partial<Record<ScreenId, 'firstRun' | 'any'>> = {
  pierwsze: 'firstRun',
  dolacz: 'any',
}

const screenElement = (screen: (typeof screens)[number]) =>
  built[screen.id] ?? <PlaceholderScreen screen={screen} />

export const routes: RouteObject[] = [
  ...screens.map((screen) => ({
    path: screen.path,
    element: PUBLIC.includes(screen.id) ? (
      screenElement(screen)
    ) : (
      <RequireAuth house={HOUSE_MODE[screen.id] ?? 'required'}>{screenElement(screen)}</RequireAuth>
    ),
  })),
  { path: '/mapa', element: <MapScreen /> },
  { path: '/elementy', element: <ElementsScreen /> },
  // Nieznany adres → mapa ekranów (na czas budowy).
  { path: '*', element: <MapScreen /> },
]
