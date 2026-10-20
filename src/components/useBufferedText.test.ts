import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { useBufferedText } from './useBufferedText.ts'

afterEach(() => vi.useRealTimers())

test('pisanie: na ekranie od razu, do bazy jeden zapis po chwili przerwy', () => {
  vi.useFakeTimers()
  const commit = vi.fn()
  const { result } = renderHook(() => useBufferedText('Mleko', commit))
  for (const v of ['Mleko ', 'Mleko i', 'Mleko i chleb']) act(() => result.current.change(v))
  expect(result.current.text).toBe('Mleko i chleb')
  expect(commit).not.toHaveBeenCalled()
  act(() => vi.advanceTimersByTime(500))
  expect(commit).toHaveBeenCalledTimes(1)
  expect(commit).toHaveBeenCalledWith('Mleko i chleb')
})

test('zamknięcie przed upływem chwili – zapis od razu, nic nie ginie', () => {
  vi.useFakeTimers()
  const commit = vi.fn()
  const { result, unmount } = renderHook(() => useBufferedText('', commit))
  act(() => result.current.change('Kod 4821'))
  unmount()
  expect(commit).toHaveBeenCalledWith('Kod 4821')
})

test('„porzuć” – nic nie zapisuje; bez pisania pole pokazuje wartość z bazy', () => {
  vi.useFakeTimers()
  const commit = vi.fn()
  const { result, rerender } = renderHook(({ v }) => useBufferedText(v, commit), {
    initialProps: { v: 'Prezent' },
  })
  act(() => result.current.change(''))
  act(() => result.current.discard())
  act(() => vi.advanceTimersByTime(1000))
  expect(commit).not.toHaveBeenCalled()
  // zmiana z drugiego telefonu
  rerender({ v: 'Prezent dla mamy' })
  expect(result.current.text).toBe('Prezent dla mamy')
})
