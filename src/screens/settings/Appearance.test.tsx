import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { setThemeChoice } from '../../theme/theme.ts'
import { renderApp } from '../../test/renderApp.tsx'

afterEach(() => {
  cleanup()
  setThemeChoice('system')
})

const radio = (name: string) => screen.getByRole('radio', { name })

test('Ustawienia › Wygląd: domyślnie systemowy; Ciemny od razu zmienia motyw i opis wiersza', () => {
  const router = renderApp('/ustawienia')
  expect(screen.getByText('WYGLĄD')).toBeDefined()
  expect(screen.getByText('JAK W TELEFONIE')).toBeDefined()
  fireEvent.click(screen.getByRole('link', { name: /^Wygląd/ }))
  expect(router.state.location.pathname).toBe('/ustawienia/wyglad')

  expect(radio('Systemowy').getAttribute('aria-checked')).toBe('true')
  expect(screen.getByText('Jak w telefonie.')).toBeDefined()
  expect(screen.getByText('Każdy domownik ma swój motyw.')).toBeDefined()

  fireEvent.click(radio('Ciemny'))
  expect(radio('Ciemny').getAttribute('aria-checked')).toBe('true')
  expect(screen.getByText('Zawsze ciemny.')).toBeDefined()
  expect(document.documentElement.dataset.theme).toBe('dark')

  fireEvent.click(radio('Jasny'))
  expect(document.documentElement.dataset.theme).toBe('light')

  fireEvent.click(screen.getByRole('link', { name: /USTAWIENIA/ }))
  expect(screen.getByText('JASNY')).toBeDefined()
})
