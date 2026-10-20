import { createBrowserRouter, RouterProvider } from 'react-router'
import { FirebaseAuthProvider } from '../auth/FirebaseAuthProvider.tsx'
import { MockStoreProvider } from '../data/MockStore.tsx'
import { FirebaseHouseProvider } from '../house/FirebaseHouseProvider.tsx'
import { routes } from './router.tsx'

const router = createBrowserRouter(routes)

export default function App() {
  return (
    <FirebaseAuthProvider>
      <FirebaseHouseProvider>
        <MockStoreProvider>
          <RouterProvider router={router} />
        </MockStoreProvider>
      </FirebaseHouseProvider>
    </FirebaseAuthProvider>
  )
}
