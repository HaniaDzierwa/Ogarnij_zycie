// Cloudflare Worker „Ogarnij życie – powiadomienia” (etap 6). Uruchamia się co minutę (cron):
// przypomnienia o godzinie z Ustawień, poranne podsumowanie o 8:00, zmiany domowników z ostatniej
// minuty, o 3:00 sprzątanie. Wysyła Web Push na telefony zapisane przy kontach.

import { accessToken, firestore, type Doc, type Firestore } from './firestore.ts'
import {
  changeMessage,
  cleanupPlan,
  CLEANUP_TIME,
  houseChanges,
  localNow,
  MORNING,
  morningFor,
  remindersFor,
  type Event,
  type Message,
  type Task,
  type User,
} from './plan.ts'
import { sendPush, type Subscription } from './webpush.ts'

export interface Env {
  FIREBASE_PROJECT_ID: string
  VAPID_PUBLIC_KEY: string
  VAPID_SUBJECT: string
  /** Sekret (Cloudflare) – nigdy w repozytorium. */
  VAPID_PRIVATE_KEY: string
  /** Sekret (Cloudflare): cała zawartość pliku JSON konta serwisowego Firebase. */
  FIREBASE_SERVICE_ACCOUNT: string
}

const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d)
const num = (v: unknown) => (typeof v === 'number' ? v : null)

export function toUser(doc: Doc): User {
  const d = doc.data
  const n = (d.notif ?? {}) as Record<string, unknown>
  return {
    uid: doc.id,
    name: str(d.name),
    houseId: typeof d.houseId === 'string' ? d.houseId : null,
    notif: {
      tasks: n.tasks !== false,
      events: n.events !== false,
      morning: n.morning !== false,
      house: n.house === true,
    },
    taskReminderTime: str(d.taskReminderTime, '18:00'),
    cleanupDays: d.cleanupDays === undefined ? 30 : num(d.cleanupDays),
  }
}

export function toTask(doc: Doc): Task & { path: string } {
  const d = doc.data
  return {
    path: doc.path,
    id: doc.id,
    title: str(d.title),
    priority: str(d.priority, 'mid'),
    due: typeof d.due === 'string' ? d.due : null,
    done: d.done === true,
    doneAt: num(d.doneAt),
    doneBy: typeof d.doneBy === 'string' ? d.doneBy : null,
    deleted: d.deleted === true,
    deletedAt: num(d.deletedAt),
    createdBy: str(d.createdBy),
    updatedBy: str(d.updatedBy),
  }
}

export function toEvent(doc: Doc): Event & { path: string } {
  const d = doc.data
  const remind = d.remind === 'day' || d.remind === 'week' ? d.remind : 'none'
  return {
    path: doc.path,
    id: doc.id,
    title: str(d.title),
    date: str(d.date),
    allDay: d.allDay !== false,
    from: typeof d.from === 'string' ? d.from : null,
    remind,
    deleted: d.deleted === true,
    deletedAt: num(d.deletedAt),
  }
}

/** Zadania i wydarzenia, które widzi domownik: wspólne domu + jego „Tylko ja”. */
async function visibleTo(db: Firestore, houseId: string, uid: string) {
  const [tasks, own, events, ownEvents] = await Promise.all([
    db.list(`houses/${houseId}/tasks`),
    db.list(`houses/${houseId}/private/${uid}/tasks`),
    db.list(`houses/${houseId}/events`),
    db.list(`houses/${houseId}/private/${uid}/events`),
  ])
  return { tasks: [...tasks, ...own].map(toTask), events: [...events, ...ownEvents].map(toEvent) }
}

/** Jedno uruchomienie dla minuty `nowMs`. `fetchFn` – podmieniane w testach. */
export async function run(nowMs: number, env: Env, fetchFn: typeof fetch = fetch) {
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT)
  const db = firestore(env.FIREBASE_PROJECT_ID, () => accessToken(sa, fetchFn), fetchFn)
  const vapid = {
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
    subject: env.VAPID_SUBJECT,
  }
  const start = Math.floor(nowMs / 60_000) * 60_000
  const { day, time } = localNow(start)

  const users = (await db.list('users')).map(toUser)
  const byUid = new Map(users.map((u) => [u.uid, u]))
  const outbox: { uid: string; message: Message }[] = []

  // 1. Przypomnienia (godzina z Ustawień) i poranne podsumowanie (8:00)
  for (const u of users) {
    if (!u.houseId) continue
    const reminders = u.taskReminderTime === time
    const morning = time === MORNING
    if (!reminders && !morning) continue
    try {
      const { tasks, events } = await visibleTo(db, u.houseId, u.uid)
      if (reminders)
        for (const m of remindersFor(u, tasks, events, day)) outbox.push({ uid: u.uid, message: m })
      if (morning) {
        const m = morningFor(u, tasks, events, day)
        if (m) outbox.push({ uid: u.uid, message: m })
      }
    } catch (e) {
      console.error('Przypomnienia', u.uid, e)
    }
  }

  // 2. Zmiany domowników z ostatniej minuty (tylko wspólne zadania)
  try {
    const from = start - 60_000
    const changed = (await db.changedSince('tasks', 'updatedAt', from))
      .map((doc) => ({ doc, m: /^houses\/([^/]+)\/tasks\/[^/]+$/.exec(doc.path) }))
      .filter((x) => x.m)
      .map(({ doc, m }) => ({ houseId: m![1], task: toTask(doc), createTime: doc.createTime }))
    for (const c of houseChanges(changed, from, start)) {
      const actor = byUid.get(c.actor)?.name || 'Domownik'
      for (const u of users)
        if (u.houseId === c.houseId && u.uid !== c.actor && u.notif.house)
          outbox.push({ uid: u.uid, message: changeMessage(actor, c.kind, c.title) })
    }
  } catch (e) {
    console.error('Zmiany domowników', e)
  }

  // 3. Wysyłka – na każdy telefon zapisany przy koncie; wygasłe subskrypcje usuwamy
  const subsOf = new Map<string, Doc[]>()
  for (const { uid, message } of outbox) {
    try {
      if (!subsOf.has(uid)) subsOf.set(uid, await db.list(`users/${uid}/push`))
      for (const s of subsOf.get(uid)!) {
        const result = await sendPush(s.data as unknown as Subscription, message, vapid, fetchFn)
        if (result === 'gone') await db.remove(s.path)
      }
    } catch (e) {
      console.error('Wysyłka', uid, e)
    }
  }

  // 4. Raz dziennie (3:00) – sprzątanie wg ustawienia założyciela domu
  if (time === CLEANUP_TIME) await cleanup(db, users, day, start)

  return { sent: outbox.length }
}

async function cleanup(db: Firestore, users: User[], day: string, now: number) {
  const houses = new Set(users.map((u) => u.houseId).filter((h): h is string => !!h))
  for (const houseId of houses) {
    try {
      const members = await db.list(`houses/${houseId}/members`)
      const owner = members.find((m) => m.data.role === 'owner')
      const cleanupDays = (owner && users.find((u) => u.uid === owner.id)?.cleanupDays) ?? 30
      const lists = await Promise.all([
        db.list(`houses/${houseId}/tasks`),
        ...members.map((m) => db.list(`houses/${houseId}/private/${m.id}/tasks`)),
      ])
      const eventLists = await Promise.all([
        db.list(`houses/${houseId}/events`),
        ...members.map((m) => db.list(`houses/${houseId}/private/${m.id}/events`)),
      ])
      const plan = cleanupPlan(
        lists.flat().map(toTask),
        eventLists.flat().map(toEvent),
        day,
        cleanupDays,
      )
      for (const path of plan.toTrash)
        await db.update(path, { deleted: true, deletedAt: new Date(now), deletedBy: 'sprzatanie' })
      for (const path of plan.toDelete) await db.remove(path)
    } catch (e) {
      console.error('Sprzątanie', houseId, e)
    }
  }
}

export default {
  async scheduled(
    controller: { scheduledTime: number },
    env: Env,
    ctx: { waitUntil: (p: Promise<unknown>) => void },
  ) {
    ctx.waitUntil(run(controller.scheduledTime, env))
  },
}
