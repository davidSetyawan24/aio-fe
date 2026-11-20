/** Form tidur Badan (isi manual / ubah / hasil baca gambar) + gabungan riwayat. Murni, gampang dites. */
import { SLEEP_LIMITS, clockSpan } from './badan.js'

const NUM_KEYS = ['totalMin', 'deepMin', 'lightMin', 'remMin', 'score', 'awakeCount', 'avgHr', 'avgHrv']
const MIN_KEYS = new Set(['deepMin', 'lightMin', 'remMin'])

/** 403 → "6 j 43 m"; di bawah 1 jam → "55 m". */
export function durL(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h === 0 ? `${m} m` : `${h} j ${m} m`
}

/** Kolom Tidur di riwayat: 403 → "6j43", 365 → "6j05". */
export const durS = (min) => `${Math.floor(min / 60)}j${String(min % 60).padStart(2, '0')}`

/** 403 → { h: '6', m: '43' }. */
export const durParts = (min) => ({ h: String(Math.floor(min / 60)), m: String(min % 60) })

/** Jam & menit ketikan → menit. Dua-duanya kosong → null, ngaco / menit > 59 → NaN. */
export function durMin(h, m) {
  const hs = String(h ?? '').trim()
  const ms = String(m ?? '').trim()
  if (!hs && !ms) return null
  if ((hs && !/^\d+$/.test(hs)) || (ms && !/^\d+$/.test(ms))) return NaN
  const mm = ms ? Number(ms) : 0
  if (mm > 59) return NaN
  return (hs ? Number(hs) : 0) * 60 + mm
}

const numText = (v) => (typeof v === 'number' && Number.isFinite(v) ? String(v) : '')
const durText = (v) => (typeof v === 'number' && Number.isFinite(v) ? durParts(v) : { h: '', m: '' })

function build(date, bed, wake, src) {
  const form = { date, bedAt: bed ?? '', wakeAt: wake ?? '', total: durText(src.totalMin) }
  for (const k of NUM_KEYS.slice(1)) form[k] = MIN_KEYS.has(k) ? durText(src[k]) : numText(src[k])
  return form
}

/** Isian awal: tanggal hari ini, sisanya kosong. `now` = { date, minutes }. */
export const blankSleep = (now) => build(now.date, '', '', {})

/** Tidur dari server → isian form (ubah). */
export const fromSleep = (s) => build(s.sleptOn, s.bedAt, s.wakeAt, s)

/** Hasil baca gambar → isian form. Tanggal kosong → hari ini. */
export const fromSleepRead = (read, now) => build(read.sleptOn || now.date, read.bedAt, read.wakeAt, read)

const comma = (n) => String(n).replace('.', ',')
const FIELD_DUR = { total: 'totalMin', deepMin: 'deepMin', lightMin: 'lightMin', remMin: 'remMin' }

function valueOf(form, field) {
  if (field in FIELD_DUR) {
    const d = form[field]
    return durMin(d.h, d.m)
  }
  const t = String(form[field] ?? '').trim()
  if (!t) return null
  return /^\d+$/.test(t) ? Number(t) : NaN
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

/** Pesan per kolom ({} = aman). `today` = 'YYYY-MM-DD' WIB. */
export function sleepErrors(form, today) {
  const out = {}
  if (!form.date) out.date = 'Tanggalnya belum diisi.'
  else if (form.date > today) out.date = 'Tanggalnya belum kejadian.'
  const total = valueOf(form, 'total')
  const bedWake = HHMM.test(form.bedAt ?? '') && HHMM.test(form.wakeAt ?? '')
  const check = (field, key) => {
    const v = valueOf(form, field)
    if (v === null) return
    if (Number.isNaN(v)) out[field] = 'Isi angka aja ya.'
    else {
      const [lo, hi] = SLEEP_LIMITS[key]
      if (v < lo || v > hi) out[field] = `Di luar rentang wajar (${comma(lo)}–${comma(hi)}).`
    }
  }
  if (total === null) {
    if (!bedWake) out.total = 'Lama tidurnya wajib diisi.'
    else {
      const [lo, hi] = SLEEP_LIMITS.totalMin
      const span = clockSpan(form.bedAt, form.wakeAt)
      if (span < lo || span > hi) out.total = `Lama tidurnya di luar rentang wajar (${lo / 60}–${hi / 60} jam).`
    }
  } else check('total', 'totalMin')
  for (const k of ['deepMin', 'lightMin', 'remMin']) check(k, k)
  for (const k of ['score', 'awakeCount', 'avgHr', 'avgHrv']) check(k, k)
  return out
}

/** Isian (udah lolos `sleepErrors`) → badan request. */
export function sleepPayload(form, source) {
  let totalMin = valueOf(form, 'total')
  if (totalMin === null && form.bedAt && form.wakeAt) totalMin = clockSpan(form.bedAt, form.wakeAt)
  return {
    sleptOn: form.date,
    bedAt: form.bedAt || null,
    wakeAt: form.wakeAt || null,
    totalMin,
    deepMin: valueOf(form, 'deepMin'),
    lightMin: valueOf(form, 'lightMin'),
    remMin: valueOf(form, 'remMin'),
    score: valueOf(form, 'score'),
    awakeCount: valueOf(form, 'awakeCount'),
    avgHr: valueOf(form, 'avgHr'),
    avgHrv: valueOf(form, 'avgHrv'),
    source,
  }
}

/** Timbangan + tidur digabung per tanggal, urut tanggal turun. */
export function sleepHistory(weighings, sleeps) {
  const by = new Map()
  const ordered = [...weighings].sort((a, b) => (a.weighedAt ?? '').localeCompare(b.weighedAt ?? ''))
  for (const w of ordered) by.set(w.weighedOn, { date: w.weighedOn, weighing: w, sleep: null })
  for (const s of sleeps) {
    const row = by.get(s.sleptOn)
    if (row) row.sleep = s
    else by.set(s.sleptOn, { date: s.sleptOn, weighing: null, sleep: s })
  }
  return [...by.values()].sort((a, b) => b.date.localeCompare(a.date))
}
