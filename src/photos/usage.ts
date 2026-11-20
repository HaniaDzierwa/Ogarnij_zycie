// Miejsce na zdjęcia (etap 9) – opis dla Ustawień.

/** „12 MB”, „3,4 MB”, „150 MB” – po polsku, z przecinkiem. */
export function formatMB(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  const n = mb > 0 && mb < 10 ? Math.round(mb * 10) / 10 : Math.round(mb)
  return `${String(n).replace('.', ',')} MB`
}
