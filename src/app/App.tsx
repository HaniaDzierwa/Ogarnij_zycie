import { createBrowserRouter, RouterProvider } from 'react-router'
import { MockStoreProvider } from '../data/MockStore.tsx'
import { routes } from './router.tsx'

const router = createBrowserRouter(routes)

export default function App() {
  return (
    <MockStoreProvider>
      <RouterProvider router={router} />
    </MockStoreProvider>
  )
}
