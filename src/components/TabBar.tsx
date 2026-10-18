import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { paths, type Tab } from '../app/screens.ts'
import { colors, radii, shadows, sizes, tabBarFade } from '../theme'
import { CalendarIcon, HouseIcon, PlusIcon, SlidersIcon, TaskIcon } from './icons.tsx'

const tabs: { id: Tab; label: string; to: string; icon: ReactNode }[] = [
  { id: 'start', label: 'Start', to: paths.start, icon: <HouseIcon /> },
  { id: 'zadania', label: 'Zadania', to: paths.zadania, icon: <TaskIcon /> },
  { id: 'kalendarz', label: 'Kalendarz', to: paths.kalendarz, icon: <CalendarIcon /> },
  { id: 'ustawienia', label: 'Ustawienia', to: paths.ustawienia, icon: <SlidersIcon /> },
]

/** Bottom offset paska z uwzględnieniem paska systemowego iPhone'a. */
const barBottom = 'calc(20px + env(safe-area-inset-bottom))'

/**
 * Pływający dolny pasek (Start, Zadania, +, Kalendarz, Ustawienia) z kremowym wyciszeniem pod spodem
 * i menu „Co dodajesz?”. `onAddTask` / `onAddEvent` – gdy ekran sam otwiera arkusz; domyślnie przejście.
 */
export function TabBar({
  active,
  onAddTask,
  onAddEvent,
}: {
  active?: Tab
  onAddTask?: () => void
  onAddEvent?: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  const pick = (custom: (() => void) | undefined, to: string) => {
    setMenuOpen(false)
    if (custom) custom()
    else navigate(to)
  }

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          height: `calc(${sizes.tabBarFadeHeight}px + env(safe-area-inset-bottom))`,
          background: tabBarFade,
          pointerEvents: 'none',
          zIndex: 20,
        }}
      />
      <nav
        aria-label="Główna nawigacja"
        style={{
          position: 'fixed',
          left: 16,
          right: 16,
          bottom: barBottom,
          maxWidth: 448,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          alignItems: 'center',
          padding: 8,
          borderRadius: radii.tabBar,
          background: colors.green900,
          boxShadow: shadows.tabBar,
          zIndex: 21,
        }}
      >
        {tabs.slice(0, 2).map((t) => (
          <TabLink key={t.id} tab={t} active={active === t.id} />
        ))}
        <button
          type="button"
          aria-label="Dodaj"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
          style={{
            justifySelf: 'center',
            width: sizes.plusButton,
            height: sizes.plusButton,
            border: 0,
            borderRadius: sizes.plusButton / 2,
            background: colors.brass300,
            color: colors.green900,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PlusIcon />
        </button>
        {tabs.slice(2).map((t) => (
          <TabLink key={t.id} tab={t} active={active === t.id} />
        ))}
      </nav>

      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 30 }}>
          <button
            type="button"
            aria-label="Zamknij"
            onClick={() => setMenuOpen(false)}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              border: 0,
              background: 'rgba(31,61,46,0.45)',
            }}
          />
          <div
            role="menu"
            aria-label="Co dodajesz?"
            className="pop-in"
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              bottom: `calc(104px + env(safe-area-inset-bottom))`,
              width: 260,
              background: colors.creamLight,
              borderRadius: 24,
              padding: 8,
              boxShadow: shadows.popover,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <span
              style={{
                padding: '10px 12px 6px',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '1.6px',
                color: colors.brass700,
              }}
            >
              CO DODAJESZ?
            </span>
            <MenuItem
              icon={<TaskIcon size={20} />}
              iconBg={colors.successBg}
              label="Zadanie"
              onClick={() => pick(onAddTask, paths.zadaniaNowe)}
            />
            <MenuItem
              icon={<CalendarIcon size={20} />}
              iconBg="#EFE3CC"
              label="Wydarzenie w kalendarzu"
              onClick={() => pick(onAddEvent, paths.kalendarzNowe)}
            />
          </div>
        </div>
      )}
    </>
  )
}

function TabLink({ tab, active }: { tab: (typeof tabs)[number]; active: boolean }) {
  return (
    <Link
      to={tab.to}
      aria-current={active ? 'page' : undefined}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        minHeight: 52,
        fontSize: 11,
        fontWeight: active ? 800 : 700,
        letterSpacing: '0.4px',
        color: active ? colors.brass300 : colors.onDarkMuted,
        textDecoration: 'none',
      }}
    >
      {tab.icon}
      {tab.label}
      {active && (
        <span style={{ width: 4, height: 4, borderRadius: 2, background: colors.brass300 }} />
      )}
    </Link>
  )
}

function MenuItem({
  icon,
  iconBg,
  label,
  onClick,
}: {
  icon: ReactNode
  iconBg: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minHeight: 56,
        padding: '0 12px',
        border: 0,
        borderRadius: 16,
        background: 'transparent',
        color: colors.green900,
        fontSize: 16,
        fontWeight: 700,
        textAlign: 'left',
      }}
    >
      <span
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          background: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 'none',
        }}
      >
        {icon}
      </span>
      {label}
    </button>
  )
}
