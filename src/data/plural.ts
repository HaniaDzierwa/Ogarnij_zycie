/** Polska odmiana po liczbie: plural(5, ['wpis', 'wpisy', 'wpisów']) → 'wpisów'. */
export function plural(n: number, [one, few, many]: [string, string, string]): string {
  if (n === 1) return one
  const d = n % 10
  const dd = n % 100
  if (d >= 2 && d <= 4 && !(dd >= 12 && dd <= 14)) return few
  return many
}
