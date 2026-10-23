import { useState } from 'react'
import { paths } from '../../app/screens.ts'
import { Accent, Header } from '../../components/Header.tsx'
import { TabBar } from '../../components/TabBar.tsx'
import { Card, Dot, Screen } from '../../components/ui.tsx'
import { newId } from '../../data/ids.ts'
import { useStore } from '../../data/store.ts'
import { NewCategoryButton, NewCategoryForm } from '../tasks/NewCategoryForm.tsx'
import { deleteCategory, tasksMeta, tasksWithCategory } from '../tasks/tasksView.ts'
import { EditSheet, ItemRow, TopLabel } from './manage.tsx'

/**
 * Ustawienia → Kategorie: lista kategorii z liczbą zadań, zmiana nazwy i koloru, „+ Nowa kategoria”,
 * usuwanie tylko pustej kategorii (decyzja Hani 2026-10-20; zadania z Kosza → „Bez kategorii”).
 */
export function CategoriesScreen() {
  const store = useStore()
  const { tasks } = store
  const categories = [...store.categories].sort((a, b) => a.order - b.order)
  const [editId, setEditId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const editing = categories.find((c) => c.id === editId)

  const update = (id: string, change: { name?: string; color?: string }) =>
    store.setCategories((list) => list.map((c) => (c.id === id ? { ...c, ...change } : c)))

  return (
    <Screen>
      <Header
        back={{ to: paths.ustawienia, label: 'USTAWIENIA' }}
        topRight={<TopLabel>KATEGORIE</TopLabel>}
        title={
          <>
            Kategorie <Accent>zadań</Accent>
          </>
        }
      />

      <Card radius={22}>
        {categories.map((c, i) => (
          <ItemRow
            key={c.id}
            mark={<Dot color={c.color} size={14} />}
            name={c.name}
            meta={tasksMeta(tasksWithCategory(tasks, c.id))}
            onClick={() => setEditId(c.id)}
            last={i === categories.length - 1}
          />
        ))}
        {categories.length === 0 && (
          <ItemRow mark={null} name="Brak kategorii" meta="DODAJ PIERWSZĄ PONIŻEJ" last />
        )}
      </Card>

      {adding ? (
        <NewCategoryForm
          id="nowa-kategoria-ustawienia"
          onCancel={() => setAdding(false)}
          onAdd={(name, color) => {
            store.setCategories((list) => [
              ...list,
              {
                id: newId('k'),
                name,
                color,
                order: Math.max(-1, ...list.map((c) => c.order)) + 1,
              },
            ])
            setAdding(false)
          }}
        />
      ) : (
        <div>
          <NewCategoryButton onClick={() => setAdding(true)} />
        </div>
      )}

      {editing && (
        <EditSheet
          key={editing.id}
          kind="kategoria"
          name={editing.name}
          color={editing.color}
          taskCount={tasksWithCategory(tasks, editing.id)}
          blockedHint="Przenieś je najpierw do innej kategorii."
          onRename={(name) => update(editing.id, { name })}
          onColor={(color) => update(editing.id, { color })}
          onDelete={() => {
            const after = deleteCategory(store.categories, tasks, editing.id)
            store.setCategories(() => after.categories)
            store.setTasks(() => after.tasks)
            setEditId(null)
          }}
          onClose={() => setEditId(null)}
        />
      )}

      <TabBar active="ustawienia" />
    </Screen>
  )
}
