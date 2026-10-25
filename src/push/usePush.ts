import { useCallback, useEffect, useState } from 'react'
import { useStore } from '../data/store.ts'
import { enablePush, PushError, pushErrorMessage, pushState, type PushState } from './push.ts'

/** Stan powiadomień na tym telefonie i „Włącz” (zgoda + subskrypcja zapisana przy koncie). */
export function usePush() {
  const { savePushSubscription } = useStore()
  // null – jeszcze sprawdzamy
  const [state, setState] = useState<PushState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    pushState()
      .then((s) => alive && setState(s))
      .catch(() => alive && setState('unsupported'))
    return () => {
      alive = false
    }
  }, [])

  const enable = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      await enablePush(savePushSubscription)
      setState('on')
    } catch (e) {
      setError(pushErrorMessage(e instanceof PushError ? e.code : 'failed'))
      setState(await pushState().catch(() => 'unsupported' as const))
    } finally {
      setBusy(false)
    }
  }, [savePushSubscription])

  return { state, error, busy, enable }
}
