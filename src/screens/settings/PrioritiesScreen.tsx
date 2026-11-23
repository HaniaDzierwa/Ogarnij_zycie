import { useState } from 'react'
import { paths } from '../../app/screens.ts'
import { Accent, Header } from '../../components/Header.tsx'
import { SortableList } from '../../components/SortableList.tsx'
import { TabBar } from '../../components/TabBar.tsx'
import { Box, Card, Screen } from '../../components/ui.tsx'
import { newId } from '../../data/ids.ts'
import { orderAfter } from '../../data/selectors.ts'
import { useStore } from '../../data/store.ts'
import { NewCategoryButton, NewCategoryForm } from '../tasks/NewCategoryForm.tsx'
import { deletePriority, movePriority, tasksMeta, tasksWithPriority } from '../tasks/tasksView.ts'
import { EditSheet, ItemRow, TopLabel } from './manage.tsx'

/**
 * Ustawienia → Priorytety: wbudowane Pilne · Ważne · Przy okazji (bez zmian, nie do usunięcia,
 * stałe miejsca) i własne priorytety domu – nazwa, kolor, miejsce w kolejności przeciąganiem
 * za uchwyt ⋮⋮ (nowy trafia na koniec); własny usuwa się tylko bez przypiętych zadań
 * (decyzje Hani 2026-10-20).
 */
export function PrioritiesScreen() {
  const store = useStore()
  const { tasks, priorities } = store
  const [editId, setEditId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const editing = store.customPriorities.find((p) => p.id === editId)

  const update = (id: string, change: { name?: string; color?: string }) =>
    store.setCustomPriorities((list) => list.map((p) => (p.id === id ? { ...p, ...change } : p)))

  return (
    <Screen>
      <Header
        back={{ to: paths.ustawienia, label: 'USTAWIENIA' }}
        topRight={<TopLabel>PRIORYTETY</TopLabel>}
        title={
          <>
            Priorytety <Accent>zadań</Accent>
          </>
        }
      />

      <Card radius={22}>
        <SortableList
          items={priorities}
          canDrag={(p) => !p.builtIn}
          onMove={(id, to) =>
            store.setCustomPriorities((list) => movePriority(priorities, list, id, to))
          }
          handleLabel={(p) => `Przesuń: ${p.label}`}
          renderItem={(p) => (
            <ItemRow
              mark={<Box color={p.line} size={18} />}
              name={p.label}
              meta={
                p.builtIn
                  ? `WBUDOWANY · ${tasksMeta(tasksWithPriority(tasks, p.id))}`
                  : tasksMeta(tasksWithPriority(tasks, p.id))
              }
              onClick={p.builtIn ? undefined : () => setEditId(p.id)}
              last
            />
          )}
        />
      </Card>

      {adding ? (
        <NewCategoryForm
          id="nowy-priorytet"
          title="NAZWA NOWEGO PRIORYTETU"
          placeholder="np. Na weekend, Kiedyś"
          submitLabel="Dodaj priorytet"
          colorLabel="Kolor priorytetu"
          onCancel={() => setAdding(false)}
          onAdd={(name, color) => {
            // na koniec – potem można go przeciągnąć
            store.setCustomPriorities((list) => [
              ...list,
              {
                id: newId('p'),
                name,
                color,
                order: orderAfter(priorities, priorities.at(-1)?.id ?? null),
              },
            ])
            setAdding(false)
          }}
        />
      ) : (
        <div>
          <NewCategoryButton onClick={() => setAdding(true)}>+ Nowy priorytet</NewCategoryButton>
        </div>
      )}

      {editing && (
        <EditSheet
          key={editing.id}
          kind="priorytet"
          name={editing.name}
          color={editing.color}
          taskCount={tasksWithPriority(tasks, editing.id)}
          blockedHint="Przenieś je najpierw na inny priorytet."
          onRename={(name) => update(editing.id, { name })}
          onColor={(color) => update(editing.id, { color })}
          onDelete={() => {
            const done = deletePriority(store.customPriorities, tasks, editing.id)
            store.setCustomPriorities(() => done.custom)
            store.setTasks(() => done.tasks)
            setEditId(null)
          }}
          onClose={() => setEditId(null)}
        />
      )}

      <TabBar active="ustawienia" />
    </Screen>
  )
}
