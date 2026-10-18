import type { ReactNode } from 'react'
import type { RouteObject } from 'react-router'
import { LoginScreen, RegisterScreen, ResetPasswordScreen } from '../screens/AccountScreens.tsx'
import { CalendarRoute } from '../screens/calendar/CalendarScreen.tsx'
import { ElementsScreen } from '../screens/ElementsScreen.tsx'
import { FirstRunScreen } from '../screens/FirstRunScreen.tsx'
import { LoadingScreen } from '../screens/LoadingScreen.tsx'
import { MapScreen } from '../screens/MapScreen.tsx'
import { PlaceholderScreen } from '../screens/PlaceholderScreen.tsx'
import { StartScreen } from '../screens/StartScreen.tsx'
import { TasksRoute } from '../screens/tasks/TasksScreen.tsx'
import { TrashScreen } from '../screens/tasks/TrashScreen.tsx'
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
}

export const routes: RouteObject[] = [
  ...screens.map((screen) => ({
    path: screen.path,
    element: built[screen.id] ?? <PlaceholderScreen screen={screen} />,
  })),
  { path: '/mapa', element: <MapScreen /> },
  { path: '/elementy', element: <ElementsScreen /> },
  // Nieznany adres → mapa ekranów (na czas budowy).
  { path: '*', element: <MapScreen /> },
]
