/** Atur budget: angka per hari, warna bar, kalimat riwayat. */
import { rpShort } from '@/lib/wallet.js'

const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

const daysInMonth = (month) => {
  const [y, m] = month.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/** Budget sebulan ≈ sehari berapa (dibagi jumlah hari bulan itu). */
export const perDay = (amount, month) => Math.round(amount / daysInMonth(month))

/** Kepake berapa persen; kuning mulai 80%, merah kalau lewat. */
export function usage(spent, budget) {
  const pct = budget ? spent / budget : 0
  return { pct, state: pct > 1 ? 'over' : pct >= 0.8 ? 'warn' : '' }
}

/** Satu baris riwayat: "budget dipasang Rp450rb" / "Rp450rb → Rp600rb" (naik/turun) / "Rp600rb → dilepas". */
export function historyText({ from, to }) {
  if (!from) return { text: `budget dipasang ${rpShort(to)}`, trend: '' }
  if (!to) return { text: `${rpShort(from)} → dilepas`, trend: '' }
  return { text: `${rpShort(from)} → ${rpShort(to)}`, trend: to > from ? 'up' : 'down' }
}

/** '2026-11-01' → '1 Nov' */
export const shortDate = (date) => `${Number(date.slice(8, 10))} ${BULAN_PENDEK[Number(date.slice(5, 7)) - 1]}`
