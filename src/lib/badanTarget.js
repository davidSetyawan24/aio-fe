/** Form "Atur target" Badan: ketikan → cek → payload. Aturan & pesan sama kayak server. */
import { METRICS } from './badan.js'
import { parseNum } from './badanForm.js'

const fmtN = (n) => String(n).replace('.', ',')
const outOfRange = (key) => `Angkanya di luar rentang wajar (${fmtN(METRICS[key].min)}–${fmtN(METRICS[key].max)}).`

/** Angka dari server → ketikan (koma desimal). Kosong → ''. */
export const targetText = (v) => (typeof v === 'number' && Number.isFinite(v) ? fmtN(v) : '')

/** Target dari server (atau null) → isian form. */
export function targetToForm(target) {
  return {
    arah: target?.arah ?? 'recomp',
    fat: targetText(target?.fat),
    muscle: targetText(target?.muscle),
    weightMin: targetText(target?.weightMin),
    weightMax: targetText(target?.weightMax),
  }
}

const FIELDS = { fat: 'fat', muscle: 'muscle', weightMin: 'weight', weightMax: 'weight' }

/** Angka tiap kolom (null = kosong, NaN = ngaco). */
function numbers(form) {
  return Object.fromEntries(Object.keys(FIELDS).map((f) => [f, parseNum(form[f], FIELDS[f])]))
}

/** Pesan per kolom; objek kosong = lolos. */
export function targetErrors(form) {
  const n = numbers(form)
  const out = {}
  for (const [f, key] of Object.entries(FIELDS)) {
    const v = n[f]
    if (v === null) continue
    if (Number.isNaN(v)) out[f] = 'Angkanya nggak valid.'
    else if (v < METRICS[key].min || v > METRICS[key].max) out[f] = outOfRange(key)
  }
  const { weightMin: min, weightMax: max } = n
  if (!out.weightMin && !out.weightMax) {
    if ((min === null) !== (max === null)) out.weightMax = 'Isi dua-duanya atau kosongin dua-duanya.'
    else if (min !== null && min >= max) out.weightMax = 'Paling ringan harus di bawah paling berat.'
  }
  return out
}

export function targetPayload(form) {
  return { arah: form.arah, ...numbers(form) }
}
