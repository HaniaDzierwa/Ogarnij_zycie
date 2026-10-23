import { Chip, Segmented } from '../../components/ui.tsx'
import type { Category, PriorityDef } from '../../data/types.ts'
import { colors } from '../../theme'
import { showsOf, type GroupBy, type Show } from './tasksView.ts'

/**
 * Panel filtrów: Pokaż, Kategoria, Grupuj – tylko filtrowanie. Kategorie i priorytety zmienia się
 * w Ustawieniach (decyzja Hani 2026-10-20: edycja w filtrach była nieintuicyjna).
 */
export function FiltersPanel({
  show,
  onShow,
  category,
  onCategory,
  categories,
  counts,
  groupBy,
  onGroupBy,
  priorities,
}: {
  show: Show
  onShow: (s: Show) => void
  category: string
  onCategory: (id: string) => void
  categories: Category[]
  counts: Record<string, number>
  groupBy: GroupBy
  onGroupBy: (g: GroupBy) => void
  priorities: PriorityDef[]
}) {
  const list = [{ id: 'all', name: 'Wszystko' }, ...categories]

  return (
    <div
      id="panel-filtrow"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 14,
        borderRadius: 20,
        background: colors.white,
        boxShadow: '0 6px 20px rgba(31,61,46,0.08)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Label>POKAŻ</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {showsOf(priorities).map((o) => (
            <Chip key={o.id} on={show === o.id} onClick={() => onShow(o.id)}>
              {o.name}
            </Chip>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Label>KATEGORIA</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {list.map((c) => (
            <Chip key={c.id} on={category === c.id} onClick={() => onCategory(c.id)}>
              {c.name} <span style={{ opacity: 0.65, fontWeight: 600 }}>{counts[c.id] ?? 0}</span>
            </Chip>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Label>GRUPUJ</Label>
        <Segmented
          label="Grupuj"
          value={groupBy}
          onChange={onGroupBy}
          options={[
            { id: 'cat', name: 'Kategorie' },
            { id: 'prio', name: 'Priorytet' },
          ]}
        />
      </div>
    </div>
  )
}

function Label({ children }: { children: string }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.4px', color: colors.muted }}>
      {children}
    </span>
  )
}

export function TextButton({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 32,
        padding: '0 8px',
        border: 0,
        background: 'transparent',
        color: colors.brass700,
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: '0.6px',
      }}
    >
      {children}
    </button>
  )
}
