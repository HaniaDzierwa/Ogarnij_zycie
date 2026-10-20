import { createBrowserRouter, RouterProvider } from 'react-router'
import { FirebaseAuthProvider } from '../auth/FirebaseAuthProvider.tsx'
import { FirestoreStoreProvider } from '../data/FirestoreStore.tsx'
import { FirebaseHouseProvider } from '../house/FirebaseHouseProvider.tsx'
import { routes } from './router.tsx'

const router = createBrowserRouter(routes)

export default function App() {
  return (
    <FirebaseAuthProvider>
      <FirebaseHouseProvider>
        <FirestoreStoreProvider>
          <RouterProvider router={router} />
        </FirestoreStoreProvider>
      </FirebaseHouseProvider>
    </FirebaseAuthProvider>
  )
}
