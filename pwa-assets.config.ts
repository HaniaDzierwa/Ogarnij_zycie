import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Ikony aplikacji z public/logo.svg (domek z ptaszkiem na butelkowej zieleni).
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    maskable: {
      ...minimal2023Preset.maskable,
      padding: 0,
      resizeOptions: { background: '#1F3D2E' },
    },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: '#1F3D2E' } },
  },
  images: ['public/logo.svg'],
})
