/** Bayar Rutin: label, chip, dan hitungan kecil buat form (status/telat/ringkasan dihitung server). */
import { BLN, BULAN } from './agenda.js'

export const HOURS = ['09:00', '12:00', '15:00', '18:00', '21:00']
export const DAY_PRESETS = [0, 1, 3, 7]
export const MAX_REMINDERS = 3
export const MAX_OFFSET = 30
export const DEFAULT_REMINDERS = Object.freeze([
  Object.freeze({ offset: 3, time: '09:00' }),
  Object.freeze({ offset: 0, time: '09:00' }),
])
export const BILL_EMOJIS = [
  '🎬', '🎧', '▶️', '☁️', '🏠', '🛵', '🚗', '📶', '💡', '💧', '🌐', '🛡️',
  '📱', '🎮', '📚', '🏋️', '💳', '🎓', '⛽', '🧾', '🐱', '🏥', '🎁', '🔁',
]

const pad = (n) => String(n).padStart(2, '0')

export const hourLabel = (time) => time.replace(':', '.')
export const dayOffsetLabel = (offset) => (offset === 0 ? 'Hari H' : `H-${offset}`)
export const reminderLabel = (r) => `${dayOffsetLabel(r.offset)} · ${hourLabel(r.time)}`
export const reminderKey = (r) => `${r.offset}:${r.time}`
/** Yang paling jauh dulu (H-7 → Hari H), lalu jam. */
export const sortReminders = (list) => [...list].sort((a, b) => b.offset - a.offset || a.time.localeCompare(b.time))

export const scheduleText = (bill) => (bill.freq === 'yearly' ? `Tiap tahun ${bill.day} ${BLN[bill.month - 1]}` : `Tiap bulan tgl ${bill.day}`)
export const shortDue = (date) => `${Number(date.slice(8))} ${BLN[Number(date.slice(5, 7)) - 1]}`
export const monthLabel = (period) => `${BULAN[Number(period.slice(5)) - 1]} ${period.slice(0, 4)}`

export function addMonth(period, n) {
  const [y, m] = period.split('-').map(Number)
  const i = y * 12 + (m - 1) + n
  return `${Math.floor(i / 12)}-${pad((i % 12) + 1)}`
}

/** Chip di kanan baris: Lunas (hijau) / Telat (merah) / ≤ 3 hari lagi (kuning). */
export function dueChip(row) {
  if (row.status === 'paid') return { text: 'Lunas', tone: 'green' }
  if (row.status === 'late') return { text: `Telat ${row.lateDays} hari`, tone: 'red' }
  if (row.daysLeft === 0) return { text: 'Hari ini', tone: 'amber' }
  if (row.daysLeft === 1) return { text: 'Besok', tone: 'amber' }
  if (row.daysLeft <= 3) return { text: `${row.daysLeft} hari lagi`, tone: 'amber' }
  return null
}

// --- Salinan persis BE `bill-math.ts` (dueDate, firstPeriod, needsPaidAnswer) buat kotak kuning di form. ---

/** Tanggal X di bulan itu; bulan pendek → tanggal terakhirnya. */
export function dueDate(day, period) {
  const [y, m] = period.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return `${period}-${pad(Math.min(day, last))}`
}

export function firstPeriod(freq, month, today) {
  const current = today.slice(0, 7)
  if (freq === 'monthly' || month == null) return current
  const year = Number(today.slice(0, 4))
  return month >= Number(today.slice(5, 7)) ? `${year}-${pad(month)}` : `${year + 1}-${pad(month)}`
}

const isPeriod = (bill, period) => period >= bill.startMonth && (bill.freq === 'monthly' || Number(period.slice(5)) === bill.month)

/** Periode bulan ini jatuh temponya udah lewat → tanya "udah lunas?". */
export function needsPaidAnswer(bill, today) {
  const current = today.slice(0, 7)
  return isPeriod(bill, current) && dueDate(bill.day, current) < today
}
