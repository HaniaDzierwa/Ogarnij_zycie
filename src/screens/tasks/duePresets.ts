// Przyciski terminu w arkuszach zadania (dodawanie i edycja).

import { addDays, weekEnd, type DateKey } from '../../data/dates.ts'

export const DUE_PRESETS = [
  'Bez terminu',
  'Dziś',
  'Jutro',
  'W tym tygodniu',
  'W przyszłym tygodniu',
] as const
export type DuePreset = (typeof DUE_PRESETS)[number]

export type DueValue = { due: DateKey | null; dueWeek: boolean }

/** Termin z przycisku. „W tym / w przyszłym tygodniu” = niedziela tego / następnego tygodnia. */
export function presetDue(p: DuePreset, today: DateKey): DueValue {
  if (p === 'Dziś') return { due: today, dueWeek: false }
  if (p === 'Jutro') return { due: addDays(today, 1), dueWeek: false }
  if (p === 'W tym tygodniu') return { due: weekEnd(today), dueWeek: true }
  if (p === 'W przyszłym tygodniu') return { due: addDays(weekEnd(today), 7), dueWeek: true }
  return { due: null, dueWeek: false }
}

/** Który przycisk pasuje do terminu (brak = „Inna data”). Przyciski tygodnia – tylko przy dueWeek. */
export function presetOf(
  due: DateKey | null,
  dueWeek: boolean,
  today: DateKey,
): DuePreset | undefined {
  return DUE_PRESETS.find((p) => {
    const v = presetDue(p, today)
    return v.due === due && v.dueWeek === (dueWeek && due !== null)
  })
}
