// Wspólne części arkusza zadania i arkusza wydarzenia: najpierw do odczytu, „Edytuj” w prawym
// górnym rogu przełącza w edycję z wyraźnym „Zapisz” (uwaga Hani 2026-10-25).

import type { ReactNode } from 'react'
import { colors, priorities } from '../theme'
import { CheckIcon, PencilIcon, TrashIcon } from './icons.tsx'
import { useSheetClose } from './sheetClose.ts'
import { ConfirmDialog } from './ui.tsx'

/** Górny pasek: odczyt – opis + „Edytuj”; edycja – „Anuluj” + „Zapisz”. */
export function DetailTopBar({
  status,
  editing,
  canSave,
  onEdit,
  onSave,
  onCancel,
}: {
  status: string
  editing: boolean
  canSave: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: -4,
      }}
    >
      {editing ? (
        <button
          type="button"
          onClick={onCancel}
          style={{
            height: 40,
            padding: '0 12px 0 0',
            border: 0,
            background: 'transparent',
            color: colors.muted2,
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          Anuluj
        </button>
      ) : (
        <span
          style={{
            minWidth: 0,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '1.6px',
            color: colors.brass700,
          }}
        >
          {status}
        </span>
      )}
      {editing ? (
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          style={{
            height: 42,
            padding: '0 20px',
            border: 0,
            borderRadius: 21,
            background: colors.green900,
            color: colors.cream,
            fontSize: 16,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flex: 'none',
            boxShadow: '0 4px 12px rgba(31,61,46,0.25)',
            opacity: canSave ? 1 : 0.45,
          }}
        >
          <span style={{ color: colors.brass300, display: 'flex' }}>
            <CheckIcon size={18} />
          </span>
          Zapisz
        </button>
      ) : (
        <button
          type="button"
          onClick={onEdit}
          style={{
            height: 40,
            padding: '0 16px',
            border: `1.5px solid ${colors.green900}`,
            borderRadius: 20,
            background: colors.white,
            color: colors.green900,
            fontSize: 15,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flex: 'none',
          }}
        >
          <PencilIcon />
          Edytuj
        </button>
      )}
    </div>
  )
}

/** Wiersz do odczytu: etykieta WERSALIKAMI po lewej, wartość po prawej. */
export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        minHeight: 44,
        borderBottom: `1px solid ${colors.line}`,
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.4px', color: colors.muted }}>
        {label}
      </span>
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 15,
          fontWeight: 700,
          color: colors.green900,
          textAlign: 'right',
        }}
      >
        {children}
      </span>
    </div>
  )
}

/** Notatka do odczytu (tylko gdy jest). */
export function NoteText({ text }: { text: string }) {
  if (!text.trim()) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.4px', color: colors.muted }}>
        NOTATKA
      </span>
      <p
        style={{
          margin: 0,
          fontSize: 15,
          lineHeight: 1.45,
          color: colors.green900,
          whiteSpace: 'pre-wrap',
        }}
      >
        {text}
      </p>
    </div>
  )
}

/**
 * Dół arkusza (tylko w odczycie): mniejsze „Usuń” i główna akcja (Ogarnij / Przywróć / Gotowe) –
 * ta zamyka arkusz zjazdem w dół i dopiero potem działa.
 */
export function DetailActions({
  onDelete,
  primary,
}: {
  onDelete: () => void
  primary: { label: string; icon: ReactNode; onClick: () => void }
}) {
  const close = useSheetClose()
  const base = {
    height: 44,
    borderRadius: 22,
    fontSize: 14,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  } as const
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 8, marginTop: 2 }}>
      <button
        type="button"
        onClick={onDelete}
        style={{
          ...base,
          border: '1px solid #E7B8A8',
          background: colors.white,
          color: priorities.high.line,
        }}
      >
        <TrashIcon size={16} />
        Usuń
      </button>
      <button
        type="button"
        onClick={() => close(primary.onClick)}
        style={{ ...base, border: 0, background: colors.green900, color: colors.cream }}
      >
        <span style={{ color: colors.brass300, display: 'flex' }}>{primary.icon}</span>
        {primary.label}
      </button>
    </div>
  )
}

/** „Odrzucić zmiany?” – zamknięcie albo „Anuluj” w edycji, gdy coś zmieniono. */
export function DiscardDialog({
  what,
  onKeep,
  onDiscard,
}: {
  what: 'zadaniu' | 'wydarzeniu'
  onKeep: () => void
  onDiscard: () => void
}) {
  return (
    <ConfirmDialog
      title="Odrzucić zmiany?"
      message={`Zmiany w tym ${what} nie zostaną zapisane.`}
      confirmLabel="Odrzuć"
      danger
      onCancel={onKeep}
      onConfirm={onDiscard}
    />
  )
}
