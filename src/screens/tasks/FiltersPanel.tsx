import { useState } from 'react'
import { Chip, Segmented } from '../../components/ui.tsx'
import { CloseIcon } from '../../components/icons.tsx'
import type { Category } from '../../data/types.ts'
import { colors } from '../../theme'
import { NewCategoryButton, NewCategoryForm } from './NewCategoryForm.tsx'
import { NO_CATEGORY_ID, SHOWS, type GroupBy, type Show } from './tasksView.ts'

/** Panel filtrów: Pokaż, Kategoria (z edycją i nową kategorią), Grupuj. */
export function FiltersPanel({
  show,
  onShow,
  category,
  onCategory,
  categories,
  counts,
  groupBy,
  onGroupBy,
  onAddCategory,
  onDeleteCategory,
}: {
  show: Show
  onShow: (s: Show) => void
  category: string
  onCategory: (id: string) => void
  categories: Category[]
  counts: Record<string, number>
  groupBy: GroupBy
  onGroupBy: (g: GroupBy) => void
  onAddCategory: (name: string, color: string) => void
  onDeleteCategory: (id: string) => void
}) {
  const [manage, setManage] = useState(false)
  const [adding, setAdding] = useState(false)
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
          {SHOWS.map((o) => (
            <Chip key={o.id} on={show === o.id} onClick={() => onShow(o.id)}>
              {o.name}
            </Chip>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Label>KATEGORIA</Label>
          <TextButton onClick={() => setManage((m) => !m)}>
            {manage ? 'GOTOWE' : 'EDYTUJ'}
          </TextButton>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {list.map((c) => (
            <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center' }}>
              <Chip on={category === c.id} onClick={() => onCategory(c.id)}>
                {c.name} <span style={{ opacity: 0.65, fontWeight: 600 }}>{counts[c.id] ?? 0}</span>
              </Chip>
              {manage && c.id !== 'all' && c.id !== NO_CATEGORY_ID && (
                <button
                  type="button"
                  onClick={() => onDeleteCategory(c.id)}
                  aria-label={`Usuń kategorię ${c.name}`}
                  style={{
                    width: 32,
                    height: 36,
                    border: 0,
                    background: 'transparent',
                    color: '#A4492F',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CloseIcon />
                </button>
              )}
            </span>
          ))}
          {!adding && <NewCategoryButton onClick={() => setAdding(true)} />}
        </div>
        {adding && (
          <NewCategoryForm
            id="nowa-kategoria-filtr"
            onCancel={() => setAdding(false)}
            onAdd={(name, color) => {
              onAddCategory(name, color)
              setAdding(false)
            }}
          />
        )}
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
