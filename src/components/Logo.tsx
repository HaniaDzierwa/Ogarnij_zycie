import { colors } from '../theme'

type Props = {
  size?: number
  /** Kolor domku; ptaszek zawsze mosiężny. */
  color?: string
  check?: string
}

/** Logo „domek z ptaszkiem” (z nagłówków w docs/design/ekrany/). */
export function Logo({ size = 22, color = colors.green900, check = colors.brass300 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M24 60L60 28l36 32" stroke={color} strokeWidth="11" />
      <path d="M34 54v34a6 6 0 0 0 6 6h40a6 6 0 0 0 6-6V54" stroke={color} strokeWidth="11" />
      <path d="M46 72l10 10 20-22" stroke={check} strokeWidth="11" />
    </svg>
  )
}
