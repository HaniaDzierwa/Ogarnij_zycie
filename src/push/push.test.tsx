import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { renderApp } from '../test/renderApp.tsx'
import { isIos, keyBytes, pushState, type PushEnv } from './push.ts'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  try {
    localStorage.clear()
  } catch {
    // brak pamięci przeglądarki w środowisku testów
  }
})

const env = (over: Partial<PushEnv> = {}): PushEnv => ({
  userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/130',
  platform: 'Linux armv8l',
  maxTouchPoints: 5,
  standalone: false,
  hasPush: true,
  permission: 'default',
  getSubscription: async () => null,
  ...over,
})

describe('stan powiadomień na telefonie', () => {
  test('Android: bez zgody – „off”, ze zgodą i subskrypcją – „on”, zablokowane – „denied”', async () => {
    expect(await pushState(env())).toBe('off')
    expect(await pushState(env({ permission: 'granted' }))).toBe('off')
    expect(
      await pushState(
        env({ permission: 'granted', getSubscription: async () => ({}) as PushSubscription }),
      ),
    ).toBe('on')
    expect(await pushState(env({ permission: 'denied' }))).toBe('denied')
    expect(await pushState(env({ hasPush: false }))).toBe('unsupported')
  })
  test('iPhone: w Safari – najpierw ekran główny; z ikony – jak wszędzie', async () => {
    const iphone = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)', platform: 'iPhone' }
    expect(await pushState(env({ ...iphone, hasPush: false }))).toBe('ios-install')
    expect(await pushState(env({ ...iphone, standalone: true }))).toBe('off')
    // iPad udaje Maca
    expect(isIos({ userAgent: 'Macintosh', platform: 'MacIntel', maxTouchPoints: 5 })).toBe(true)
    expect(isIos({ userAgent: 'Macintosh', platform: 'MacIntel', maxTouchPoints: 0 })).toBe(false)
  })
  test('klucz VAPID base64url → bajty', () => {
    expect([...keyBytes('AQID_w')]).toEqual([1, 2, 3, 255])
  })
})

describe('karta „Włączyć przypomnienia?”', () => {
  test('w przeglądarce bez powiadomień (np. testy) karty nie ma; w Ustawieniach – opis', async () => {
    renderApp('/?pora=dzien')
    expect(screen.queryByText(/Włączyć/)).toBeNull()
    cleanup()
    renderApp('/ustawienia')
    expect(await screen.findByText('Ta przeglądarka ich nie obsługuje')).toBeDefined()
  })

  test('Android bez zgody: karta na Starcie; „Nie teraz” chowa ją na stałe', async () => {
    const mod = await import('./push.ts')
    vi.spyOn(mod, 'pushState').mockResolvedValue('off')
    renderApp('/?pora=dzien')
    expect(await screen.findByText('przypomnienia?')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'NIE TERAZ' }))
    expect(screen.queryByText('przypomnienia?')).toBeNull()
    cleanup()
    renderApp('/?pora=dzien')
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.queryByText('przypomnienia?')).toBeNull()
  })
})
