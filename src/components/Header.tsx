import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { colors, dayHeader, fonts, radii, sizes } from '../theme'
import { ChevronLeftIcon } from './icons.tsx'

export type HeaderTone = 'dark' | 'day' | 'night'

type Props = {
  /** dark – zwykły nagłówek; day/night – Start i Ładowanie wg pory dnia. */
  tone?: HeaderTone
  /** Etykieta w lewym górnym rogu (WERSALIKI), np. „ZADANIA · PIĄTEK 9 PAŹ”. */
  label?: ReactNode
  /** Link „wstecz” zamiast etykiety, np. { to: '/ustawienia', label: 'USTAWIENIA' }. */
  back?: { to: string; label: string }
  /** Prawy górny róg, np. plakietka ONLINE. */
  topRight?: ReactNode
  /** Tytuł ekranu (Fraunces 24 px); drugie słowo w <Accent>. */
  title: ReactNode
  /** Obok tytułu, po prawej. */
  aside?: ReactNode
  /** Coś przed tytułem (np. inicjał domownika). */
  before?: ReactNode
}

const palette = {
  dark: { bg: colors.green900, fg: colors.cream, label: colors.brass300, accent: colors.brass300 },
  night: { bg: colors.green900, fg: colors.cream, label: colors.brass300, accent: colors.brass300 },
  day: { bg: dayHeader.bg, fg: colors.green900, label: colors.brass700, accent: colors.brass700 },
}

/** Nagłówek ekranu: 120 px, promień 26, panorama dachów u dołu. */
export function Header({ tone = 'dark', label, back, topRight, title, aside, before }: Props) {
  const p = palette[tone]
  return (
    <header
      style={{
        position: 'relative',
        height: sizes.headerHeight,
        borderRadius: radii.header,
        background: p.bg,
        color: p.fg,
        overflow: 'hidden',
        flex: 'none',
        ['--accent' as string]: p.accent,
      }}
    >
      <Roofs tone={tone} />
      <div
        style={{
          position: 'relative',
          height: '100%',
          padding: back ? '6px 14px 16px 8px' : '14px 14px 16px 18px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            minHeight: back ? 44 : 28,
          }}
        >
          {back ? (
            <Link
              to={back.to}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2,
                minHeight: 44,
                padding: '0 10px 0 4px',
                color: p.label,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '1.6px',
                textDecoration: 'none',
              }}
            >
              <ChevronLeftIcon />
              {back.label}
            </Link>
          ) : (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '1.6px',
                color: p.label,
              }}
            >
              {label}
            </span>
          )}
          {topRight}
        </div>
        <div
          style={{
            paddingLeft: back ? 10 : 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {before}
            <h1
              style={{
                margin: 0,
                fontFamily: fonts.serif,
                fontSize: 24,
                lineHeight: 1.1,
                fontWeight: 500,
              }}
            >
              {title}
            </h1>
          </span>
          {aside}
        </div>
      </div>
    </header>
  )
}

/** Wyróżnione słowo w tytule: kursywa w kolorze akcentu nagłówka. */
export function Accent({ children }: { children: ReactNode }) {
  return <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>{children}</em>
}

export const RIDGE_FAR =
  'M0 56V34L26 18L52 34V28L84 8L116 28V34L142 20L168 34V26L204 4L240 26V32L268 16L296 32V26L326 10L358 28V56Z'
export const RIDGE_NEAR =
  'M0 56V46L36 30L72 46V42L108 26L144 42V48L180 36L216 48V42L256 24L296 42V46L330 34L358 44V56Z'

/** Panorama dachów (dwie warstwy + okienka), słońce lub księżyc. Szerokość dopasowana do ekranu. */
export function Roofs({ tone }: { tone: HeaderTone }) {
  const day = tone === 'day'
  return (
    <svg
      width="100%"
      height="120"
      viewBox="0 0 358 120"
      preserveAspectRatio="xMidYMax slice"
      fill="none"
      aria-hidden="true"
      style={{ position: 'absolute', left: 0, top: 0 }}
    >
      {tone === 'night' && (
        <>
          <circle cx="318" cy="62" r="12" fill={colors.brass300} />
          <circle cx="323" cy="58" r="10.5" fill={colors.green900} />
          <circle cx="282" cy="52" r="1.3" fill={colors.brass300} />
          <circle cx="344" cy="40" r="1.2" fill={colors.brass300} />
        </>
      )}
      {day && (
        <>
          <g stroke={dayHeader.sun} strokeWidth="2.5" strokeLinecap="round">
            <path d="M318 40v5" />
            <path d="M318 79v5" />
            <path d="M296 62h5" />
            <path d="M335 62h5" />
            <path d="M302.5 46.5l3.5 3.5" />
            <path d="M330 74l3.5 3.5" />
            <path d="M302.5 77.5l3.5-3.5" />
            <path d="M330 50l3.5-3.5" />
          </g>
          <circle cx="318" cy="62" r="11" fill={dayHeader.sun} />
        </>
      )}
      <g transform="translate(0,64)">
        <path d={RIDGE_FAR} fill={day ? dayHeader.roofsFar : colors.green800} />
        <path d={RIDGE_NEAR} fill={day ? dayHeader.roofsNear : colors.green700} />
        {!day && (
          <>
            <rect x="104" y="36" width="7" height="8" rx="1.2" fill={colors.brass300} />
            <rect x="252" y="34" width="7" height="8" rx="1.2" fill={colors.brass300} />
          </>
        )}
      </g>
    </svg>
  )
}
