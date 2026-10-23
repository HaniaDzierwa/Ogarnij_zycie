// Wspólne części ekranów Ustawienia → Kategorie i Ustawienia → Priorytety.

import { useState, type ReactNode } from 'react'
import { ChevronRightIcon, TrashIcon } from '../../components/icons.tsx'
import { ConfirmDialog, Sheet } from '../../components/ui.tsx'
import { useBufferedText } from '../../components/useBufferedText.ts'
import { colors, fonts, priorities } from '../../theme'
import { ColorPicker } from '../tasks/NewCategoryForm.tsx'

/** Wiersz listy: znak koloru, nazwa, opis WERSALIKAMI; z `onClick` – przycisk ze strzałką. */
export function ItemRow({
  mark,
  name,
  meta,
  onClick,
  last,
}: {
  mark: ReactNode
  name: string
  meta: string
  onClick?: () => void
  last?: boolean
}) {
  const content = (
    <>
      <span style={{ width: 24, display: 'flex', justifyContent: 'center', flex: 'none' }}>
        {mark}
      </span>
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </span>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1px', color: colors.muted }}>
          {meta}
        </span>
      </span>
      {onClick && (
        <span style={{ color: colors.brass500, display: 'flex' }}>
          <ChevronRightIcon />
        </span>
      )}
    </>
  )
  const style = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    minHeight: 64,
    padding: '10px 16px',
    border: 0,
    borderBottom: last ? 'none' : `1px solid ${colors.line}`,
    background: 'transparent',
    color: colors.green900,
    textAlign: 'left',
  } as const
  return onClick ? (
    <button type="button" onClick={onClick} style={style}>
      {content}
    </button>
  ) : (
    <div style={style}>{content}</div>
  )
}

/**
 * Arkusz edycji kategorii / własnego priorytetu: nazwa (zapis po chwili), kolor, dodatkowe pola
 * (`children`) i „Usuń” – zablokowane, dopóki są przypięte zadania (decyzja Hani 2026-10-20).
 */
export function EditSheet({
  kind,
  name,
  color,
  taskCount,
  blockedHint,
  onRename,
  onColor,
  onDelete,
  onClose,
  children,
}: {
  kind: 'kategoria' | 'priorytet'
  name: string
  color: string
  taskCount: number
  /** Co zrobić, żeby dało się usunąć, np. „Przenieś je najpierw do innej kategorii.” */
  blockedHint: string
  onRename: (name: string) => void
  onColor: (color: string) => void
  onDelete: () => void
  onClose: () => void
  children?: ReactNode
}) {
  // pusta nazwa nie trafia do bazy – po wyjściu z pola wraca poprzednia
  const title = useBufferedText(name, (v) => {
    if (v.trim()) onRename(v.trim())
  })
  const [confirming, setConfirming] = useState(false)
  const close = () => {
    if (title.text.trim()) title.flush()
    else title.discard()
    onClose()
  }
  const what = kind === 'kategoria' ? 'kategorię' : 'priorytet'
  const blocked = taskCount > 0

  return (
    <Sheet open onClose={close} label={kind === 'kategoria' ? 'Kategoria' : 'Priorytet'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Label htmlFor="nazwa-elementu">NAZWA</Label>
          <input
            id="nazwa-elementu"
            type="text"
            maxLength={40}
            value={title.text}
            onChange={(e) => title.change(e.target.value)}
            onBlur={(e) => (e.target.value.trim() ? title.flush() : title.discard())}
            style={{
              height: 48,
              border: `1px solid ${colors.border}`,
              borderRadius: 14,
              padding: '0 14px',
              fontFamily: fonts.serif,
              fontSize: 22,
              color: colors.green900,
              background: colors.white,
              outlineColor: colors.green900,
              minWidth: 0,
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Label>KOLOR</Label>
          <ColorPicker
            label={kind === 'kategoria' ? 'Kolor kategorii' : 'Kolor priorytetu'}
            value={color}
            onChange={onColor}
          />
        </div>
        {children}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 }}>
          <button
            type="button"
            disabled={blocked}
            onClick={() => setConfirming(true)}
            style={{
              height: 48,
              border: `1px solid ${blocked ? colors.border : priorities.high.line}`,
              borderRadius: 24,
              background: colors.white,
              color: blocked ? colors.muted : priorities.high.line,
              fontSize: 15,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: blocked ? 0.6 : 1,
            }}
          >
            <TrashIcon size={18} />
            Usuń {what}
          </button>
          {blocked && (
            <span style={{ fontSize: 13, lineHeight: 1.45, color: colors.muted }}>
              Nie można usunąć – przypięte zadania: {taskCount}. {blockedHint}
            </span>
          )}
        </div>
      </div>
      {confirming && (
        <ConfirmDialog
          title={kind === 'kategoria' ? 'Usunąć kategorię?' : 'Usunąć priorytet?'}
          message={`„${name}” zniknie z listy.`}
          confirmLabel="Usuń"
          danger
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false)
            title.discard()
            onDelete()
          }}
        />
      )}
    </Sheet>
  )
}

export function Label({ children, htmlFor }: { children: string; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.4px', color: colors.muted }}
    >
      {children}
    </label>
  )
}

/** Napis w prawym górnym rogu nagłówka, np. „KATEGORIE”. */
export function TopLabel({ children }: { children: string }) {
  return (
    <span
      style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.2px', color: colors.onDarkMuted2 }}
    >
      {children}
    </span>
  )
}
