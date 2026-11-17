import { HARI, isRecurring, monthName, weekdayOf } from './agenda.js'
import { shortDue } from './bayarRutin.js'
import { attentionKey, pct } from './overview.js'
import { DOC_TYPES, stateText } from './personal.js'
import { rp, rpShort } from './wallet.js'

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
  if (item.kind === 'document') return `document:${item.documentId}:${item.dateKey}`
  return attentionKey(item)
}

/** Baris to-do dari bagian Hari ini → bentuk item yang bisa dicentang store. */
export const todayTodoItem = (row) => ({ kind: 'todo', todoId: row.id, title: row.title, occurrence: row.occurrence, recurring: isRecurring(row) })

const whenText = (daysLeft) => (daysLeft === 0 ? 'hari ini' : daysLeft === 1 ? 'besok' : `${daysLeft} hari lagi`)

/** Agenda kebuka di tanggal itu (Hari). */
export const agendaDayPath = (date) => `/tabs/agenda?tanggal=${date}`

/** Tampilan satu baris Perlu diurus: ikon, teks berwarna, tombol centang (`ask`) & tujuan tap. `today` = tujuan to-do telat (Agenda hari ini). */
export function attentionView(item, today) {
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
  if (item.kind === 'document') {
    const late = item.lateDays > 0
    const date = { state: late ? 'late' : 'soon', daysLeft: item.daysLeft, lateDays: item.lateDays }
    return {
      key, emoji: DOC_TYPES[item.type].emoji, tint: DOC_TYPES[item.type].tint, title: item.title,
      sub: `${stateText(date)} · ${shortDue(item.dueOn)}`,
      tone: late ? 'red' : 'amber', ask: null, doneLabel: null, to: `/tabs/menu/data-pribadi?dokumen=${item.documentId}`,
    }
  }
  if (item.kind === 'todo') {
    return {
      key, emoji: '✅', tint: '#E4F7C4', title: item.title,
      sub: item.lateDays === 1 ? 'to-do telat dari kemarin' : `to-do telat ${item.lateDays} hari`,
      tone: 'red', ask: 'Beres?', doneLabel: 'Beres', to: agendaDayPath(today),
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

/** 60 → '1 jam', 30 → '30 mnt', 90 → '1 jam 30 mnt' */
export function durationText(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return [h ? `${h} jam` : '', m ? `${m} mnt` : ''].filter(Boolean).join(' ')
}

const toMinutes = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
const span = (e) => ({ index: e.dayIndex ?? 1, count: e.dayCount ?? 1 })

/** Kolom jam acara (sama kayak AgendaDayList). */
export function eventTime(e) {
  const { index, count } = span(e)
  const days = count > 1 ? `hari ${index}/${count}` : ''
  if (e.allDay) return { main: 'Seharian', sub: days }
  if (count > 1) return { main: index === 1 ? e.startTime : index === count ? `s.d. ${e.endTime}` : 'Seharian', sub: days }
  return { main: e.startTime, sub: e.endTime }
}

/** Lokasi dan/atau durasi; seharian & berhari-hari cuma lokasi. */
export function eventSub(e) {
  const { count } = span(e)
  const parts = [e.location]
  if (!e.allDay && count === 1) parts.push(durationText(toMinutes(e.endTime) - toMinutes(e.startTime)))
  return parts.filter(Boolean).join(' · ')
}

/** Jendela menit acara berjam di hari ini. */
export function eventWindow(e) {
  const { index, count } = span(e)
  return { start: index === 1 ? toMinutes(e.startTime) : 0, end: index === count ? toMinutes(e.endTime) : 1440 }
}

export function eventFinished(e, minutes) {
  const { index, count } = span(e)
  return !e.allDay && index === count && eventWindow(e).end <= minutes
}

/** Chip di acara berjam pertama yang belum selesai. */
export function nextChip(events, minutes) {
  const e = events.find((x) => !x.allDay && !eventFinished(x, minutes))
  if (!e) return null
  const key = `${e.id}:${e.occurrence}`
  const left = eventWindow(e).start - minutes
  if (left <= 0) return { key, text: 'Lagi jalan' }
  return { key, text: left < 60 ? `${left} mnt lagi` : `${Math.floor(left / 60)} jam lagi` }
}

/** Maks 4 baris: acara = min(nE, max(2, 4 − nT)), sisanya to-do. */
export function splitToday(events, todos) {
  const nE = Math.min(events.length, Math.max(2, 4 - todos.length))
  const nT = Math.min(todos.length, 4 - nE)
  return { events: events.slice(0, nE), todos: todos.slice(0, nT), hiddenEvents: events.length - nE, hiddenTodos: todos.length - nT }
}

export function footerText(hiddenEvents, hiddenTodos) {
  const parts = [hiddenEvents ? `${hiddenEvents} acara` : '', hiddenTodos ? `${hiddenTodos} to-do` : ''].filter(Boolean)
  return parts.length ? `${parts.join(' · ')} lagi di Agenda` : 'Buka Agenda'
}

/** Kartu hitam Duit hari ini. */
export function moneyView(money) {
  const tb = money.todayBudget
  const hasBudget = Boolean(money.budget && tb)
  const base = { spent: rp(money.total), budgetTotal: hasBudget ? rp(money.budget.total) : null, hasBudget }
  if (!hasBudget) return { ...base, label: 'Keluar hari ini', value: rp(money.todaySpent), over: false, bar: null, barOver: false }
  const over = tb.left < 0
  return {
    ...base,
    label: over ? 'Jatah hari ini kelewat' : 'Sisa jatah hari ini',
    value: over ? `−${rp(-tb.left)}` : rp(tb.left),
    over,
    bar: money.budget.total ? Math.min(100, (money.total / money.budget.total) * 100) : money.total ? 100 : 0,
    barOver: money.total > money.budget.total,
  }
}

export function owedInvoiceView(inv) {
  if (!inv.count) return { value: 'Rp0', sub: 'Udah masuk semua', tone: 'muted' }
  const value = rpShort(inv.total)
  if (inv.lateCount > 0) return { value, sub: `${inv.count} invoice · ${inv.lateCount} telat`, tone: 'red' }
  return { value, sub: `${inv.count} invoice${inv.nearestDue ? ` · terdekat ${shortDue(inv.nearestDue)}` : ''}`, tone: 'muted' }
}

export function owedSplitView(split) {
  if (!split.total) return { value: 'Rp0', sub: 'Udah balik semua' }
  return { value: rpShort(split.total), sub: `${split.people} orang` }
}

/** Layar lebar: daftar Duit (form di kanan); HP: layar Catat. */
export const catatPath = (wide) => (wide ? '/tabs/menu/duit' : '/tabs/menu/duit/catat')

/** Layar lebar: panel kanan daftar Split bill; HP: halaman bikin. */
export const splitPath = (wide) => (wide ? '/tabs/menu/split-bill?baru=1' : '/tabs/menu/split-bill/baru')

/** ≥768px: dialog To-do di Agenda; HP: halaman form. */
export const todoPath = (dialog, today) => (dialog ? '/tabs/agenda?tambah=todo' : `/tabs/agenda/baru?tanggal=${today}`)
