/** Teks tampilan halaman Badan (murni, gampang dites). Hitungan angka ada di badan.js. */
import { BLN, BULAN, HARI, HR, addDays, weekdayOf } from './agenda.js'
import { fmt } from './badan.js'
import { durL } from './badanSleep.js'

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

/**
 * Sub-judul header: "Cutting · timbang terakhir hari ini, 06.42 · tidur semalem 6 j 43 m" (tanpa target: tanpa arah).
 * Bagian tidur cuma kalau `sleep` (tidur terakhir) tanggalnya hari ini. Belum ada timbangan (`lastOn` kosong) → "Belum ada timbangan yang masuk…".
 */
export function headerSub(arahName, lastOn, lastAt, today, sleep = null) {
  const slp = sleep?.sleptOn === today ? ` · tidur semalem ${durL(sleep.totalMin)}` : ''
  if (!lastOn) return `Belum ada timbangan yang masuk${slp || '.'}`
  const t = `timbang terakhir ${dayWord(lastOn, today)}${lastAt ? `, ${jam(lastAt)}` : ''}${slp}`
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

/** Judul angka rata-rata: dari < 3 timbangan nggak boleh ngaku "Rata-rata 7 hari". `count` = `summary.count`. */
export function avgLabel(count) {
  if (count >= 3) return 'Rata-rata 7 hari'
  return count === 2 ? 'Rata-rata 2 timbangan' : 'Timbangan terakhir'
}

/** Angka + satuan; kosong cuma "–" (tanpa satuan). `unit` udah sama spasinya ('%' / ' kg'). */
export const fmtU = (v, dec, unit) => (v == null || !Number.isFinite(v) ? '–' : `${fmt(v, dec)}${unit}`)

/** Tanggal timbangan yang dipakai buat nilai awal target (aturan sama kayak `startValue`): terakhir sebelum/pas mulai, kalau nggak ada → pertama sesudahnya. */
export function startOn(rows, startedOn) {
  const dates = rows.map((r) => r.weighedOn).sort()
  return dates.filter((d) => d <= startedOn).at(-1) ?? dates.find((d) => d > startedOn) ?? startedOn
}

/**
 * Cutting/Bulking yang pas pasang target udah lewat goal, terus balik keluar kisaran: hitungan kembar ngasih 100% · kurang 0.
 * Buat tampilan: progresnya mulai dari 0 & kurangnya = jarak sekarang ke goal.
 */
export function reachView(g, now) {
  if (!g || g.mode !== 'reach' || g.state !== 'progress' || g.left !== 0 || now == null) return g
  return { ...g, pct: 0, left: Math.abs(now - g.goal) }
}

/** Halaman anak Badan (detail / catat / ubah / upload) — balik dari sini nggak nge-reset grafik. */
export const isBadanChild = (path) => typeof path === 'string' && path.startsWith('/tabs/menu/badan/')

/** kg per minggu, satu nol di belakang dibuang: 0,4 · 0,55 · 1,0. */
export const kgWeek = (v) => fmt(v, 2).replace(/0$/, '')

/** '2027-02' → "Feb 2027". */
export const monthShort = (ym) => `${BLN[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`
