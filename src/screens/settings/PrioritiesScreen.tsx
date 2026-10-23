import { useState } from 'react'
import { paths } from '../../app/screens.ts'
import { Accent, Header } from '../../components/Header.tsx'
import { TabBar } from '../../components/TabBar.tsx'
import { Box, Card, Chip, Screen } from '../../components/ui.tsx'
import { newId } from '../../data/ids.ts'
import { orderAfter } from '../../data/selectors.ts'
import { useStore } from '../../data/store.ts'
import type { PriorityDef } from '../../data/types.ts'
import { NewCategoryButton, NewCategoryForm } from '../tasks/NewCategoryForm.tsx'
import { deletePriority, tasksMeta, tasksWithPriority } from '../tasks/tasksView.ts'
import { EditSheet, ItemRow, Label, TopLabel } from './manage.tsx'

/**
 * Ustawienia → Priorytety: wbudowane Pilne · Ważne · Przy okazji (bez zmian, nie do usunięcia)
 * i własne priorytety domu – nazwa, kolor, miejsce w kolejności wybierane przy tworzeniu;
 * własny usuwa się tylko bez przypiętych zadań (decyzje Hani 2026-10-20).
 */
export function PrioritiesScreen() {
  const store = useStore()
  const { tasks, priorities } = store
  const [editId, setEditId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  // nowy – domyślnie na końcu
  const [after, setAfter] = useState<string | null>(null)
  const editing = store.customPriorities.find((p) => p.id === editId)

  const update = (id: string, change: { name?: string; color?: string; order?: number }) =>
    store.setCustomPriorities((list) => list.map((p) => (p.id === id ? { ...p, ...change } : p)))

  const openAdding = () => {
    setAfter(priorities.at(-1)?.id ?? null)
    setAdding(true)
  }

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
        {priorities.map((p, i) => (
          <ItemRow
            key={p.id}
            mark={<Box color={p.line} size={18} />}
            name={p.label}
            meta={
              p.builtIn
                ? `WBUDOWANY · ${tasksMeta(tasksWithPriority(tasks, p.id))}`
                : tasksMeta(tasksWithPriority(tasks, p.id))
            }
            onClick={p.builtIn ? undefined : () => setEditId(p.id)}
            last={i === priorities.length - 1}
          />
        ))}
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
            store.setCustomPriorities((list) => [
              ...list,
              { id: newId('p'), name, color, order: orderAfter(priorities, after) },
            ])
            setAdding(false)
          }}
        >
          <PlacePicker list={priorities} after={after} onChange={setAfter} />
        </NewCategoryForm>
      ) : (
        <div>
          <NewCategoryButton onClick={openAdding}>+ Nowy priorytet</NewCategoryButton>
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
        >
          <PlacePicker
            list={priorities.filter((p) => p.id !== editing.id)}
            after={previousOf(priorities, editing.id)}
            onChange={(a) =>
              update(editing.id, {
                order: orderAfter(
                  priorities.filter((p) => p.id !== editing.id),
                  a,
                ),
              })
            }
          />
        </EditSheet>
      )}

      <TabBar active="ustawienia" />
    </Screen>
  )
}

/** Id priorytetu tuż przed danym (null – jest pierwszy). */
function previousOf(list: PriorityDef[], id: string): string | null {
  const i = list.findIndex((p) => p.id === id)
  return i > 0 ? list[i - 1].id : null
}

/** „Miejsce”: na początku albo po wybranym priorytecie. */
function PlacePicker({
  list,
  after,
  onChange,
}: {
  list: PriorityDef[]
  after: string | null
  onChange: (after: string | null) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Label>MIEJSCE</Label>
      <div
        role="group"
        aria-label="Miejsce priorytetu"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
      >
        <Chip on={after === null} onClick={() => onChange(null)}>
          Na początku
        </Chip>
        {list.map((p) => (
          <Chip key={p.id} on={after === p.id} onClick={() => onChange(p.id)}>
            Po „{p.label}”
          </Chip>
        ))}
      </div>
    </div>
  )
}
