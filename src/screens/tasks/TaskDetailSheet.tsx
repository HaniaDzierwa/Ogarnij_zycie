import { useEffect, useRef, useState } from 'react'
import {
  DetailActions,
  DetailTopBar,
  DiscardDialog,
  InfoRow,
  NoteText,
} from '../../components/DetailSheet.tsx'
import { Box, Dot, Sheet } from '../../components/ui.tsx'
import { CheckIcon, RepeatIcon, UndoIcon } from '../../components/icons.tsx'
import { repeatSummary } from '../../data/repeat.ts'
import { DueBadge } from '../../components/DueBadge.tsx'
import { type DateKey } from '../../data/dates.ts'
import { priorityOf } from '../../data/selectors.ts'
import { plural } from '../../data/plural.ts'
import { TOAST_MS, useStore } from '../../data/store.ts'
import { taskEditOf, type TaskEdit } from '../../data/taskOps.ts'
import type { Category, Task } from '../../data/types.ts'
import { colors, fonts, noCategory } from '../../theme'
import {
  draftChanged,
  emptyPhotoDraft,
  type PhotoDraft,
  type TaskPhoto,
} from '../../photos/draft.ts'
import { PhotoViewer } from './PhotoViewer.tsx'
import { useTaskPhotos } from './PhotosField.tsx'
import { DoneBox, SubtaskToggle } from './TaskRow.tsx'
import { TaskForm } from './TaskForm.tsx'

type Props = {
  task: Task
  categories: Category[]
  today: DateKey
  /** „DO ZROBIENIA · ZAKUPY” / „OGARNIĘTE · 9:10” */
  status: string
  /** „Dodane: Hania” / „Ogarnięte: Hania” */
  meta: string
  /** „Zapisz” w trybie edycji. */
  onSave: (edit: TaskEdit) => void
  onToggleDone: () => void
  /** Odhaczenie kroku – działa też w trybie odczytu (to ogarnianie, nie edycja). */
  onToggleSub: (subId: string) => void
  onTrash: () => void
  onClose: () => void
}

/**
 * Arkusz zadania (ZadaniaArkusz.dc.html): najpierw do odczytu (odhaczanie kroków, „Ogarnij”,
 * „Usuń”); „Edytuj” → edycja z „Zapisz” u góry; zamknięcie z niezapisanymi zmianami pyta
 * „Odrzucić zmiany?” (uwagi Hani 2026-10-25).
 */
export function TaskDetailSheet({
  task,
  categories,
  today,
  status,
  meta,
  onSave,
  onToggleDone,
  onToggleSub,
  onTrash,
  onClose,
}: Props) {
  const { priorities: prioList, photos: photoStore, members, showUndo, currentUid } = useStore()
  // null – tryb odczytu; w edycji: kopia robocza i stan z chwili rozpoczęcia
  const [draft, setDraft] = useState<TaskEdit | null>(null)
  const [base, setBase] = useState<TaskEdit | null>(null)
  const [discard, setDiscard] = useState<'close' | 'cancel' | null>(null)
  // zdjęcia (etap 9): zapisane na żywo + zmiany z edycji (zapis dopiero przy „Zapisz”)
  const allPhotos = useTaskPhotos(task)
  const [photoDraft, setPhotoDraft] = useState<PhotoDraft>(emptyPhotoDraft)
  // usunięte z podglądu – ukryte od razu, z bazy znikają po czasie paska „Cofnij”
  const [hidden, setHidden] = useState<string[]>([])
  const savedPhotos = allPhotos.filter((p) => !hidden.includes(p.id))
  const latestPhotos = useRef(allPhotos)
  useEffect(() => {
    latestPhotos.current = allPhotos
  }, [allPhotos])
  const [viewer, setViewer] = useState<number | null>(null)
  const deletePhoto = (p: TaskPhoto) => {
    let cancelled = false
    const restore = () => {
      cancelled = true
      setHidden((h) => h.filter((id) => id !== p.id))
    }
    setHidden((h) => [...h, p.id])
    setTimeout(() => {
      if (!cancelled) photoStore.save(task, latestPhotos.current, { added: [], removed: [p.id] })
    }, TOAST_MS)
    showUndo('Usunięto zdjęcie', restore)
    return restore
  }
  const authorOf = (p: TaskPhoto) =>
    `dodane: ${members.find((m) => m.uid === p.createdBy)?.name ?? 'domownik'}`
  const editing = draft !== null
  const dirty =
    editing && (JSON.stringify(draft) !== JSON.stringify(base) || draftChanged(photoDraft))

  const startEdit = () => {
    const e = taskEditOf(task)
    setDraft(e)
    setBase(e)
  }
  const stopEdit = () => {
    setDraft(null)
    setBase(null)
    setPhotoDraft(emptyPhotoDraft)
  }
  const save = () => {
    if (!draft?.title.trim()) return
    onSave({ ...draft, title: draft.title.trim(), note: draft.note.trim() })
    if (draftChanged(photoDraft))
      photoStore.save({ ...task, private: draft.private }, savedPhotos, photoDraft)
    // „Kto widzi” zmienione – zdjęcia przechodzą razem z zadaniem (bez tych usuniętych w edycji)
    if (draft.private !== task.private) {
      const keep = savedPhotos.filter((p) => !photoDraft.removed.includes(p.id))
      if (keep.length)
        void photoStore
          .move(keep, draft.private ? currentUid : undefined)
          .catch((e) => console.error('Nie udało się przenieść zdjęć', e))
    }
    stopEdit()
  }
  const requestClose = () => (dirty ? setDiscard('close') : onClose())
  const cancelEdit = () => (dirty ? setDiscard('cancel') : stopEdit())

  const prio = priorityOf(prioList, task.priority)
  const category = categories.find((c) => c.id === task.categoryId)
  const subDone = task.subtasks.filter((s) => s.done).length

  return (
    <Sheet open onClose={requestClose} confirmClose={dirty} label="Zadanie">
      <DetailTopBar
        status={status}
        editing={editing}
        canSave={!!draft?.title.trim()}
        onEdit={startEdit}
        onSave={save}
        onCancel={cancelEdit}
      />

      {draft ? (
        <TaskForm
          mode="edit"
          value={draft}
          onChange={(fn) => setDraft((d) => (d ? fn(d) : d))}
          categories={categories}
          today={today}
          authorUid={task.createdBy}
          onSubmit={save}
          photos={{ saved: savedPhotos, draft: photoDraft, onDraft: setPhotoDraft }}
        />
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={onToggleDone}
              aria-label={task.done ? 'Przywróć do „Do zrobienia”' : 'Oznacz jako ogarnięte'}
              style={{
                width: 44,
                height: 44,
                flex: 'none',
                padding: 0,
                border: 0,
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {task.done ? <DoneBox size={28} /> : <Box color={prio.line} size={28} />}
            </button>
            <h2
              style={{
                margin: 0,
                flex: 1,
                minWidth: 0,
                fontFamily: fonts.serif,
                fontSize: 24,
                fontWeight: 500,
                lineHeight: 1.2,
                color: task.done ? colors.muted : colors.green900,
                textDecoration: task.done ? 'line-through' : 'none',
                overflowWrap: 'anywhere',
              }}
            >
              {task.title}
            </h2>
          </div>

          <div>
            <InfoRow label="KATEGORIA">
              <Dot color={category?.color ?? noCategory.color} />
              {category?.name ?? noCategory.name}
            </InfoRow>
            <InfoRow label="PRIORYTET">
              <Box color={prio.line} size={14} />
              {prio.label}
            </InfoRow>
            <InfoRow label="TERMIN">
              {task.due ? (
                <DueBadge due={task.due} today={today} week={task.dueWeek} done={task.done} />
              ) : (
                'Bez terminu'
              )}
            </InfoRow>
            {task.repeat && task.due && !task.done && (
              <InfoRow label="POWTARZA SIĘ">
                <RepeatIcon size={15} />
                {repeatSummary(task.repeat, task.due)}
              </InfoRow>
            )}
            <InfoRow label="KTO WIDZI">{task.private ? 'Tylko ja' : 'Wspólne'}</InfoRow>
          </div>

          {task.subtasks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div
                style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '1.4px',
                    color: colors.muted,
                  }}
                >
                  KROKI
                </span>
                <span
                  style={{
                    fontFamily: fonts.serif,
                    fontStyle: 'italic',
                    fontSize: 14,
                    color: colors.brass700,
                  }}
                >
                  {subDone} z {task.subtasks.length}
                </span>
              </div>
              {task.subtasks.map((s) => (
                <div key={s.id} style={{ display: 'flex', paddingLeft: 4 }}>
                  <SubtaskToggle title={s.title} done={s.done} onToggle={() => onToggleSub(s.id)} />
                </div>
              ))}
            </div>
          )}

          <NoteText text={task.note} />

          {savedPhotos.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div
                style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '1.4px',
                    color: colors.muted,
                  }}
                >
                  ZDJĘCIA
                </span>
                <span
                  style={{
                    fontFamily: fonts.serif,
                    fontStyle: 'italic',
                    fontSize: 14,
                    color: colors.brass700,
                  }}
                >
                  {savedPhotos.length} {plural(savedPhotos.length, ['zdjęcie', 'zdjęcia', 'zdjęć'])}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                {savedPhotos.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setViewer(i)}
                    aria-label={`Otwórz zdjęcie ${i + 1} z ${savedPhotos.length}`}
                    style={{
                      width: 104,
                      height: 104,
                      flex: 'none',
                      padding: 0,
                      border: 0,
                      borderRadius: 14,
                      overflow: 'hidden',
                      background: colors.sand,
                    }}
                  >
                    <img
                      src={p.tileUrl}
                      alt=""
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          <DetailActions
            onDelete={onTrash}
            primary={{
              label: task.done ? 'Przywróć' : 'Ogarnij',
              icon: task.done ? <UndoIcon size={16} /> : <CheckIcon size={16} />,
              onClick: () => {
                onClose()
                onToggleDone()
              },
            }}
          />
        </>
      )}

      <span style={{ fontSize: 12, color: colors.muted, textAlign: 'center' }}>{meta}</span>

      {viewer !== null && (
        <PhotoViewer
          photos={savedPhotos}
          start={viewer}
          title={task.title}
          author={authorOf}
          onDelete={deletePhoto}
          onChangeKind={
            task.repeat
              ? (p) =>
                  void photoStore
                    .changeKind(
                      task,
                      latestPhotos.current,
                      p,
                      p.kind === 'series' ? 'task' : 'series',
                    )
                    .catch((e) => console.error('Nie udało się przenieść zdjęcia', e))
              : undefined
          }
          onClose={() => setViewer(null)}
        />
      )}

      {discard && (
        <DiscardDialog
          what="zadaniu"
          onKeep={() => setDiscard(null)}
          onDiscard={() => {
            const then = discard
            setDiscard(null)
            stopEdit()
            if (then === 'close') onClose()
          }}
        />
      )}
    </Sheet>
  )
}
