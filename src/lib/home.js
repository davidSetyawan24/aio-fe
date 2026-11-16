import { HARI, isRecurring, monthName, weekdayOf } from './agenda.js'
import { shortDue } from './bayarRutin.js'
import { attentionKey, pct } from './overview.js'
import { rp } from './wallet.js'

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

const whenText = (daysLeft) => (daysLeft === 0 ? 'hari ini' : daysLeft === 1 ? 'besok' : `${daysLeft} hari lagi`)

/** Tampilan satu baris Perlu diurus: ikon, teks berwarna, tombol centang (`ask`) & tujuan tap. */
export function attentionView(item) {
  const key = homeKey(item)
  if (item.kind === 'bill') {
    const late = item.status === 'late'
    return {
      key, emoji: item.emoji, tint: item.tint, title: item.name,
      sub: `${rp(item.amount)} · ${late ? `telat ${item.lateDays} hari` : `jatuh tempo ${whenText(item.daysLeft)}`}`,
      tone: late ? 'red' : 'amber', ask: 'Lunas?', doneLabel: 'Lunas', to: '/tabs/menu/bayar-rutin',
    }
  }
  if (item.kind === 'invoice') {
    const late = item.lateDays > 0
    return {
      key, emoji: '📄', tint: '#DCEBFF', title: item.client,
      sub: `${rp(item.amount)} · ${late ? `invoice telat ${item.lateDays} hari` : `jatuh tempo ${whenText(item.daysLeft)}`}`,
      tone: late ? 'red' : 'amber', ask: null, doneLabel: null, to: `/tabs/menu/invoice/${item.invoiceId}`,
    }
  }
  if (item.kind === 'todo') {
    return {
      key, emoji: '✅', tint: '#E4F7C4', title: item.title,
      sub: item.lateDays === 1 ? 'to-do telat dari kemarin' : `to-do telat ${item.lateDays} hari`,
      tone: 'red', ask: 'Beres?', doneLabel: 'Beres', to: '/tabs/agenda',
    }
  }
  if (item.kind === 'card') {
    const late = item.lateDays > 0
    const due = shortDue(item.dueOn)
    return {
      key, emoji: '💳', tint: '#F3E1FF', title: item.name,
      sub: late ? `Telat ${item.lateDays} hari · jatuh tempo ${due}` : `Jatuh tempo ${whenText(item.daysLeft)} · ${due}`,
      tone: late ? 'red' : 'amber', ask: 'Udah bayar?', doneLabel: 'Udah bayar', to: '/tabs/uang',
    }
  }
  const over = item.level === 'over'
  return {
    key, emoji: item.emoji, tint: item.tint, title: item.name,
    sub: over ? `Budget kelewat ${rp(item.spent - item.budget)}` : `Budget udah ${pct(item.spent, item.budget)}% · sisa ${rp(item.budget - item.spent)}`,
    tone: over ? 'red' : 'amber', ask: null, doneLabel: null, to: '/tabs/menu/budget',
  }
}

/** Teks toast abis centang / batal. */
export function doneToast(item, done) {
  if (!done) return 'Dibatalin'
  const word = item.kind === 'bill' ? 'lunas' : item.kind === 'card' ? 'udah bayar' : 'beres'
  const name = item.kind === 'todo' ? item.title : item.name
  return `${name} · ${word} ✓`
}
