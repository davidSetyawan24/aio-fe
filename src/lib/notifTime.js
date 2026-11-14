const DAY_MS = 24 * 60 * 60 * 1000
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
const daysAgo = (value, now) => Math.round((startOfDay(now) - startOfDay(new Date(value))) / DAY_MS)

/** Grup di halaman Notifikasi: Hari ini / Kemarin / Minggu ini / Lebih lama (per tanggal kalender). */
export function dayGroup(value, now = new Date()) {
  const days = daysAgo(value, now)
  if (days <= 0) return 'Hari ini'
  if (days === 1) return 'Kemarin'
  if (days < 7) return 'Minggu ini'
  return 'Lebih lama'
}

const clock = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
const weekday = new Intl.DateTimeFormat('id-ID', { weekday: 'short' })
const dayMonth = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' })

/** Jam buat hari ini & kemarin ("08.05"), nama hari minggu ini ("Rab"), selebihnya tanggal ("3 Nov"). */
export function timeLabel(value, now = new Date()) {
  const date = new Date(value)
  const days = daysAgo(date, now)
  if (days <= 1) return clock.format(date).replace(':', '.')
  if (days < 7) return weekday.format(date).replace(/\./g, '')
  return dayMonth.format(date).replace(/\./g, '')
}

/** Angka di lonceng: kosong kalau 0, maksimal "9+". */
export const badgeText = (n) => (n <= 0 ? '' : n > 9 ? '9+' : String(n))
