import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App.tsx'
import { registerSW } from 'virtual:pwa-register'
import './theme/global.css'
import { installTheme } from './theme/theme.ts'

registerSW({ immediate: true })
installTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
