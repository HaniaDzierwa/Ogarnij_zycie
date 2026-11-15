import { useState } from 'react'
import { ConfirmDialog } from './ui.tsx'

type What = 'zadanie' | 'wydarzenie'
/** Przy powtarzaniu (etap 8): „Tylko to – …” obok usunięcia całości. */
type OnlyThis = { label: string; run: () => void }
type Pending = { what: What; title: string; run: () => void; only?: OnlyThis }

/**
 * Pytanie „Usunąć zadanie?” / „Usunąć wydarzenie?” przed przeniesieniem do kosza
 * (gest w lewo i „Usuń” w arkuszu). Zwraca `ask` i okienko do wstawienia w ekran.
 * Z `only` – zadanie / wydarzenie cykliczne: „Tylko to” · „Całe powtarzanie” / „Wszystkie powtórki”.
 */
export function useConfirmDelete() {
  const [pending, setPending] = useState<Pending | null>(null)

  const ask = (what: What, title: string, run: () => void, only?: OnlyThis) =>
    setPending({ what, title, run, only })

  const close = (fn: () => void) => () => {
    setPending(null)
    fn()
  }

  const dialog =
    pending &&
    (pending.only ? (
      <ConfirmDialog
        title={`Usunąć ${pending.what}?`}
        message={<>„{pending.title}” się powtarza. Co usunąć? Usunięte trafi do kosza na 30 dni.</>}
        alt={{ label: pending.only.label, onClick: close(pending.only.run) }}
        confirmLabel={pending.what === 'zadanie' ? 'Całe powtarzanie' : 'Wszystkie powtórki'}
        danger
        onCancel={() => setPending(null)}
        onConfirm={close(pending.run)}
      />
    ) : (
      <ConfirmDialog
        title={`Usunąć ${pending.what}?`}
        message={<>„{pending.title}” trafi do kosza. Możesz je przywrócić przez 30 dni.</>}
        confirmLabel="Usuń"
        danger
        onCancel={() => setPending(null)}
        onConfirm={close(pending.run)}
      />
    ))

  return { ask, dialog }
}
