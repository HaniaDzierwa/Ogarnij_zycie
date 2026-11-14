// @vitest-environment node

import { expect, test } from 'vitest'
import { JoinError, joinErrorText } from './house.ts'

test('komunikat dołączania: znane błędy bez kodu, nieznane – z kodem do zgłoszenia', () => {
  expect(joinErrorText(new JoinError('expired'))).toBe(
    'Ten kod już wygasł (ważny 10 minut). Poproś o nowy kod.',
  )
  expect(joinErrorText(new JoinError('unknown', 'permission-denied'))).toBe(
    'Nie udało się dołączyć. Spróbuj jeszcze raz. (kod: permission-denied)',
  )
  expect(joinErrorText({ code: 'deadline-exceeded' })).toContain('(kod: deadline-exceeded)')
  expect(joinErrorText(new Error('x'))).toBe('Nie udało się dołączyć. Spróbuj jeszcze raz.')
})
