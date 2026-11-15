// Części zwartych arkuszy bez komponentów (etap 8): który wiersz karty jest rozwinięty, ikony wierszy.

import { useState } from 'react'

/** Który wiersz karty jest rozwinięty (null – żaden); drugie dotknięcie zwija. */
export function useOpenRow<K extends string>(initial: K | null = null) {
  const [open, setOpen] = useState<K | null>(initial)
  return {
    open,
    toggle: (k: K) => setOpen((o) => (o === k ? null : k)),
    close: () => setOpen(null),
    is: (k: K) => open === k,
  }
}

/** Ikony wierszy (20 px, obrys) – kolor z wiersza (mosiądz). */
const rowIcon = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

export const RowIcons = {
  tag: (
    <svg {...rowIcon}>
      <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9z" />
      <circle cx="8" cy="8" r="1.5" />
    </svg>
  ),
  flag: (
    <svg {...rowIcon}>
      <path d="M5 21V4" />
      <path d="M5 4h11l-2 4 2 4H5" />
    </svg>
  ),
  calendar: (
    <svg {...rowIcon}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  clock: (
    <svg {...rowIcon}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  repeat: (
    <svg {...rowIcon}>
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </svg>
  ),
  bell: (
    <svg {...rowIcon}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  ),
  people: (
    <svg {...rowIcon}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" />
    </svg>
  ),
}
