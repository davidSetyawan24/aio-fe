/** Agenda: tanggal (string 'YYYY-MM-DD', kalender WIB dari server), label, pengingat, berulang. */

export const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
export const HR = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
export const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
export const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
/** Urutan hari di layar: minggu mulai Senin. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

const utc = (date) => {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}
const fmt = (d) => d.toISOString().slice(0, 10)

export function addDays(date, n) {
  const d = utc(date)
  d.setUTCDate(d.getUTCDate() + n)
  return fmt(d)
}
export const weekdayOf = (date) => utc(date).getUTCDay()
export const daysBetween = (a, b) => Math.round((utc(b) - utc(a)) / 86_400_000)
export const monthStart = (date) => `${date.slice(0, 7)}-01`
export function addMonths(date, n) {
  const d = utc(monthStart(date))
  d.setUTCMonth(d.getUTCMonth() + n)
  return fmt(d)
}

export const weekStart = (date) => addDays(date, -((weekdayOf(date) + 6) % 7))
export const weekDates = (date) => Array.from({ length: 7 }, (_, i) => addDays(weekStart(date), i))

/** Grid kalender bulan: dari Senin sebelum tgl 1, minggu terakhir yang isinya bulan depan semua dibuang. */
export function monthCells(date) {
  const first = monthStart(date)
  const start = weekStart(first)
  const cells = []
  for (let week = 0; week < 6; week++) {
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, week * 7 + i))
    if (week > 0 && days[0].slice(0, 7) !== first.slice(0, 7)) break
    cells.push(...days)
  }
  return cells
}

/** Strip tanggal HP: 7 hari dengan `date` di tengah (3 ke belakang, 3 ke depan). */
export const stripAround = (date) => Array.from({ length: 7 }, (_, i) => addDays(date, i - 3))

/**
 * Rentang yang diminta ke server per tampilan. Bulan (dan Hari di PC — ada kalender kecil) = 6 minggu penuh.
 * Hari di HP = 7 hari strip mulai `stripStart` (kalau ada).
 */
export function rangeFor(view, date, wide, stripStart) {
  if (view === 'month' || (view === 'day' && wide)) {
    const start = weekStart(monthStart(date))
    return { from: start, to: addDays(start, 41) }
  }
  if (view === 'day' && stripStart) return { from: stripStart, to: addDays(stripStart, 6) }
  const from = weekStart(date)
  return { from, to: addDays(from, 6) }
}

export const dayTitle = (date) => `${HARI[weekdayOf(date)]}, ${Number(date.slice(8))} ${BLN[Number(date.slice(5, 7)) - 1]}`
export const shortDate = (date) => `${HR[weekdayOf(date)]} ${Number(date.slice(8))} ${BLN[Number(date.slice(5, 7)) - 1]}`
export const monthName = (date) => BULAN[Number(date.slice(5, 7)) - 1]
export function relLabel(date, today) {
  const n = daysBetween(today, date)
  if (n === 0) return 'Hari ini'
  if (n === 1) return 'Besok'
  if (n === -1) return 'Kemarin'
  return shortDate(date)
}

export function reminderLabel(r) {
  if (r.type === 'day') return `${r.offset === 0 ? 'Hari itu' : 'H-1'} ${r.time}`
  const m = r.minutes
  if (m === 0) return 'Pas mulai'
  if (m % 1440 === 0) return `${m / 1440} hari sebelum`
  if (m < 60) return `${m} mnt sebelum`
  return m % 60 ? `${Math.floor(m / 60)} jam ${m % 60} mnt sebelum` : `${m / 60} jam sebelum`
}
export const reminderKey = (r) => (r.type === 'before' ? `before:${r.minutes}` : `day:${r.offset}:${r.time}`)
export const MAX_REMINDERS = 3
/** Pilihan cepet "+ Tambah". */
export const EVENT_PRESETS = [0, 10, 30, 60, 1440].map((minutes) => ({ type: 'before', minutes }))
export const DAY_PRESETS = [
  { type: 'day', offset: 0, time: '08:00' },
  { type: 'day', offset: 0, time: '12:00' },
  { type: 'day', offset: -1, time: '20:00' },
]
/** Acara baru langsung keisi satu pengingat. */
export const defaultReminders = (allDay) => (allDay ? [{ type: 'day', offset: -1, time: '20:00' }] : [{ type: 'before', minutes: 30 }])

export const NO_REPEAT = Object.freeze({ freq: 'none', days: [], until: null })
const REPEAT_NAMES = { daily: 'Tiap hari', monthly: 'Tiap bulan', yearly: 'Tiap tahun' }
export function repeatLabel(repeat) {
  if (!repeat || repeat.freq === 'none') return ''
  const base = repeat.freq === 'weekly' ? `Tiap ${WEEK_ORDER.filter((d) => repeat.days.includes(d)).map((d) => HR[d]).join(', ')}` : REPEAT_NAMES[repeat.freq]
  return repeat.until ? `${base} s.d. ${shortDate(repeat.until)}` : base
}
export const isRecurring = (item) => Boolean(item?.repeat && item.repeat.freq !== 'none')

/** Lokasi diketik manual → pencarian Google Maps (gratis, tanpa kunci). */
export const mapsUrl = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`

export { localToday } from './duit.js'
