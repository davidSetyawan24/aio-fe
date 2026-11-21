// Konstanta & hitungan Gym. KEMBAR dengan backend `gym-types.ts` + `gym-math.ts`.

export const PROGRAMS = ['push', 'pull', 'leg', 'upper', 'lower']
export const PROGRAM_LABEL = { push: 'Push', pull: 'Pull', leg: 'Leg', upper: 'Upper', lower: 'Lower' }
export const PROGRAM_EMOJI = { push: '💪', pull: '🧗', leg: '🦵', upper: '🏋️', lower: '🏃' }
export const PROGRAM_TINT = {
  push: '#FFE9D6',
  pull: '#DCEBFF',
  leg: '#E4F7C4',
  upper: '#F3E1FF',
  lower: '#FFE0E6',
}
export const REST_OPTIONS = [60, 90, 120, 150, 180, 240, 300]
export const STEP_OPTIONS = [1, 2, 2.5, 5, 10]
export const LIMITS = { weight: [0, 999], reps: [1, 100], restSec: [30, 600], step: [0.5, 20], name: 60 }
export const FLAT_MIN = 4
export const FORGOT_MIN = 60
export const FORGOT_PAD_MIN = 5
export const MAX_SESSION_MIN = 480
export const AUTO_MIN_DAYS = 14
export const AUTO_WINDOW_DAYS = 28

const WIB_MS = 7 * 3600 * 1000
const DAY_MS = 86400000

// Tanggal kalender WIB (YYYY-MM-DD) dari waktu ISO UTC.
export function wibDate(iso) {
  return new Date(new Date(iso).getTime() + WIB_MS).toISOString().slice(0, 10)
}

// Senin dari minggu yang memuat tanggal itu.
export function weekStart(date) {
  const d = new Date(`${date}T00:00:00Z`)
  const back = (d.getUTCDay() + 6) % 7
  return new Date(d.getTime() - back * DAY_MS).toISOString().slice(0, 10)
}

// Volume mentah: Σ beban × reps.
export function volume(sets) {
  return sets.reduce((sum, s) => sum + s.weight * s.reps, 0)
}

// Set terberat: beban terbesar, seri → reps terbanyak.
export function bestSet(pairs) {
  let best = null
  for (const p of pairs) if (!best || cmpSet(p, best) > 0) best = p
  return best
}

export function cmpSet(a, b) {
  if (a[0] !== b[0]) return a[0] > b[0] ? 1 : -1
  if (a[1] !== b[1]) return a[1] > b[1] ? 1 : -1
  return 0
}

// 1RM Epley, dibulatin ke 0,5 kg; reps 1 = bebannya.
export function e1rm(w, r) {
  if (r === 1) return w
  return Math.round(w * (1 + r / 30) * 2) / 2
}

// Rekor satu gerakan dari sesi-sesi SELESAI yang dikasih.
export function recordOf(exerciseId, sessions) {
  let maxWeight = null
  const repsAt = {}
  for (const s of sessions) {
    for (const x of s.sets) {
      if (x.exerciseId !== exerciseId) continue
      if (maxWeight === null || x.weight > maxWeight) maxWeight = x.weight
      const k = String(x.weight)
      if (repsAt[k] === undefined || x.reps > repsAt[k]) repsAt[k] = x.reps
    }
  }
  return maxWeight === null ? null : { maxWeight, repsAt }
}

// PR: beban menang atas reps; tanpa riwayat = bukan PR.
export function prOf(best, rec) {
  if (!rec) return null
  if (best[0] > rec.maxWeight) return { kind: 'beban', set: best, prev: rec.maxWeight }
  const old = rec.repsAt[String(best[0])]
  if (old !== undefined && best[1] > old) return { kind: 'reps', set: best, prev: old }
  return null
}

// PR pas sesi live: ngalahin rekor DAN lebih bagus dari set terbaik sesi ini.
export function livePr(set, rec, bestSoFar) {
  const pr = prOf(set, rec)
  if (!pr) return null
  if (bestSoFar && cmpSet(set, bestSoFar) <= 0) return null
  return pr
}

// "Datar": N titik terakhir berturut-turut yang beban terberatnya sama persis.
export function flatCount(points) {
  if (!points.length) return 0
  const w = points[points.length - 1].best[0]
  let n = 0
  for (let i = points.length - 1; i >= 0 && points[i].best[0] === w; i--) n++
  return n
}

// Usulan jam selesai buat sesi yang lupa diselesaiin (ISO).
export function forgotSuggest(startedAt, lastSetAt, now) {
  const base = new Date(lastSetAt ?? startedAt).getTime() + FORGOT_PAD_MIN * 60000
  return new Date(Math.min(base, new Date(now).getTime())).toISOString()
}

// ---- Format tampilan (angka Indonesia: titik ribuan, koma desimal) ----

function num(v, d) {
  const s = d == null ? String(+Number(v).toFixed(2)) : Number(v).toFixed(d)
  const [a, b] = s.split('.')
  return a.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (b ? `,${b}` : '')
}

export const kgText = (w) => num(w)
export const setText = ([w, r]) => `${kgText(w)} × ${r}`
export function restText(sec) {
  const m = sec / 60
  return `${Number.isInteger(m) ? m : num(m, 1)} mnt`
}
export const durText = (min) => (min >= 60 ? `${Math.floor(min / 60)} j ${min % 60} m` : `${min} m`)
export const volText = (v) => num(Math.round(v), 0)

export function agoText(on, today) {
  const days = Math.round((new Date(`${today}T00:00:00Z`) - new Date(`${on}T00:00:00Z`)) / DAY_MS)
  if (days <= 0) return 'hari ini'
  if (days === 1) return 'kemarin'
  return `${days} hari lalu`
}
