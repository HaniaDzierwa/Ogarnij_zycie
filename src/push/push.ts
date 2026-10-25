// Powiadomienia Web Push (etap 6): czy ten telefon może je dostawać, zgoda i subskrypcja.
// Wysyła je Cloudflare Worker (krok 4) na podstawie subskrypcji zapisanych przy koncie.

/** Klucz publiczny VAPID (nie jest tajny) – z .env; prywatny jest tylko w Cloudflare. */
export const VAPID_PUBLIC_KEY: string = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''

/**
 * - `unsupported` – przeglądarka nie ma powiadomień push
 * - `ios-install` – iPhone / iPad: działa tylko po dodaniu strony do ekranu głównego
 * - `denied` – zablokowane w przeglądarce
 * - `off` – można włączyć (brak zgody albo subskrypcji)
 * - `on` – ten telefon dostaje powiadomienia
 */
export type PushState = 'unsupported' | 'ios-install' | 'denied' | 'off' | 'on'

/** To, czego potrzebujemy od przeglądarki – w testach podmieniane. */
export type PushEnv = {
  userAgent: string
  platform: string
  maxTouchPoints: number
  standalone: boolean
  hasPush: boolean
  permission: NotificationPermission | null
  getSubscription: () => Promise<PushSubscription | null>
}

export function browserEnv(): PushEnv {
  const nav = navigator as Navigator & { standalone?: boolean }
  const hasPush =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  return {
    userAgent: nav.userAgent,
    platform: nav.platform,
    maxTouchPoints: nav.maxTouchPoints ?? 0,
    standalone:
      nav.standalone === true || !!window.matchMedia?.('(display-mode: standalone)').matches,
    hasPush,
    permission: 'Notification' in window ? Notification.permission : null,
    getSubscription: async () =>
      hasPush ? (await navigator.serviceWorker.ready).pushManager.getSubscription() : null,
  }
}

export function isIos(env: Pick<PushEnv, 'userAgent' | 'platform' | 'maxTouchPoints'>): boolean {
  return (
    /iPad|iPhone|iPod/.test(env.userAgent) ||
    (env.platform === 'MacIntel' && env.maxTouchPoints > 1)
  )
}

export async function pushState(env: PushEnv = browserEnv()): Promise<PushState> {
  if (isIos(env) && !env.standalone) return 'ios-install'
  if (!env.hasPush) return 'unsupported'
  if (env.permission === 'denied') return 'denied'
  if (env.permission !== 'granted') return 'off'
  return (await env.getSubscription()) ? 'on' : 'off'
}

/** Klucz VAPID (base64url) → bajty dla pushManager.subscribe. */
export function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4)
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

/** Id subskrypcji w bazie: skrót adresu (ten sam telefon = ten sam dokument). */
export async function subscriptionId(endpoint: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint))
  return [...new Uint8Array(hash)]
    .slice(0, 20)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export class PushError extends Error {
  code: 'not-configured' | 'denied' | 'unsupported' | 'ios-install' | 'failed'
  constructor(code: PushError['code']) {
    super(code)
    this.code = code
  }
}

/** Komunikat po polsku dla błędu włączania. */
export function pushErrorMessage(code: PushError['code']): string {
  switch (code) {
    case 'not-configured':
      return 'Powiadomienia nie są jeszcze skonfigurowane – działają od kroku z Cloudflare.'
    case 'denied':
      return 'Powiadomienia są zablokowane w przeglądarce. Włącz je w ustawieniach strony.'
    case 'ios-install':
      return 'Na iPhonie najpierw dodaj stronę do ekranu głównego.'
    case 'unsupported':
      return 'Ta przeglądarka nie obsługuje powiadomień.'
    default:
      return 'Nie udało się włączyć powiadomień. Spróbuj jeszcze raz.'
  }
}

/**
 * „Włącz”: zgoda przeglądarki (musi być po dotknięciu przycisku) i subskrypcja; `save` zapisuje ją
 * przy koncie. Rzuca PushError.
 */
export async function enablePush(
  save: (id: string, sub: PushSubscriptionJSON) => Promise<void>,
): Promise<void> {
  const state = await pushState()
  if (state === 'unsupported' || state === 'ios-install') throw new PushError(state)
  if (!VAPID_PUBLIC_KEY) throw new PushError('not-configured')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new PushError('denied')
  try {
    const reg = await navigator.serviceWorker.ready
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(VAPID_PUBLIC_KEY),
      }))
    await save(await subscriptionId(sub.endpoint), sub.toJSON())
  } catch {
    throw new PushError('failed')
  }
}
