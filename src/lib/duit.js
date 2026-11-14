/** Duit (catat duit keluar): baca nominal, label hari/bulan, kelompok per hari, saran "buat apa". */

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const HARI_PENDEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

/** Ambil digitnya doang ("Rp 18,000" → 18000). Kosong / bukan angka → 0. */
export function parseAmount(text) {
  const digits = String(text ?? '').replace(/\D/g, '')
  return digits ? Number(digits) : 0
}

export const formatAmount = (n) => (n ? n.toLocaleString('id-ID') : '')

/** Tanggal kalender 'YYYY-MM-DD' dihitung tanpa zona waktu (jam 12 siang UTC biar aman). */
const asDate = (date) => new Date(`${date}T12:00:00Z`)
function addDays(date, n) {
  const d = asDate(date)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export const weekdayShort = (date) => HARI_PENDEK[asDate(date).getUTCDay()]

/** 'Sabtu, 14 Nov' */
export function longDay(date) {
  const d = asDate(date)
  return `${HARI[d.getUTCDay()]}, ${d.getUTCDate()} ${BULAN_PENDEK[d.getUTCMonth()]}`
}

export function dayLabel(date, today) {
  if (date === today) return 'Hari ini'
  if (date === addDays(today, -1)) return 'Kemarin'
  const year = date.slice(0, 4) === today.slice(0, 4) ? '' : ` ${date.slice(0, 4)}`
  return `${longDay(date)}${year}`
}

/** Catatan (udah urut terbaru dulu dari server) → [{ date, label, total, items }]. */
export function groupByDay(expenses, today) {
  const groups = []
  for (const e of expenses) {
    let g = groups.at(-1)
    if (!g || g.date !== e.spentOn) groups.push((g = { date: e.spentOn, label: dayLabel(e.spentOn, today), total: 0, items: [] }))
    g.total += e.amount
    g.items.push(e)
  }
  return groups
}

/** Saran "buat apa": kosong → yang terbaru; ada isinya → yang mengandung teks itu (yang persis sama dibuang). */
export function filterSuggestions(list, query, max = 6) {
  const q = (query ?? '').trim().toLowerCase()
  if (!q) return list.slice(0, max)
  return list.filter((s) => s.note.toLowerCase().includes(q) && s.note.toLowerCase() !== q).slice(0, max)
}

export function prevMonth(month) {
  const [y, m] = month.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}

/** '2026-10' → 'Oktober' (tahun ikut kalau beda sama bulan acuan). */
export function monthName(month, current = month) {
  const [y, m] = month.split('-')
  return `${BULAN[Number(m) - 1]}${y === current.slice(0, 4) ? '' : ` ${y}`}`
}

/** Tanggal hari ini versi device (cadangan sebelum ringkasan dari server dateng). */
export function localToday(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}
