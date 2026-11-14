// Odczyt na żywo, który przeżywa wyścig z własnym zapisem (uwaga Hani 2026-11-14).

const isDenied = (e: unknown) =>
  typeof e === 'object' && e !== null && (e as { code?: unknown }).code === 'permission-denied'

/**
 * Zakłada odczyt (`subscribe`). Gdy serwer odpowie „brak dostępu”, bo odczyt dotarł przed naszym
 * zapisem (np. nowy dom jeszcze nie istnieje), czeka na zapisy (`waitWrites`) i raz zakłada go
 * od nowa. Inny błąd albo drugi „brak dostępu” → `onFail`. Zwraca funkcję kończącą odczyt.
 */
export function listenAfterWrites(
  subscribe: (onError: (e: unknown) => void) => () => void,
  onFail: (e: unknown) => void,
  waitWrites: () => Promise<void>,
): () => void {
  let unsub = () => {}
  let stopped = false
  let retried = false
  const start = () => {
    unsub = subscribe((e) => {
      if (stopped) return
      if (retried || !isDenied(e)) return onFail(e)
      retried = true
      waitWrites().then(
        () => !stopped && start(),
        () => !stopped && onFail(e),
      )
    })
  }
  start()
  return () => {
    stopped = true
    unsub()
  }
}
