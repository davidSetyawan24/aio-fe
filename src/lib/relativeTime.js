const DAY_MS = 24 * 60 * 60 * 1000
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

/** "aktif sekarang / hari ini / kemarin / N hari lalu" — dihitung per tanggal kalender (waktu lokal). */
export function activeLabel(lastUsedAt, now = new Date(), current = false) {
  if (current) return 'aktif sekarang'
  const days = Math.round((startOfDay(now) - startOfDay(new Date(lastUsedAt))) / DAY_MS)
  if (days <= 0) return 'aktif hari ini'
  if (days === 1) return 'aktif kemarin'
  return `aktif ${days} hari lalu`
}

const dayFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

/** "14 Nov 2026" */
export const formatDay = (value) => dayFormat.format(new Date(value)).replace(/\./g, '')
