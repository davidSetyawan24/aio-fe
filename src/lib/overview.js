/** Tab Uang: teks "Perlu diurus", chip perbandingan bulan, keterangan batang Rekap harian. Angka dihitung server. */
import { longDay, monthName } from './duit.js'
import { shortDue } from './bayarRutin.js'
import { rp } from './wallet.js'

/** Persen dibulatin; total 0 → 0. */
export const pct = (part, total) => (total ? Math.round((part / total) * 100) : 0)

const whenText = (daysLeft) => (daysLeft === 0 ? 'hari ini' : daysLeft === 1 ? 'besok' : `${daysLeft} hari lagi`)

/** Kunci unik item Perlu diurus (buat tanda "barusan dicentang"). */
export function attentionKey(item) {
  if (item.kind === 'bill') return `bill:${item.billId}:${item.period}`
  if (item.kind === 'card') return `card:${item.sourceId}:${item.dueOn}`
  return `budget:${item.categoryId}`
}

/** Judul + keterangan berwarna satu item Perlu diurus. `daysLeft` = sisa hari bulan ini (buat budget). */
export function attentionText(item, daysLeft) {
  if (item.kind === 'bill') {
    const when = item.status === 'late' ? `telat ${item.lateDays} hari` : whenText(item.daysLeft)
    return { title: item.name, sub: `Bayar rutin · ${when} · ${rp(item.amount)}`, tone: item.status === 'late' ? 'red' : 'amber' }
  }
  if (item.kind === 'card') {
    if (item.lateDays > 0) return { title: `Tagihan ${item.name}`, sub: `Kartu kredit · telat ${item.lateDays} hari`, tone: 'red' }
    return { title: `Tagihan ${item.name}`, sub: `Kartu kredit · jatuh tempo ${whenText(item.daysLeft)}`, tone: 'amber' }
  }
  if (item.level === 'over') {
    return { title: `${item.name} kelewat budget`, sub: `Atur budget · kelewat ${rp(item.spent - item.budget)}`, tone: 'red' }
  }
  const days = daysLeft ? ` buat ${daysLeft} hari` : ''
  return { title: `${item.name} udah ${pct(item.spent, item.budget)}% budget`, sub: `Atur budget · sisa ${rp(item.budget - item.spent)}${days}`, tone: 'amber' }
}

/** Chip kartu hitam bulan lalu: '▼ 8% dari September'. Bulan sebelumnya kosong (null) → ''. */
export function changeLabel(change, prevMonth) {
  if (change === null || change === undefined) return ''
  const name = monthName(prevMonth)
  if (change === 0) return `sama kayak ${name}`
  return `${change < 0 ? '▼' : '▲'} ${Math.abs(change)}% dari ${name}`
}

/** Keterangan batang yang di-tap: '12 Nov · Rp160.000 · jatah Rp72.000'. */
export function dayCaption(row) {
  const jatah = row.jatah === null || row.jatah === undefined ? '' : ` · jatah ${rp(row.jatah)}`
  return `${shortDue(row.date)} · ${rp(row.total)}${jatah}`
}

/** Hari yang dibuka pas tab Rincian pertama kali: bulan ini → hari ini, bulan lalu → tanggal terakhir. */
export const defaultDay = (data) => (data.isCurrent ? data.today : data.daily.at(-1).date)

/** Judul rincian: 'Hari ini · Selasa, 24 Nov' atau 'Senin, 9 Nov'. */
export const dayTitle = (date, isToday) => (isToday ? `Hari ini · ${longDay(date)}` : longDay(date))

/** Keterangan jatah satu hari. Hari ini: sisa / kelewat. Hari lewat: hemat / pas jatah / kelewat. Tanpa budget → null. */
export function jatahNote(row, isToday) {
  if (row.jatah === null || row.jatah === undefined) return null
  const diff = row.jatah - row.total
  if (isToday) {
    return diff >= 0
      ? { jatah: row.jatah, label: `sisa ${rp(diff)}`, tone: 'good' }
      : { jatah: row.jatah, label: `kelewat ${rp(-diff)}`, tone: 'bad' }
  }
  if (diff > 0) return { jatah: row.jatah, label: `hemat ${rp(diff)}`, tone: 'good' }
  if (diff === 0) return { jatah: row.jatah, label: 'pas jatah', tone: '' }
  return { jatah: row.jatah, label: `kelewat ${rp(-diff)}`, tone: 'bad' }
}

/** Pengeluaran satu tanggal, urutan asli dipertahanin. */
export const dayExpenses = (list, date) => (list ?? []).filter((e) => e.spentOn === date)
