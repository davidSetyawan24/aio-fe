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

const pad = (n) => String(n).padStart(2, '0')

/** 'YYYY-MM-DD' → "17 November" (tahun cuma ditulis kalau bukan tahun ini). Buat tampilan kolom Tanggal. */
export function dateLabel(date, today) {
  if (!date) return 'Pilih tanggal'
  const base = `${Number(date.slice(8))} ${BULAN[Number(date.slice(5, 7)) - 1]}`
  return date.slice(0, 4) === today.slice(0, 4) ? base : `${base} ${date.slice(0, 4)}`
}

/** 'HH:MM' → "06.42" (tampilan kolom Jam). */
export const timeLabel = (hhmm) => (hhmm ? hhmm.replace(':', '.') : 'Pilih jam')

/** Angka buat diketik ulang: koma desimal; titik ribuan cuma buat BMR ("1.650", `parseNum` bacanya balik 1650). */
const numText = (v, key) => {
  if (typeof v !== 'number' || !Number.isFinite(v)) return ''
  const dec = METRICS[key].dec
  return v.toLocaleString('id-ID', { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: key === 'bmr' })
}
const comma = (n) => String(n).replace('.', ',')
const blankValues = () => Object.fromEntries(METRIC_KEYS.map((k) => [k, '']))
const nowTime = (now) => `${pad(Math.floor(now.minutes / 60))}:${pad(now.minutes % 60)}`

/** Isian awal Isi manual: hari ini + jam sekarang (WIB), angka kosong. `now` = { date, minutes } dari `wibNow()`. */
export const blankForm = (now) => ({ date: now.date, time: nowTime(now), values: blankValues(), bodyType: '' })

/** Timbangan dari server → isian form (ubah). */
export function fromWeighing(w) {
  return {
    date: w.weighedOn,
    time: w.weighedAt ?? '',
    values: Object.fromEntries(METRIC_KEYS.map((k) => [k, numText(w[k], k)])),
    bodyType: w.bodyType ?? '',
  }
}

/** Hasil baca gambar → isian form. Tanggal & jam dari gambar kalau ada, kalau nggak = sekarang. */
export function fromRead(read, now) {
  return {
    date: read.weighedOn ?? now.date,
    time: read.weighedAt ?? nowTime(now),
    values: Object.fromEntries(METRIC_KEYS.map((k) => [k, numText(read[k], k)])),
    bodyType: read.bodyType ?? '',
  }
}

/** Pesan per kolom ({} = aman). `today` = 'YYYY-MM-DD' WIB. */
export function formErrors(form, today) {
  const out = {}
  if (!form.date) out.date = 'Tanggalnya belum diisi.'
  else if (form.date > today) out.date = 'Tanggalnya belum kejadian.'
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.time ?? '')) out.time = 'Jamnya belum diisi.'
  for (const k of METRIC_KEYS) {
    const v = parseNum(form.values[k], k)
    if (v === null) {
      if (k === 'weight') out.weight = 'Beratnya wajib diisi.'
    } else if (Number.isNaN(v)) out[k] = 'Isi angka aja ya.'
    else if (METRICS[k].dec === 0 && !Number.isInteger(v)) out[k] = 'Angkanya harus bulat.'
    else if (v < METRICS[k].min || v > METRICS[k].max) out[k] = `Di luar rentang wajar (${comma(METRICS[k].min)}–${comma(METRICS[k].max)}).`
  }
  return out
}

/** Isian (udah lolos `formErrors`) → badan request. */
export function toPayload(form, source) {
  return {
    weighedOn: form.date,
    weighedAt: form.time,
    ...Object.fromEntries(METRIC_KEYS.map((k) => [k, parseNum(form.values[k], k)])),
    bodyType: form.bodyType || null,
    source,
  }
}
