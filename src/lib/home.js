import { HARI, isRecurring, monthName, weekdayOf } from './agenda.js'
import { attentionKey } from './overview.js'

/** Tanggal & menit hari ini di WIB (UTC+7), apa pun zona jam HP-nya. */
export function wibNow(now = new Date()) {
  const wib = new Date(now.getTime() + 7 * 3_600_000)
  return { date: wib.toISOString().slice(0, 10), minutes: wib.getUTCHours() * 60 + wib.getUTCMinutes() }
}

export const firstName = (name) => (name ?? '').trim().split(/\s+/)[0] ?? ''

/** 04.00–10.59 Pagi, 11.00–14.59 Siang, 15.00–17.59 Sore, 18.00–03.59 Malem. */
export function greeting(minutes, name) {
  const word = minutes >= 1080 || minutes < 240 ? 'Malem' : minutes >= 900 ? 'Sore' : minutes >= 660 ? 'Siang' : 'Pagi'
  const first = firstName(name)
  return first ? `${word}, ${first} 👋` : `${word} 👋`
}

/** 'Senin, 16 November' */
export const dateLine = (date) => `${HARI[weekdayOf(date)]}, ${Number(date.slice(8))} ${monthName(date)}`

/** Kunci unik satu item Perlu diurus. */
export function homeKey(item) {
  if (item.kind === 'todo') return `todo:${item.todoId}:${item.occurrence}`
  if (item.kind === 'invoice') return `invoice:${item.invoiceId}`
  return attentionKey(item)
}

/** Baris to-do dari bagian Hari ini → bentuk item yang bisa dicentang store. */
export const todayTodoItem = (row) => ({ kind: 'todo', todoId: row.id, title: row.title, occurrence: row.occurrence, recurring: isRecurring(row) })
