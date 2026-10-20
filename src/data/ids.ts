/**
 * Nowy identyfikator: litera rodzaju + czas + losowa końcówka (np. „t…” zadanie, „e…” wydarzenie).
 * Rośnie z czasem (lista ułożona wg id = kolejność dodania) i nie powtórzy się na dwóch telefonach.
 */
export function newId(prefix: string): string {
  const time = Date.now().toString(36).padStart(9, '0')
  const rand = Math.random().toString(36).slice(2, 8).padEnd(6, '0')
  return `${prefix}${time}${rand}`
}
