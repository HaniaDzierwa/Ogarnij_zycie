import { useEffect } from 'react'
import { setThemeChoice } from '../theme/theme.ts'
import { useStore } from './store.ts'

/** Motyw z profilu konta → ekran (i pamięć telefonu, żeby przy starcie był od razu). */
export function ThemeSync() {
  const { theme } = useStore()
  useEffect(() => setThemeChoice(theme), [theme])
  return null
}
