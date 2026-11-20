/** Badan: hitungan rata-rata 7 hari, arah, progres, perkiraan. KEMBAR backend (body-types + body-math). */
import { addDays, BULAN } from './agenda.js'

export const METRIC_KEYS = ['weight', 'fat', 'muscle', 'water', 'visceral', 'bone', 'protein', 'bmr', 'bmi', 'score']

export const METRICS = {
  weight: { dec: 2, min: 20, max: 300 },
  fat: { dec: 1, min: 1, max: 75 },
  muscle: { dec: 2, min: 10, max: 150 },
  water: { dec: 1, min: 20, max: 80 },
  visceral: { dec: 0, min: 1, max: 59 },
  bone: { dec: 2, min: 0.5, max: 10 },
  protein: { dec: 1, min: 5, max: 40 },
  bmr: { dec: 0, min: 500, max: 5000 },
  bmi: { dec: 1, min: 10, max: 70 },
  score: { dec: 0, min: 1, max: 100 },
}

export const BODY_TYPES = [
  { key: 'thick_set', label: 'Kekar berisi', zepp: 'Thick-set' },
  { key: 'obese', label: 'Gemuk', zepp: 'Obese' },
  { key: 'overweight', label: 'Kelebihan berat', zepp: 'Overweight' },
  { key: 'lack_exercise', label: 'Kurang gerak', zepp: 'Lack-exercise' },
  { key: 'balanced', label: 'Seimbang', zepp: 'Balanced' },
  { key: 'balanced_muscular', label: 'Seimbang berotot', zepp: 'Balanced-muscular' },
  { key: 'skinny', label: 'Kurus', zepp: 'Skinny' },
  { key: 'balanced_skinny', label: 'Langsing seimbang', zepp: 'Balanced-skinny' },
  { key: 'skinny_muscular', label: 'Kurus berotot', zepp: 'Skinny-muscular' },
]

export const ARAH = ['recomp', 'jaga', 'cutting', 'bulking']

const norm = (s) => String(s).toLowerCase().replace(/[^a-z]/g, '')

export function bodyTypeFromZepp(text) {
  if (text == null) return null
  const n = norm(text)
  if (!n) return null
  return BODY_TYPES.find((t) => norm(t.zepp) === n)?.key ?? null
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

export function avg7(rows, key, date) {
  const from = addDays(date, -6)
  const vals = rows.filter((r) => r.weighedOn >= from && r.weighedOn <= date && isNum(r[key])).map((r) => r[key])
  if (!vals.length) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

export function count7(rows, date) {
  const from = addDays(date, -6)
  return rows.filter((r) => r.weighedOn >= from && r.weighedOn <= date).length
}

export function weekDelta(rows, key, date) {
  const a = avg7(rows, key, date)
  const b = avg7(rows, key, addDays(date, -7))
  return a == null || b == null ? null : a - b
}

export function tone(arah, key, delta) {
  if (!arah || delta == null || delta === 0) return 'neutral'
  if (key === 'fat') return delta < 0 ? 'good' : 'bad'
  if (key === 'muscle') return delta > 0 ? 'good' : 'bad'
  if (key === 'weight') {
    if (arah === 'cutting') return delta < 0 ? 'good' : 'bad'
    if (arah === 'bulking') return delta > 0 ? 'good' : 'bad'
  }
  return 'neutral'
}

export function startValue(rows, key, startedOn) {
  const dates = rows.map((r) => r.weighedOn)
  const before = dates.filter((d) => d <= startedOn).sort().at(-1)
  if (before) return avg7(rows, key, before)
  const after = dates.filter((d) => d > startedOn).sort()[0]
  return after ? avg7(rows, key, after) : null
}

export function progress(start, now, goal) {
  const reached = start === goal ? true : start > goal ? now <= goal : now >= goal
  const raw = start === goal ? 1 : (start - now) / (start - goal)
  const pct = Math.round(Math.min(1, Math.max(0, raw)) * 100)
  return { pct, left: reached ? 0 : Math.abs(now - goal), reached }
}

export function weightGoal(target, rows, date) {
  if (!target || target.weightMin == null || target.weightMax == null) return null
  const now = avg7(rows, 'weight', date)
  if (now == null) return null
  const min = target.weightMin
  const max = target.weightMax
  if (target.arah === 'recomp' || target.arah === 'jaga') {
    return { mode: 'keep', inRange: now >= min && now <= max, min, max }
  }
  const goal = target.arah === 'cutting' ? max : min
  let state = 'progress'
  if (now >= min && now <= max) state = 'in'
  else if (target.arah === 'cutting' && now < min) state = 'below'
  else if (target.arah === 'bulking' && now > max) state = 'above'
  const start = startValue(rows, 'weight', target.startedOn) ?? now
  const { pct, left } = progress(start, now, goal)
  return { mode: 'reach', state, goal, min, max, pct, left }
}

export function eta(rows, key, date, goal) {
  const a = avg7(rows, key, date)
  const b = avg7(rows, key, addDays(date, -28))
  if (a == null || b == null) return null
  const rate = (a - b) / 28
  if (rate === 0) return null
  const days = (goal - a) / rate
  if (!(days > 0) || days > 730) return null
  return addDays(date, Math.round(days)).slice(0, 7)
}

export function etaFor(target, rows, date) {
  if (!target) return null
  if (target.arah === 'cutting' || target.arah === 'bulking') {
    const g = weightGoal(target, rows, date)
    if (!g || g.mode !== 'reach' || g.state !== 'progress') return null
    const month = eta(rows, 'weight', date, g.goal)
    return month ? { key: 'weight', month } : null
  }
  if (target.fat == null) return null
  const month = eta(rows, 'fat', date, target.fat)
  return month ? { key: 'fat', month } : null
}

const JUMP = { weight: 3, fat: 4, muscle: 3, water: 5, visceral: 3, bone: 0.5 }

export function checkFlags(read, prev, readDate) {
  const flags = new Set()
  for (const k of METRIC_KEYS) {
    const v = read[k]
    if (!isNum(v) || v < METRICS[k].min || v > METRICS[k].max) flags.add(k)
  }
  const { weight, fat, muscle, bone } = read
  if ([weight, fat, muscle, bone].every(isNum)) {
    if (Math.abs((weight * fat) / 100 + muscle + bone - weight) > 0.5) ['fat', 'muscle', 'bone'].forEach((k) => flags.add(k))
  }
  if (prev && prev.weighedOn >= addDays(readDate, -14) && prev.weighedOn < readDate) {
    for (const [k, max] of Object.entries(JUMP)) {
      if (isNum(read[k]) && isNum(prev[k]) && Math.abs(read[k] - prev[k]) > max) flags.add(k)
    }
  }
  return METRIC_KEYS.filter((k) => flags.has(k))
}

export function bodySummary(rows, target) {
  if (!rows.length) return null
  const sorted = [...rows].sort((a, b) => (a.weighedOn + (a.weighedAt ?? '')).localeCompare(b.weighedOn + (b.weighedAt ?? '')))
  const last = sorted.at(-1)
  const D = last.weighedOn
  const arah = target?.arah ?? null
  const deltas = { fat: weekDelta(rows, 'fat', D), muscle: weekDelta(rows, 'muscle', D), weight: weekDelta(rows, 'weight', D) }
  const lo = addDays(D, -29)
  const spark = []
  for (const d of [...new Set(rows.map((r) => r.weighedOn))].sort()) {
    if (d < lo || d > D || count7(rows, d) < 3) continue
    const v = avg7(rows, 'fat', d)
    if (v != null) spark.push(v)
  }
  return {
    lastOn: D,
    lastAt: last.weighedAt ?? null,
    from: addDays(D, -6),
    to: D,
    count: count7(rows, D),
    arah,
    fat: avg7(rows, 'fat', D),
    muscle: avg7(rows, 'muscle', D),
    weight: avg7(rows, 'weight', D),
    deltas,
    tones: { fat: tone(arah, 'fat', deltas.fat), muscle: tone(arah, 'muscle', deltas.muscle), weight: tone(arah, 'weight', deltas.weight) },
    weightGoal: weightGoal(target, rows, D),
    spark,
  }
}

/* Tampilan */
export const METRIC_LABEL = {
  weight: ['Berat', 'Berat'],
  fat: ['Lemak tubuh', 'Lemak'],
  muscle: ['Massa otot', 'Otot'],
  water: ['Air', 'Air'],
  visceral: ['Lemak visceral', 'Visceral'],
  bone: ['Massa tulang', 'Tulang'],
  protein: ['Protein', 'Protein'],
  bmr: ['BMR', 'BMR'],
  bmi: ['BMI', 'BMI'],
  score: ['Skor badan', 'Skor badan'],
  /** Bukan angka timbangan — cuma dipakai chip & legenda grafik. */
  sleep: ['Tidur', 'Tidur'],
}

/** Desimal angka rata-rata (hero, legenda, detail): tulang 2, BMR & skor 0, sisanya 1. */
export const ADEC = { weight: 1, fat: 1, muscle: 1, water: 1, visceral: 1, bone: 2, protein: 1, bmr: 0, bmi: 1, score: 0 }

export const UNIT = { weight: 'kg', fat: '%', muscle: 'kg', water: '%', visceral: '', bone: 'kg', protein: '%', bmr: 'kkal', bmi: '', score: '' }

export const ARAH_INFO = {
  recomp: { n: 'Recomp', em: '🔁', t: 'Berat dijaga, lemak turun, otot naik.', s: 'Hijau kalau lemak ↓ dan otot ↑. Berat cukup di kisaran.' },
  jaga: { n: 'Jaga', em: '🧘', t: 'Pertahanin badan yang sekarang.', s: 'Hijau kalau lemak nggak naik & otot nggak turun. Berat cukup di kisaran.' },
  cutting: { n: 'Cutting', em: '🔥', t: 'Fokus buang lemak, berat ikut turun.', s: 'Hijau kalau lemak ↓ dan berat ↓. Otot dijaga jangan turun.' },
  bulking: { n: 'Bulking', em: '💪', t: 'Fokus nambah otot, berat ikut naik.', s: 'Hijau kalau otot ↑ dan berat ↑. Lemak dijaga jangan naik banyak.' },
}

/** Chip grafik; `sleep` = total tidur per malam (data tidur, bukan timbangan). */
export const CHART_ORDER = ['fat', 'muscle', 'weight', 'sleep', 'water', 'visceral', 'bone', 'protein', 'bmr', 'bmi', 'score']
export const DEFAULT_ON = ['fat', 'muscle', 'weight']

export function fmt(v, dec) {
  if (v == null || !Number.isFinite(v)) return '–'
  return v.toLocaleString('id-ID', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

export const monthLabel = (ym) => `${BULAN[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`

/* v2: aktivitas, kecepatan, makan per hari, tidur. KEMBAR backend (body-types + body-math). */
export const WORK_TYPES = ['sit', 'stand_walk', 'heavy']
export const LEVELS = { sedentary: 1.2, light: 1.375, active: 1.55, very_active: 1.725 }
export const PACES = {
  cutting: { santai: [0.25, 0.5], normal: [0.5, 0.75], agresif: [0.75, 1.0] },
  bulking: { santai: [0.1, 0.25], normal: [0.25, 0.5] },
}
export const PROTEIN_G = { cutting: 2.5, other: 2.2 }
export const KCAL_PER_KG = 7700
export const SLEEP_KEYS = ['bedAt', 'wakeAt', 'totalMin', 'deepMin', 'lightMin', 'remMin', 'score', 'awakeCount', 'avgHr', 'avgHrv']
export const SLEEP_LIMITS = {
  totalMin: [60, 960], deepMin: [0, 960], lightMin: [0, 960], remMin: [0, 960],
  score: [0, 100], awakeCount: [0, 30], avgHr: [30, 150], avgHrv: [5, 250],
}

export const LEVEL_INFO = { sedentary: 'Banyak duduk', light: 'Ringan', active: 'Aktif', very_active: 'Sangat aktif' }
export const WORK_INFO = { sit: 'Duduk', stand_walk: 'Berdiri & jalan', heavy: 'Fisik berat' }
export const PACE_INFO = { santai: 'Santai', normal: 'Normal', agresif: 'Agresif' }
export const PACE_STATE = { slow: 'kepelanan', ok: 'pas', fast: 'kecepetan' }

export function suggestLevel(a) {
  let score = 0
  if (a.workType === 'heavy') score += 2
  else if (a.workType === 'stand_walk' && a.workHours >= 4 && a.workDays >= 4) score += 1
  const g = a.gymPerWeek
  score += g >= 6 ? 3 : g >= 4 ? 2 : g >= 1 ? 1 : 0
  if (score <= 0) return 'sedentary'
  if (score === 1) return 'light'
  if (score <= 3) return 'active'
  return 'very_active'
}

export function paceRange(arah, pace, weight) {
  const r = PACES[arah]?.[pace]
  if (!r) return null
  const lo = (r[0] * weight) / 100
  const hi = (r[1] * weight) / 100
  return { lo, hi, mid: (lo + hi) / 2 }
}

export function paceStatus(target, rows, date) {
  if (!target) return null
  const w = avg7(rows, 'weight', date)
  if (w == null) return null
  const range = paceRange(target.arah, target.pace, w)
  if (!range) return null
  const prev = avg7(rows, 'weight', addDays(date, -14))
  if (prev == null) return { ...range, actual: null, state: null }
  const diff = (w - prev) / 2
  const actual = target.arah === 'cutting' ? -diff : diff
  const state = actual < range.lo ? 'slow' : actual > range.hi ? 'fast' : 'ok'
  return { ...range, actual, state }
}

export function paceEta(target, rows, date) {
  const g = weightGoal(target, rows, date)
  if (!g || g.mode !== 'reach' || g.state !== 'progress') return null
  const status = paceStatus(target, rows, date)
  if (!status) return null
  const w = avg7(rows, 'weight', date)
  const left = Math.abs(w - g.goal)
  const month = (days) => (days > 0 && days <= 730 ? addDays(date, Math.round(days)).slice(0, 7) : null)
  const now = status.actual != null && status.actual > 0 ? month((left / status.actual) * 7) : null
  const plan = month((left / status.mid) * 7)
  return { goal: g.goal, now, plan }
}

export function foodPlan(rows, target, activity) {
  if (!rows.length) return { state: 'needWeighing' }
  if (!target) return { state: 'needTarget' }
  const moving = target.arah === 'cutting' || target.arah === 'bulking'
  if (moving && !target.pace) return { state: 'needPace' }
  if (!activity) return { state: 'needActivity' }
  const D = rows.reduce((m, r) => (r.weighedOn > m ? r.weighedOn : m), rows[0].weighedOn)
  const bmr = avg7(rows, 'bmr', D)
  if (bmr == null) return { state: 'needBmr' }
  const mult = LEVELS[activity.level]
  const tdee = bmr * mult
  const w = avg7(rows, 'weight', D)
  let adjust = 0
  if (moving) {
    const range = paceRange(target.arah, target.pace, w)
    if (!range) return { state: 'needPace' }
    adjust = Math.round((range.mid * KCAL_PER_KG) / 7) * (target.arah === 'cutting' ? -1 : 1)
  }
  const kcal = Math.round((tdee + adjust) / 50) * 50
  const fat = avg7(rows, 'fat', D)
  const lean = fat == null ? null : w * (1 - fat / 100)
  const proteinPerKg = target.arah === 'cutting' ? PROTEIN_G.cutting : PROTEIN_G.other
  const protein = lean == null ? null : Math.round((proteinPerKg * lean) / 5) * 5
  return {
    state: 'ok', bmr, level: activity.level, mult, tdee, adjust, kcal, lean, proteinPerKg, protein,
    belowBmr: kcal < bmr, aggressive: target.pace === 'agresif',
  }
}

const toMin = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))

export function clockSpan(bed, wake) {
  return (toMin(wake) - toMin(bed) + 1440) % 1440
}

export function sleepSummary(sleeps) {
  if (!sleeps.length) return null
  const last = sleeps.reduce((m, s) => (s.sleptOn > m.sleptOn ? s : m), sleeps[0])
  const from = addDays(last.sleptOn, -6)
  const week = sleeps.filter((s) => s.sleptOn >= from && s.sleptOn <= last.sleptOn)
  const avg = week.reduce((a, s) => a + s.totalMin, 0) / week.length
  return {
    lastOn: last.sleptOn, totalMin: last.totalMin, bedAt: last.bedAt, wakeAt: last.wakeAt, score: last.score,
    avg7Min: Math.round(avg), nights: week.length,
  }
}
