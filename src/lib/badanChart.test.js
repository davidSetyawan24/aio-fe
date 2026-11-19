import { addDays } from './agenda.js'
import { chartSeries, gapSegments, niceStep, scaleFor } from './badanChart.js'

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
