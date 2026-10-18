// Ikony z docs/design/ekrany/ (obrys, kolor = currentColor).

type IconProps = { size?: number }

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

export function HouseIcon({ size = 22 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      {...stroke}
      strokeWidth={11}
      aria-hidden="true"
    >
      <path d="M24 60L60 28l36 32" />
      <path d="M34 54v34a6 6 0 0 0 6 6h40a6 6 0 0 0 6-6V54" />
    </svg>
  )
}

export function TaskIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="4.5" />
      <path d="M8.5 12l2.5 2.5 4.5-5" />
    </svg>
  )
}

export function CalendarIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="4" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </svg>
  )
}

export function SlidersIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </svg>
  )
}

export function PlusIcon({ size = 24, strokeWidth = 2.6 }: IconProps & { strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...stroke}
      strokeWidth={strokeWidth}
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function ChevronLeftIcon({ size = 18 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...stroke}
      strokeWidth={2.2}
      aria-hidden="true"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

export function ChevronRightIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

export function CloseIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function CheckIcon({ size = 20, strokeWidth = 2.6 }: IconProps & { strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...stroke}
      strokeWidth={strokeWidth}
      aria-hidden="true"
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

export function UndoIcon({ size = 20, strokeWidth = 2.6 }: IconProps & { strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...stroke}
      strokeWidth={strokeWidth}
      aria-hidden="true"
    >
      <path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />
    </svg>
  )
}

export function TrashIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}

/** Ikona rodzaju wydarzenia w kalendarzu (Kalendarz.dc.html). */
export function EventTypeIcon({
  icon,
  size = 20,
}: IconProps & { icon: 'deadline' | 'bday' | 'party' | 'event' | 'custom' }) {
  if (icon === 'event') return <CalendarIcon size={size} />
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      {icon === 'deadline' && (
        <>
          <path d="M5 21V4" />
          <path d="M5 4h11l-2 4 2 4H5" />
        </>
      )}
      {icon === 'bday' && (
        <>
          <path d="M4 20h16" />
          <path d="M5 20v-7h14v7" />
          <path d="M5 16c2.3 1.3 4.7 1.3 7 0s4.7-1.3 7 0" />
          <path d="M12 13V9" />
          <path d="M12 6.5c-.8-.7-.8-1.8 0-2.5.8.7.8 1.8 0 2.5z" />
        </>
      )}
      {icon === 'party' && (
        <>
          <path d="M4 20l5-14 9 9z" />
          <path d="M14 4v2M19 9h2M17.5 5.5L16 7" />
        </>
      )}
      {icon === 'custom' && (
        <>
          <path d="M3.5 12.5V5a1.5 1.5 0 0 1 1.5-1.5h7.5L21 12l-9 9z" />
          <circle cx="8.5" cy="8.5" r="1.5" />
        </>
      )}
    </svg>
  )
}

export function UsersIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c.5-3.5 3-5.5 6-5.5s5.5 2 6 5.5" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
      <path d="M18 14.7c1.7.7 2.8 2.5 3 5.3" />
    </svg>
  )
}
