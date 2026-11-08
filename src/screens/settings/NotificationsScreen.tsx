import { Fragment } from 'react'
import { paths } from '../../app/screens.ts'
import { Accent, Header } from '../../components/Header.tsx'
import { TabBar } from '../../components/TabBar.tsx'
import { Card, Screen, ToggleRow } from '../../components/ui.tsx'
import { useStore } from '../../data/store.ts'
import type { NotificationSettings } from '../../data/types.ts'
import { PushStatusRow } from '../../push/PushStatusRow.tsx'
import { usePush } from '../../push/usePush.ts'
import { TopLabel } from './manage.tsx'
import { SummarySettings } from './SummarySettings.tsx'

/**
 * Ustawienia → Powiadomienia (osobny ekran jak Domownicy – decyzja Hani 2026-11-08):
 * na tym telefonie, podsumowania o wybranych godzinach, zmiany od domowników.
 */
export function NotificationsScreen() {
  const store = useStore()
  const { notifications, members, currentUid } = store
  const other = members.find((m) => m.uid !== currentUid)

  // powiadomienia na tym telefonie – zgoda przy włączaniu przełącznika (decyzja Hani 2026-10-18)
  const push = usePush()
  // podsumowania o wybranych godzinach + zmiany od domowników (decyzje Hani 2026-10-30)
  const notifs: { id: keyof NotificationSettings; name: string; hint: string }[] = [
    {
      id: 'morning',
      name: 'Podsumowania',
      hint: 'Co pilne, terminy i wydarzenia – o wybranych godzinach',
    },
    {
      id: 'house',
      name: 'Zmiany od domowników',
      hint: other ? `Gdy ${other.name} coś doda lub ogarnie` : 'Gdy domownik coś doda lub ogarnie',
    },
  ]

  return (
    <Screen>
      <Header
        back={{ to: paths.ustawienia, label: 'USTAWIENIA' }}
        topRight={<TopLabel>POWIADOMIENIA</TopLabel>}
        title={
          <>
            Powiadomienia <Accent>po swojemu</Accent>
          </>
        }
      />

      <Card radius={22}>
        <PushStatusRow push={push} />
        {notifs.map((n, i) => (
          <Fragment key={n.id}>
            <ToggleRow
              name={n.name}
              hint={n.hint}
              on={notifications[n.id]}
              onToggle={() => {
                const turnOn = !notifications[n.id]
                store.setNotifications((s) => ({ ...s, [n.id]: !s[n.id] }))
                if (turnOn && push.state === 'off') push.enable()
              }}
              last={i === notifs.length - 1}
            />
            {n.id === 'morning' && notifications.morning && <SummarySettings />}
          </Fragment>
        ))}
      </Card>

      <TabBar active="ustawienia" />
    </Screen>
  )
}
