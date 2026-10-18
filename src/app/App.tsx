import { createBrowserRouter, RouterProvider } from 'react-router'
import { FirebaseAuthProvider } from '../auth/FirebaseAuthProvider.tsx'
import { MockStoreProvider } from '../data/MockStore.tsx'
import { routes } from './router.tsx'

const router = createBrowserRouter(routes)

export default function App() {
  return (
    <FirebaseAuthProvider>
      <MockStoreProvider>
        <RouterProvider router={router} />
      </MockStoreProvider>
    </FirebaseAuthProvider>
  )
}
