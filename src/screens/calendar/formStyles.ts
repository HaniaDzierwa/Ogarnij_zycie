// Style pól arkuszy wydarzenia (nowe wydarzenie i edycja).

import { colors, fonts } from '../../theme'

export const label = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: '1.4px',
  color: colors.muted,
} as const

export const timeInput = {
  height: 50,
  width: '100%',
  border: `1px solid ${colors.border}`,
  borderRadius: 16,
  padding: '0 14px',
  fontFamily: fonts.serif,
  fontSize: 18,
  fontWeight: 600,
  color: colors.green900,
  background: colors.white,
  outlineColor: colors.green900,
} as const
