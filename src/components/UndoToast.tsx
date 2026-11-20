import { useStore } from '../data/store.ts'
import { colors, themed } from '../theme'

/** Pasek „… · COFNIJ” nad dolnym menu (znika po ~4,5 s). */
export function UndoToast() {
  const { toast, undo } = useStore()
  if (!toast) return null
  return (
    <div
      role="status"
      className="pop-in-up"
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 'calc(104px + env(safe-area-inset-bottom))',
        maxWidth: 448,
        margin: '0 auto',
        // nad arkuszami (40) – np. zdjęcie usunięte w arkuszu; pod pytaniami (50)
        zIndex: 45,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minHeight: 52,
        padding: '0 8px 0 18px',
        borderRadius: 18,
        background: colors.header,
        color: colors.onHeader,
        boxShadow: `0 10px 26px ${themed('rgba(31,61,46,0.3)', 'rgba(0,0,0,0.5)')}`,
      }}
    >
      <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>
        {toast.text}
      </span>
      <button
        type="button"
        onClick={undo}
        style={{
          height: 40,
          padding: '0 12px',
          border: 0,
          background: 'transparent',
          color: colors.headerAccent,
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: '1px',
        }}
      >
        COFNIJ
      </button>
    </div>
  )
}
