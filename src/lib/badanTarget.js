/** Form "Atur target" Badan (target + kecepatan + aktivitas): ketikan → cek → payload. Aturan & pesan sama kayak server. */
import { addDays } from './agenda.js'
import { METRICS, PACES, paceRange, suggestLevel, WORK_TYPES } from './badan.js'
import { parseNum } from './badanForm.js'

const fmtN = (n) => String(n).replace('.', ',')
const outOfRange = (min, max) => `Angkanya di luar rentang wajar (${fmtN(min)}–${fmtN(max)}).`

/** Angka dari server → ketikan (koma desimal). Kosong → ''. */
export const targetText = (v) => (typeof v === 'number' && Number.isFinite(v) ? fmtN(v) : '')

const MOVING = new Set(['cutting', 'bulking'])

/** Kolom angka aktivitas → rentang (sama kayak server, semua bilangan bulat). */
const ACT_NUMS = { workHours: [0, 16], workDays: [0, 7], gymPerWeek: [0, 14], gymMinutes: [0, 300] }

/** Kolom gym: kalau Gym punya angka otomatis, kolom ini disembunyiin & nggak dicek. */
const GYM_KEYS = ['gymPerWeek', 'gymMinutes']

/** Target + aktivitas dari server (boleh null) → isian form. */
export function targetToForm(target, activity) {
  return {
    arah: target?.arah ?? 'recomp',
    pace: target?.pace ?? 'normal',
    fat: targetText(target?.fat),
    muscle: targetText(target?.muscle),
    weightMin: targetText(target?.weightMin),
    weightMax: targetText(target?.weightMax),
    workType: activity?.workType ?? '',
    ...Object.fromEntries(Object.keys(ACT_NUMS).map((k) => [k, targetText(activity?.[k])])),
    otherSport: activity?.otherSport ?? '',
    notes: activity?.notes ?? '',
    level: activity?.level ?? '',
    levelManual: activity?.levelManual ?? false,
  }
}

const FIELDS = { fat: 'fat', muscle: 'muscle', weightMin: 'weight', weightMax: 'weight' }

/** Angka tiap kolom target (null = kosong, NaN = ngaco). */
function numbers(form) {
  return Object.fromEntries(Object.keys(FIELDS).map((f) => [f, parseNum(form[f], FIELDS[f])]))
}

/** Pesan per kolom target; objek kosong = lolos. */
export function targetErrors(form) {
  const n = numbers(form)
  const out = {}
  for (const [f, key] of Object.entries(FIELDS)) {
    const v = n[f]
    if (v === null) continue
    if (Number.isNaN(v)) out[f] = 'Angkanya nggak valid.'
    else if (v < METRICS[key].min || v > METRICS[key].max) out[f] = outOfRange(METRICS[key].min, METRICS[key].max)
  }
  const { weightMin: min, weightMax: max } = n
  if (!out.weightMin && !out.weightMax) {
    if ((min === null) !== (max === null)) out.weightMax = 'Isi dua-duanya atau kosongin dua-duanya.'
    else if (min !== null && min >= max) out.weightMax = 'Paling ringan harus di bawah paling berat.'
  }
  return out
}

/** Body PUT /body/target. Kecepatan cuma dikirim buat Cutting/Bulking. */
export function targetPayload(form) {
  return { arah: form.arah, ...(MOVING.has(form.arah) ? { pace: form.pace } : {}), ...numbers(form) }
}

const blank = (s) => !String(s ?? '').trim()
const actNum = (form, k) => parseNum(form[k])
const validNum = (form, k) => {
  const v = actNum(form, k)
  const [lo, hi] = ACT_NUMS[k]
  return v !== null && Number.isInteger(v) && v >= lo && v <= hi
}

/** Bagian aktivitas belum disentuh sama sekali (pengali manual juga dianggap ngisi). */
const activityEmpty = (form) =>
  blank(form.workType) && Object.keys(ACT_NUMS).every((k) => blank(form[k])) && blank(form.otherSport) && blank(form.notes) && !form.levelManual

/** Pesan per kolom aktivitas; `{}` = lolos (termasuk kalau kosong semua — aktivitas boleh nggak diisi). */
export function activityErrors(form, gymAuto = null) {
  if (activityEmpty(form)) return {}
  const out = {}
  if (!WORK_TYPES.includes(form.workType)) out.workType = 'Wajib diisi.'
  for (const [k, [lo, hi]] of Object.entries(ACT_NUMS)) {
    if (gymAuto && GYM_KEYS.includes(k)) continue
    const v = actNum(form, k)
    if (v === null) out[k] = 'Wajib diisi.'
    else if (Number.isNaN(v)) out[k] = 'Angkanya nggak valid.'
    else if (v < lo || v > hi) out[k] = outOfRange(lo, hi)
    else if (!Number.isInteger(v)) out[k] = 'Angkanya harus bulat.'
  }
  if (form.levelManual && !levelFor(form, gymAuto).used) out.level = 'Wajib diisi.'
  return out
}

/** Pengali: saran dari kerja + gym (null kalau isiannya belum lengkap) & yang dipakai (ikut saran kecuali dipilih sendiri). */
export function levelFor(form, gymAuto = null) {
  const need = gymAuto ? ['workHours', 'workDays'] : ['workHours', 'workDays', 'gymPerWeek']
  const ready = WORK_TYPES.includes(form.workType) && need.every((k) => validNum(form, k))
  const suggested = ready
    ? suggestLevel({ workType: form.workType, workHours: actNum(form, 'workHours'), workDays: actNum(form, 'workDays'), gymPerWeek: gymAuto ? gymAuto.perWeek : actNum(form, 'gymPerWeek') })
    : null
  return { suggested, used: form.levelManual ? form.level || null : suggested }
}

/** Body PUT /body/activity, atau null kalau bagian aktivitas kosong semua. Panggil abis `activityErrors` lolos. */
export function activityPayload(form, gymAuto = null) {
  if (activityEmpty(form)) return null
  const text = (s) => String(s ?? '').trim() || null
  // Kolom gym disembunyiin pas ada angka otomatis: dikirim apa adanya (kosong → 0). Server tetep pakai angka otomatis selama aktif.
  const num = (k) => (gymAuto && GYM_KEYS.includes(k) ? actNum(form, k) || 0 : actNum(form, k))
  return {
    workType: form.workType,
    ...Object.fromEntries(Object.keys(ACT_NUMS).map((k) => [k, num(k)])),
    otherSport: text(form.otherSport),
    notes: text(form.notes),
    level: levelFor(form, gymAuto).used,
    levelManual: Boolean(form.levelManual),
  }
}

/**
 * Baris hidup Kecepatan dari isian (Cutting/Bulking aja, selain itu null).
 * `weight` = rata-rata 7 hari, `date` = tanggal timbangan terakhir (dua-duanya boleh null → cuma persen).
 * `reach` = nyampe ujung kisaran kapan, cuma kalau kisaran keisi bener & arahnya masih perlu jalan (maks 2 tahun).
 */
export function speedPreview(form, weight, date) {
  const pct = PACES[form.arah]?.[form.pace]
  if (!pct) return null
  if (weight == null) return { pct, lo: null, hi: null, reach: null }
  const { lo, hi, mid } = paceRange(form.arah, form.pace, weight)
  const err = targetErrors(form)
  const { weightMin: min, weightMax: max } = numbers(form)
  let reach = null
  if (date && !err.weightMin && !err.weightMax && min !== null && max !== null) {
    const goal = form.arah === 'cutting' ? max : min
    const left = form.arah === 'cutting' ? weight - goal : goal - weight
    const days = Math.round((left / mid) * 7)
    if (left > 0 && days <= 730) reach = { goal, month: addDays(date, days).slice(0, 7), weeks: Math.round(left / mid) }
  }
  return { pct, lo, hi, reach }
}
