// @vitest-environment node

import { expect, test, vi } from 'vitest'
import { listenAfterWrites } from './listen.ts'

const denied = { code: 'permission-denied' }

/** Atrapa odczytu: zapamiętuje zgłaszanie błędów kolejnych prób. */
function fakeSubscribe() {
  const errors: ((e: unknown) => void)[] = []
  const stops = vi.fn()
  const subscribe = (onError: (e: unknown) => void) => {
    errors.push(onError)
    return stops
  }
  return { subscribe, errors, stops }
}

test('„brak dostępu” przed zapisem domu – po zapisach odczyt zakładany jeszcze raz', async () => {
  const s = fakeSubscribe()
  const onFail = vi.fn()
  listenAfterWrites(s.subscribe, onFail, () => Promise.resolve())
  s.errors[0](denied)
  await vi.waitFor(() => expect(s.errors).toHaveLength(2))
  expect(onFail).not.toHaveBeenCalled()
  // drugi „brak dostępu” – naprawdę brak dostępu
  s.errors[1](denied)
  expect(onFail).toHaveBeenCalledWith(denied)
})

test('inny błąd – od razu onFail; po zakończeniu – bez ponownej próby', async () => {
  const s = fakeSubscribe()
  const onFail = vi.fn()
  listenAfterWrites(s.subscribe, onFail, () => Promise.resolve())
  s.errors[0]({ code: 'unavailable' })
  expect(onFail).toHaveBeenCalledTimes(1)

  const t = fakeSubscribe()
  const stop = listenAfterWrites(t.subscribe, vi.fn(), () => Promise.resolve())
  t.errors[0](denied)
  stop()
  await Promise.resolve()
  await Promise.resolve()
  expect(t.errors).toHaveLength(1)
  expect(t.stops).toHaveBeenCalled()
})
