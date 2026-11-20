// „Zapisz na telefonie” z podglądu zdjęcia (decyzja Hani 2026-11-17): na iPhonie systemowe
// „Udostępnij → Zachowaj obraz”, gdzie indziej zwykłe pobranie pliku.

import { isIos } from '../push/push.ts'

/** Nazwa pliku: „naprawic-kran-1.webp”. */
export function photoFileName(title: string, n: number, type: string): string {
  const base =
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/ł/g, 'l')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'zdjecie'
  return `${base}-${n}.${type === 'image/webp' ? 'webp' : 'jpg'}`
}

export async function savePhotoToPhone(blob: Blob, name: string): Promise<void> {
  const file = new File([blob], name, { type: blob.type })
  const ios = isIos({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
  })
  if (ios && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return
    } catch (e) {
      // „Anuluj” w arkuszu udostępniania – nic więcej
      if (e instanceof DOMException && e.name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
