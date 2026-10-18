import type { RouteObject } from 'react-router'
import { ElementsScreen } from '../screens/ElementsScreen.tsx'
import { MapScreen } from '../screens/MapScreen.tsx'
import { PlaceholderScreen } from '../screens/PlaceholderScreen.tsx'
import { screens } from './screens.ts'

export const routes: RouteObject[] = [
  ...screens.map((screen) => ({
    path: screen.path,
    element: <PlaceholderScreen screen={screen} />,
  })),
  { path: '/mapa', element: <MapScreen /> },
  { path: '/elementy', element: <ElementsScreen /> },
  // Nieznany adres → mapa ekranów (na czas budowy).
  { path: '*', element: <MapScreen /> },
]
