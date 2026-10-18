import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import App from './App.tsx'

test('pokazuje nazwę aplikacji', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: 'Ogarnij życie' })).toBeDefined()
})
