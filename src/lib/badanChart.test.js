import { addDays } from './agenda.js'
import { chartSeries, gapSegments, niceStep, scaleFor, sleepSeries } from './badanChart.js'

const LAST = '2026-11-30'
/** 30 hari, satu timbangan per hari, berat 80 → 77 (terbaru paling ringan). */
const rows = Array.from({ length: 30 }, (_, i) => ({ id: i, weighedOn: addDays(LAST, -i), weighedAt: '06:00', weight: 77 + i * 0.1, fat: 25 }))

describe('chartSeries', () => {
  it('avg cuma titik yang punya >= 3 timbangan dalam 7 hari, daily ikut rentang', () => {
    const s = chartSeries(rows, ['weight', 'fat'], 30, LAST)
    expect(s.weight.daily).toHaveLength(30)
    expect(s.weight.daily[0].d < s.weight.daily[29].d).toBe(true)
    expect(s.weight.daily.at(-1)).toEqual({ d: LAST, v: 77 })
    // hari ke-1 dan ke-2 cuma 1-2 timbangan → nggak ada rata-rata
    expect(s.weight.avg[0].d).toBe(addDays(LAST, -27))
    expect(s.weight.avg).toHaveLength(28)
  })
  it('rentang 90 hari nyaring yang lebih lama, data kosong aman', () => {
    const old = [{ id: 1, weighedOn: addDays(LAST, -200), weight: 90 }, ...rows]
    expect(chartSeries(old, ['weight'], 90, LAST).weight.daily).toHaveLength(30)
    expect(chartSeries(old, ['weight'], 365, LAST).weight.daily).toHaveLength(31)
    expect(chartSeries([], ['weight'], 30, LAST).weight).toEqual({ daily: [], avg: [] })
  })
  it('nilai null dilewat', () => {
    const s = chartSeries([{ ...rows[0], visceral: null }], ['visceral'], 30, LAST)
    expect(s.visceral.daily).toEqual([])
  })
})

describe('scaleFor', () => {
  it('span minimum per metrik + padding 14%', () => {
    const f = scaleFor([25, 25], 'fat')
    expect(f.hi - f.lo).toBeCloseTo(0.3 * 1.28)
    expect(scaleFor([9], 'visceral').hi - scaleFor([9], 'visceral').lo).toBeCloseTo(2 * 1.28)
    expect(scaleFor([1600], 'bmr').hi - scaleFor([1600], 'bmr').lo).toBeCloseTo(6 * 1.28)
    const w = scaleFor([70, 80], 'weight')
    expect(w.lo).toBeCloseTo(70 - 1.4)
    expect(w.hi).toBeCloseTo(80 + 1.4)
  })
  it('extra ikut dihitung', () => {
    const w = scaleFor([74, 75], 'weight', [65, 69])
    expect(w.lo).toBeLessThan(65)
    expect(w.hi).toBeGreaterThan(75)
  })
})

describe('niceStep', () => {
  it('bulat enak', () => {
    expect(niceStep(0.8)).toBe(1)
    expect(niceStep(2.2)).toBe(2)
    expect(niceStep(4)).toBe(5)
    expect(niceStep(8)).toBe(10)
    expect(niceStep(0.04)).toBeCloseTo(0.05)
  })
})

describe('gapSegments (garis rata-rata putus di bolong panjang)', () => {
  it('jarak > 7 hari → potongan baru; ≤ 7 hari nyambung', () => {
    const pts = [{ d: '2026-11-01' }, { d: '2026-11-03' }, { d: '2026-11-10' }, { d: '2026-11-18' }, { d: '2026-11-19' }]
    expect(gapSegments(pts).map((s) => s.map((p) => p.d))).toEqual([
      ['2026-11-01', '2026-11-03', '2026-11-10'],
      ['2026-11-18', '2026-11-19'],
    ])
  })
  it('kosong → []', () => expect(gapSegments([])).toEqual([]))
})

describe('sleepSeries', () => {
  const sl = (d, totalMin) => ({ id: d, sleptOn: d, totalMin })
  it('daily = jam per malam (lama → baru), cuma di rentang', () => {
    const sleeps = [sl(LAST, 403), sl(addDays(LAST, -1), 360), sl(addDays(LAST, -40), 420), sl(addDays(LAST, 1), 500)]
    const s = sleepSeries(sleeps, 30, LAST)
    expect(s.daily).toEqual([{ d: addDays(LAST, -1), v: 6 }, { d: LAST, v: 403 / 60 }])
    expect(sleepSeries(sleeps, 90, LAST).daily).toHaveLength(3)
    expect(sleepSeries([], 30, LAST)).toEqual({ daily: [], avg: [] })
  })
  it('avg = rata-rata malam yang ada di d−6…d, cuma kalau ≥ 3 malam', () => {
    // malam: −9, −6, −4, −3, 0 (bolong di antaranya)
    const sleeps = [sl(addDays(LAST, -9), 300), sl(addDays(LAST, -6), 360), sl(addDays(LAST, -4), 420), sl(addDays(LAST, -3), 480), sl(LAST, 400)]
    const s = sleepSeries(sleeps, 30, LAST)
    // −9: 1 malam, −6: 2 malam → nggak ada. −4: (300+360+420)/3, −3: 4 malam (−9..−3), 0: −6..0 = 360,420,480,400
    expect(s.avg).toEqual([
      { d: addDays(LAST, -4), v: 360 / 60 },
      { d: addDays(LAST, -3), v: 390 / 60 },
      { d: LAST, v: 415 / 60 },
    ])
  })
  it('avg ngitung malam sebelum awal rentang juga', () => {
    const sleeps = [sl(addDays(LAST, -31), 300), sl(addDays(LAST, -30), 300), sl(addDays(LAST, -29), 420)]
    expect(sleepSeries(sleeps, 30, LAST).avg).toEqual([{ d: addDays(LAST, -29), v: 340 / 60 }])
  })
  it('bolong > 7 hari → garis rata-ratanya putus', () => {
    const run = (end) => [0, 1, 2, 3].map((i) => sl(addDays(end, -i), 400))
    const sleeps = [...run(LAST), ...run(addDays(LAST, -15))]
    const segs = gapSegments(sleepSeries(sleeps, 30, LAST).avg)
    expect(segs.map((g) => g.length)).toEqual([2, 2])
  })
})
