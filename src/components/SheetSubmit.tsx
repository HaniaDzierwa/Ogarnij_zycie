import type { ReactNode } from 'react'
import { useSheetClose } from './sheetClose.ts'
import { PrimaryButton } from './ui.tsx'

/**
 * Główny przycisk arkusza „Nowe …” („Dodaj zadanie”, „Dodaj do kalendarza”): gdy formularz jest
 * gotowy – arkusz zjeżdża, a po animacji zapisujemy; inaczej – sam `onSubmit` (nic nie zamyka).
 */
export function SheetSubmit({
  ready,
  onSubmit,
  children,
}: {
  ready: boolean
  onSubmit: () => void
  children: ReactNode
}) {
  const close = useSheetClose()
  return (
    <PrimaryButton onClick={() => (ready ? close(onSubmit) : onSubmit())}>{children}</PrimaryButton>
  )
}
