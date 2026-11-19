/** Teks tampilan halaman Badan (murni, gampang dites). Hitungan angka ada di badan.js. */
import { BLN, BULAN, HARI, HR, addDays, weekdayOf } from './agenda.js'
import { fmt } from './badan.js'

/** "17 Nov" */
export const dShort = (date) => `${Number(date.slice(8))} ${BLN[Number(date.slice(5, 7)) - 1]}`

/** "Sen, 17 Nov" */
export const dDay = (date) => `${HR[weekdayOf(date)]}, ${dShort(date)}`

/** "Senin, 17 November" */
export const dLong = (date) => `${HARI[weekdayOf(date)]}, ${Number(date.slice(8))} ${BULAN[Number(date.slice(5, 7)) - 1]}`

/** "06:42" → "06.42" */
export const jam = (hhmm) => (hhmm ? hhmm.replace(':', '.') : '')

/** "hari ini" / "kemarin" / "Sen, 17 Nov" relatif ke tanggal hari ini (WIB). */
export function dayWord(date, today) {
  if (date === today) return 'hari ini'
  if (date === addDays(today, -1)) return 'kemarin'
  return dDay(date)
}

/** Sub-judul header: "Cutting · timbang terakhir hari ini, 06.42" (tanpa target: tanpa arah). */
export function headerSub(arahName, lastOn, lastAt, today) {
  const t = `timbang terakhir ${dayWord(lastOn, today)}${lastAt ? `, ${jam(lastAt)}` : ''}`
  return arahName ? `${arahName} · ${t}` : t
}

/** Judul baris riwayat: "Hari ini" / "Kemarin" / "Sen, 17 Nov". */
export function rowTitle(date, today) {
  const w = dayWord(date, today)
  return w === 'hari ini' ? 'Hari ini' : w === 'kemarin' ? 'Kemarin' : w
}

/** Selisih rata-rata (pembulatan `dec`) → { dir: 'up'|'down'|'flat', text } atau null kalau nggak ada. */
export function deltaView(delta, dec) {
  if (delta == null) return null
  const v = Number(delta.toFixed(dec))
  return { dir: v > 0 ? 'up' : v < 0 ? 'down' : 'flat', text: fmt(Math.abs(v), dec) }
}

/** Posisi (0–100) di bar kisaran; bar dilebarin dikit di kiri-kanan kisaran + nampung nilainya. */
export function rangeScale(min, max, now) {
  const pad = Math.max(1, (max - min) / 3)
  const lo = Math.floor(Math.min(min - pad, now - 0.5))
  const hi = Math.ceil(Math.max(max + pad, now + 0.5))
  const pos = (v) => Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100))
  return { lo, hi, pos }
}
