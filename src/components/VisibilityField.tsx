import { useStore } from '../data/store.ts'
import { colors } from '../theme'
import { Segmented } from './ui.tsx'

/**
 * „Kto widzi”: „Wspólne” (wszyscy domownicy) albo „Tylko ja” (tylko autor) – przy zadaniu
 * i wydarzeniu (decyzja Hani 2026-10-25). Zmienić może tylko autor; inni widzą sam opis.
 */
export function VisibilityField({
  value,
  onChange,
  authorUid,
}: {
  /** true – „Tylko ja”. */
  value: boolean
  onChange: (isPrivate: boolean) => void
  /** Autor istniejącego zadania / wydarzenia; brak – nowe (autor to ja). */
  authorUid?: string
}) {
  const { currentUid, members } = useStore()
  const mine = !authorUid || authorUid === currentUid
  const authorName = members.find((m) => m.uid === authorUid)?.name ?? 'autor'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.4px', color: colors.muted }}>
        KTO WIDZI
      </span>
      {mine ? (
        <>
          <Segmented
            label="Kto widzi"
            size="full"
            value={value ? 'own' : 'all'}
            onChange={(v) => onChange(v === 'own')}
            options={[
              { id: 'all', name: 'Wspólne' },
              { id: 'own', name: 'Tylko ja' },
            ]}
          />
          <span style={{ fontSize: 13, lineHeight: 1.45, color: colors.muted }}>
            {value ? 'Widzisz tylko Ty – domownicy tego nie zobaczą.' : 'Widzą wszyscy domownicy.'}
          </span>
        </>
      ) : (
        <span style={{ fontSize: 14, lineHeight: 1.45, color: colors.green900 }}>
          <strong>Wspólne</strong> – widzą wszyscy domownicy. Zmienić może tylko {authorName}.
        </span>
      )}
    </div>
  )
}
