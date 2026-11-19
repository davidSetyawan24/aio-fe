/** Form timbangan Badan (isi manual / ubah / hasil baca gambar): baca ketikan, cek, jadi payload. Murni, gampang dites. */
import { BULAN } from './agenda.js'
import { METRIC_KEYS, METRICS } from './badan.js'

/** Angka yang biasa tampil bulat — "1.650" di sini ribuan, bukan 1,65. */
const THOUSANDS = new Set(['bmr', 'score', 'visceral'])

/** Ketikan → angka. Kosong → null, ngaco → NaN. Koma = desimal (titik = ribuan); tanpa koma, titik = desimal. */
export function parseNum(text, key) {
  let s = String(text ?? '').replace(/\s+/g, '')
  if (!s) return null
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if (THOUSANDS.has(key) && /^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
  return /^\d*\.?\d+$|^\d+\.$/.test(s) ? Number(s) : NaN
}

const MONTH_NAMES = BULAN.map((b) => b.toLowerCase())
const pad = (n) => String(n).padStart(2, '0')

/** "19 November" / "19 Nov" / "19/11" / "19-11-2025" → 'YYYY-MM-DD' (tahun ngikut `year` kalau nggak ditulis). Nggak kebaca → null. */
export function parseDate(text, year) {
  const s = String(text ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
  let d, m, y
  let hit = /^(\d{1,2})[ /.-](\d{1,2})(?:[ /.-](\d{4}))?$/.exec(s)
  if (hit) [, d, m, y] = hit
  else if ((hit = /^(\d{1,2}) ([a-z]+)(?: (\d{4}))?$/.exec(s))) {
    d = hit[1]
    y = hit[3]
    const idx = MONTH_NAMES.findIndex((n) => n === hit[2] || (hit[2].length >= 3 && n.startsWith(hit[2])))
    if (idx < 0) return null
    m = idx + 1
  } else return null
  d = Number(d)
  m = Number(m)
  y = Number(y ?? year)
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
  return `${y}-${pad(m)}-${pad(d)}`
}

/** "06.12" / "6:12" / "0612" → '06:12'. Nggak kebaca → null. */
export function parseTime(text) {
  const hit = /^(\d{1,2})(?:[.:](\d{2})|(\d{2}))$/.exec(String(text ?? '').trim())
  if (!hit) return null
  const h = Number(hit[1])
  const m = Number(hit[2] ?? hit[3])
  return h > 23 || m > 59 ? null : `${pad(h)}:${pad(m)}`
}

/** 'YYYY-MM-DD' → "17 November" (tahun cuma ditulis kalau bukan tahun ini). */
export function dateText(date, today) {
  const base = `${Number(date.slice(8))} ${BULAN[Number(date.slice(5, 7)) - 1]}`
  return date.slice(0, 4) === today.slice(0, 4) ? base : `${base} ${date.slice(0, 4)}`
}

const timeText = (hhmm) => hhmm.replace(':', '.')
/** Angka buat diketik ulang: koma desimal, tanpa titik ribuan. */
const numText = (v, key) => {
  if (typeof v !== 'number' || !Number.isFinite(v)) return ''
  const dec = METRICS[key].dec
  return v.toLocaleString('id-ID', { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: false })
}
const blankValues = () => Object.fromEntries(METRIC_KEYS.map((k) => [k, '']))
const nowTime = (now) => `${pad(Math.floor(now.minutes / 60))}.${pad(now.minutes % 60)}`

/** Isian awal Isi manual: hari ini + jam sekarang (WIB), angka kosong. `now` = { date, minutes } dari `wibNow()`. */
export const blankForm = (now) => ({ date: dateText(now.date, now.date), time: nowTime(now), values: blankValues(), bodyType: '' })

/** Timbangan dari server → isian form (ubah). */
export function fromWeighing(w, today) {
  return {
    date: dateText(w.weighedOn, today),
    time: w.weighedAt ? timeText(w.weighedAt) : '',
    values: Object.fromEntries(METRIC_KEYS.map((k) => [k, numText(w[k], k)])),
    bodyType: w.bodyType ?? '',
  }
}

/** Hasil baca gambar → isian form. Tanggal & jam dari gambar kalau ada, kalau nggak = sekarang. */
export function fromRead(read, now) {
  return {
    date: dateText(read.weighedOn ?? now.date, now.date),
    time: read.weighedAt ? timeText(read.weighedAt) : nowTime(now),
    values: Object.fromEntries(METRIC_KEYS.map((k) => [k, numText(read[k], k)])),
    bodyType: read.bodyType ?? '',
  }
}

/** Pesan per kolom ({} = aman). `today` = 'YYYY-MM-DD' WIB. */
export function formErrors(form, today) {
  const out = {}
  const date = parseDate(form.date, Number(today.slice(0, 4)))
  if (!date) out.date = 'Tanggalnya nggak kebaca. Contoh: 19 November.'
  else if (date > today) out.date = 'Tanggalnya belum kejadian.'
  if (!parseTime(form.time)) out.time = 'Jamnya nggak kebaca. Contoh: 07.15.'
  for (const k of METRIC_KEYS) {
    const v = parseNum(form.values[k], k)
    if (v === null) {
      if (k === 'weight') out.weight = 'Beratnya wajib diisi.'
    } else if (Number.isNaN(v)) out[k] = 'Isi angka aja ya.'
    else if (v < METRICS[k].min || v > METRICS[k].max) out[k] = `Di luar rentang wajar (${METRICS[k].min}–${METRICS[k].max}).`
  }
  return out
}

/** Isian (udah lolos `formErrors`) → badan request. */
export function toPayload(form, source, today) {
  return {
    weighedOn: parseDate(form.date, Number(today.slice(0, 4))),
    weighedAt: parseTime(form.time),
    ...Object.fromEntries(METRIC_KEYS.map((k) => [k, parseNum(form.values[k], k)])),
    bodyType: form.bodyType || null,
    source,
  }
}
