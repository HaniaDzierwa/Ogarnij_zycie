import { useState } from 'react'
import { ConfirmDialog } from './ui.tsx'

type What = 'zadanie' | 'wydarzenie'
type Pending = { what: What; title: string; run: () => void }

/**
 * Pytanie „Usunąć zadanie?” / „Usunąć wydarzenie?” przed przeniesieniem do kosza
 * (gest w lewo i „Usuń” w arkuszu). Zwraca `ask` i okienko do wstawienia w ekran.
 */
export function useConfirmDelete() {
  const [pending, setPending] = useState<Pending | null>(null)

  const ask = (what: What, title: string, run: () => void) => setPending({ what, title, run })

  const dialog = pending && (
    <ConfirmDialog
      title={`Usunąć ${pending.what}?`}
      message={<>„{pending.title}” trafi do kosza. Możesz je przywrócić przez 30 dni.</>}
      confirmLabel="Usuń"
      danger
      onCancel={() => setPending(null)}
      onConfirm={() => {
        setPending(null)
        pending.run()
      }}
    />
  )

  return { ask, dialog }
}
