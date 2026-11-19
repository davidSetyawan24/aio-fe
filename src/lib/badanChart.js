/** Badan: data garis grafik (hitungan murni). Rata-rata 7 hari pakai badan.js. */
import { addDays, daysBetween } from './agenda.js'
import { avg7, count7 } from './badan.js'

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)
const MIN_SPAN = { visceral: 2, bmr: 6, score: 6 }

/** Per metrik: `daily` (angka asli, lama → baru) dan `avg` (rata-rata 7 hari, cuma yang punya >= 3 timbangan). */
export function chartSeries(rows, keys, range, lastOn) {
  const from = addDays(lastOn, -(range - 1))
  const inRange = rows.filter((r) => r.weighedOn >= from && r.weighedOn <= lastOn).sort((a, b) => a.weighedOn.localeCompare(b.weighedOn))
  const dates = [...new Set(inRange.map((r) => r.weighedOn))]
  const out = {}
  for (const key of keys) {
    const daily = inRange.filter((r) => isNum(r[key])).map((r) => ({ d: r.weighedOn, v: r[key] }))
    const avg = []
    for (const d of dates) {
      if (count7(rows, d) < 3) continue
      const v = avg7(rows, key, d)
      if (v != null) avg.push({ d, v })
    }
    out[key] = { daily, avg }
  }
  return out
}

/** Titik rata-rata → potongan garis; bolong > `maxGap` hari = garis putus (nggak ditarik lurus nyebrangin). */
export function gapSegments(pts, maxGap = 7) {
  const out = []
  for (const p of pts) {
    const seg = out.at(-1)
    if (seg && daysBetween(seg.at(-1).d, p.d) <= maxGap) seg.push(p)
    else out.push([p])
  }
  return out
}

/** Batas bawah/atas sumbu: span minimal per metrik, ditambah 14% atas-bawah. */
export function scaleFor(values, key, extra = []) {
  const all = [...values, ...extra]
  let lo = Math.min(...all)
  let hi = Math.max(...all)
  const span = Math.max(hi - lo, MIN_SPAN[key] ?? 0.3)
  const mid = (lo + hi) / 2
  lo = mid - span / 2 - span * 0.14
  hi = mid + span / 2 + span * 0.14
  return { lo, hi }
}

export function niceStep(raw) {
  const p = Math.pow(10, Math.floor(Math.log10(raw)))
  const f = raw / p
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p
}
