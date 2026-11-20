import { describe, it, expect } from 'vitest'
import {
  METRIC_KEYS, METRICS, BODY_TYPES, ARAH, bodyTypeFromZepp,
  avg7, count7, weekDelta, tone, startValue, progress, weightGoal, eta, etaFor,
  checkFlags, bodySummary,
  suggestLevel, paceRange, paceStatus, paceEta, foodPlan, clockSpan, sleepSummary,
  LEVEL_INFO, WORK_INFO, PACE_INFO, PACE_STATE, ADEC, METRIC_LABEL, UNIT, ARAH_INFO, CHART_ORDER, DEFAULT_ON, fmt, monthLabel,
} from './badan.js'

const F = [
  ['2026-11-01', 75.0, 30.0, 52.0], ['2026-11-02', 74.8, 29.8, 52.1], ['2026-11-04', 74.6, 29.9, 52.0],
  ['2026-11-07', 74.4, 29.5, 52.2], ['2026-11-08', 74.2, 29.4, 52.3], ['2026-11-10', 74.0, 29.2, 52.3],
  ['2026-11-14', 73.6, 29.0, 52.4],
].map(([weighedOn, weight, fat, muscle]) => ({ weighedOn, weighedAt: '06:00', weight, fat, muscle }))
const T = { arah: 'cutting', fat: 22, muscle: null, weightMin: 65, weightMax: 69, startedOn: '2026-11-01' }

describe('konstanta', () => {
  it('kunci, rentang, tipe, arah', () => {
    expect(METRIC_KEYS).toEqual(['weight', 'fat', 'muscle', 'water', 'visceral', 'bone', 'protein', 'bmr', 'bmi', 'score'])
    expect(METRICS.weight).toEqual({ dec: 2, min: 20, max: 300 })
    expect(METRICS.bmr).toEqual({ dec: 0, min: 500, max: 5000 })
    expect(BODY_TYPES).toHaveLength(9)
    expect(ARAH).toEqual(['recomp', 'jaga', 'cutting', 'bulking'])
    expect(CHART_ORDER).toEqual(['fat', 'muscle', 'weight', 'sleep', 'water', 'visceral', 'bone', 'protein', 'bmr', 'bmi', 'score'])
    expect(DEFAULT_ON).toEqual(['fat', 'muscle', 'weight'])
    expect(METRIC_LABEL.fat).toEqual(['Lemak tubuh', 'Lemak'])
    expect(UNIT.bmr).toBe('kkal')
    expect(ADEC).toEqual({ weight: 1, fat: 1, muscle: 1, water: 1, visceral: 1, bone: 2, protein: 1, bmr: 0, bmi: 1, score: 0 })
    expect(ARAH_INFO.jaga.t).toBe('Pertahanin badan yang sekarang.')
  })
  it('bodyTypeFromZepp', () => {
    expect(bodyTypeFromZepp('Balanced-muscular')).toBe('balanced_muscular')
    expect(bodyTypeFromZepp('thick set')).toBe('thick_set')
    expect(bodyTypeFromZepp('???')).toBeNull()
    expect(bodyTypeFromZepp(null)).toBeNull()
  })
})

describe('tampilan', () => {
  it('fmt & monthLabel', () => {
    expect(fmt(74.9, 2)).toBe('74,90')
    expect(fmt(null, 1)).toBe('–')
    expect(monthLabel('2027-05')).toBe('Mei 2027')
  })
})

describe('avg7 / count7 / weekDelta', () => {
  it('rata-rata & jumlah', () => {
    expect(avg7(F, 'weight', '2026-11-14')).toBeCloseTo(73.9333, 4)
    expect(count7(F, '2026-11-14')).toBe(3)
    expect(avg7(F, 'fat', '2026-11-07')).toBeCloseTo(29.8, 4)
    expect(avg7(F, 'weight', '2026-10-31')).toBeNull()
  })
  it('selisih mingguan', () => {
    expect(weekDelta(F, 'weight', '2026-11-14')).toBeCloseTo(-0.7667, 4)
    expect(weekDelta(F, 'fat', '2026-11-14')).toBeCloseTo(-0.6, 4)
    expect(weekDelta(F, 'muscle', '2026-11-14')).toBeCloseTo(0.2583, 4)
    expect(weekDelta(F, 'weight', '2026-11-02')).toBeNull()
  })
})

describe('tone', () => {
  it('aturan arah', () => {
    expect(tone('cutting', 'weight', -0.7)).toBe('good')
    expect(tone('bulking', 'weight', -0.7)).toBe('bad')
    expect(tone('recomp', 'weight', -0.7)).toBe('neutral')
    expect(tone('jaga', 'fat', 0.3)).toBe('bad')
    expect(tone(null, 'fat', -1)).toBe('neutral')
    expect(tone('recomp', 'water', -1)).toBe('neutral')
    expect(tone('cutting', 'fat', 0)).toBe('neutral')
    expect(tone('cutting', 'muscle', 0.2)).toBe('good')
  })
})

describe('startValue / progress / weightGoal', () => {
  it('startValue', () => {
    expect(startValue(F, 'weight', '2026-11-01')).toBe(75)
    expect(startValue(F, 'weight', '2026-10-20')).toBe(75)
    expect(startValue(F, 'weight', '2026-12-31')).not.toBeNull()
    expect(startValue([], 'weight', '2026-11-01')).toBeNull()
  })
  it('progress', () => {
    const p = progress(30, 29.2, 22)
    expect(p.pct).toBe(10)
    expect(p.left).toBeCloseTo(7.2, 4)
    expect(p.reached).toBe(false)
    expect(progress(30, 21.5, 22)).toEqual({ pct: 100, left: 0, reached: true })
  })
  it('weightGoal cutting progress', () => {
    const g = weightGoal(T, F, '2026-11-14')
    expect(g).toMatchObject({ mode: 'reach', state: 'progress', goal: 69, pct: 18 })
    expect(g.left).toBeCloseTo(4.9333, 4)
  })
  it('weightGoal keep', () => {
    expect(weightGoal({ ...T, arah: 'recomp', weightMin: 73, weightMax: 75 }, F, '2026-11-14')).toMatchObject({ mode: 'keep', inRange: true })
    expect(weightGoal({ ...T, arah: 'recomp' }, F, '2026-11-14')).toMatchObject({ mode: 'keep', inRange: false })
  })
  it('weightGoal below / above / null', () => {
    const low = [{ weighedOn: '2026-11-14', weight: 64.5 }]
    expect(weightGoal(T, low, '2026-11-14').state).toBe('below')
    expect(weightGoal({ ...T, arah: 'bulking' }, [{ weighedOn: '2026-11-14', weight: 73.9 }], '2026-11-14').state).toBe('above')
    expect(weightGoal({ ...T, weightMin: null, weightMax: null }, F, '2026-11-14')).toBeNull()
    expect(weightGoal(null, F, '2026-11-14')).toBeNull()
  })
})

describe('eta', () => {
  const rows = Array.from({ length: 43 }, (_, i) => ({
    weighedOn: new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10), weight: 80 - 0.05 * i,
  }))
  it('perkiraan', () => {
    expect(eta(rows, 'weight', '2026-11-12', 69)).toBe('2027-05')
    expect(eta(rows, 'weight', '2026-11-12', 79)).toBeNull()
    expect(eta(rows.slice(0, 20), 'weight', '2026-11-12', 69)).toBeNull()
    expect(eta(rows, 'weight', '2026-11-12', 10)).toBeNull()
  })
  it('etaFor', () => {
    const t = { arah: 'cutting', fat: null, muscle: null, weightMin: 65, weightMax: 69, startedOn: '2026-10-01' }
    expect(etaFor(t, rows, '2026-11-12')).toEqual({ key: 'weight', month: '2027-05' })
    expect(etaFor(null, rows, '2026-11-12')).toBeNull()
  })
})

describe('checkFlags', () => {
  const real = { weighedOn: '2026-01-23', weight: 74.9, score: 56, bmi: 27.2, fat: 25.6, water: 51.0, bmr: 1650, visceral: 10, bone: 2.83, muscle: 52.85, protein: 19.5 }
  it('kasus dasar', () => {
    expect(checkFlags(real, null, '2026-01-23')).toEqual([])
    expect(checkFlags({ ...real, fat: 2.56 }, null, '2026-01-23')).toEqual(['fat', 'muscle', 'bone'])
    expect(checkFlags({ ...real, visceral: null }, null, '2026-01-23')).toEqual(['visceral'])
    expect(checkFlags({ ...real, bmr: 16500 }, null, '2026-01-23')).toEqual(['bmr'])
  })
  it('loncatan', () => {
    expect(checkFlags(real, { ...real, weighedOn: '2026-01-20', weight: 70.0 }, '2026-01-23')).toContain('weight')
    expect(checkFlags(real, { ...real, weighedOn: '2026-01-03', weight: 70.0 }, '2026-01-23')).not.toContain('weight')
  })
})

describe('bodySummary', () => {
  it('kosong', () => expect(bodySummary([], null)).toBeNull())
  it('ringkasan', () => {
    const s = bodySummary(F, T)
    expect(s).toMatchObject({ lastOn: '2026-11-14', from: '2026-11-08', to: '2026-11-14', arah: 'cutting' })
    expect(s.tones).toMatchObject({ weight: 'good', fat: 'good', muscle: 'good' })
    expect(s.spark).toHaveLength(5)
    expect(s.spark.at(-1)).toBeCloseTo(29.2, 4)
    expect(s.count).toBe(3)
  })
  it('count = banyaknya timbangan di 7 hari terakhir (1 timbangan → 1)', () => {
    expect(bodySummary([F[0]], null).count).toBe(1)
    expect(bodySummary(F.slice(0, 2), null).count).toBe(2)
  })
})

/* v2 */
const day = (i) => new Date(Date.UTC(2026, 10, 1 + i)).toISOString().slice(0, 10)
const DAVID = Array.from({ length: 7 }, (_, i) => ({ weighedOn: `2026-11-${14 + i}`, weighedAt: '06:00', weight: 74.9, fat: 25.6, bmr: 1650 }))
const ACT = { workType: 'stand_walk', workHours: 10, workDays: 7, gymPerWeek: 5, gymMinutes: 75, otherSport: null, notes: null, level: 'active', levelManual: false }
const DT = { arah: 'cutting', pace: 'normal', fat: 20, muscle: 55, weightMin: 65, weightMax: 69, startedOn: '2026-11-14' }
const TREN = Array.from({ length: 20 }, (_, i) => ({ weighedOn: day(i), weighedAt: '06:00', weight: 76 - 0.07 * i }))
const TT = { arah: 'cutting', pace: 'normal', fat: null, muscle: null, weightMin: 65, weightMax: 69, startedOn: '2026-11-01' }

describe('suggestLevel', () => {
  it.each([
    [{ workType: 'sit', workHours: 8, workDays: 5, gymPerWeek: 0 }, 'sedentary'],
    [{ workType: 'sit', workHours: 8, workDays: 5, gymPerWeek: 2 }, 'light'],
    [{ workType: 'sit', workHours: 8, workDays: 5, gymPerWeek: 5 }, 'active'],
    [{ workType: 'stand_walk', workHours: 10, workDays: 7, gymPerWeek: 5 }, 'active'],
    [{ workType: 'stand_walk', workHours: 10, workDays: 7, gymPerWeek: 6 }, 'very_active'],
    [{ workType: 'heavy', workHours: 8, workDays: 6, gymPerWeek: 4 }, 'very_active'],
    [{ workType: 'stand_walk', workHours: 3, workDays: 7, gymPerWeek: 0 }, 'sedentary'],
  ])('%j -> %s', (a, want) => expect(suggestLevel(a)).toBe(want))
})

describe('label v2', () => {
  it('teks', () => {
    expect(LEVEL_INFO.very_active).toBe('Sangat aktif')
    expect(WORK_INFO.stand_walk).toBe('Berdiri & jalan')
    expect(PACE_INFO.agresif).toBe('Agresif')
    expect(PACE_STATE).toEqual({ slow: 'kepelanan', ok: 'pas', fast: 'kecepetan' })
  })
})

describe('foodPlan', () => {
  it('David cutting normal', () => {
    const p = foodPlan(DAVID, DT, ACT)
    expect(p).toMatchObject({ state: 'ok', bmr: 1650, mult: 1.55, tdee: 2557.5, adjust: -515, kcal: 2050, protein: 140, proteinPerKg: 2.5, belowBmr: false, aggressive: false })
    expect(p.lean).toBeCloseTo(55.7256, 3)
  })
  it('agresif + sedentary', () => {
    expect(foodPlan(DAVID, { ...DT, pace: 'agresif' }, { ...ACT, level: 'sedentary' })).toMatchObject({ adjust: -721, kcal: 1250, belowBmr: true, aggressive: true })
  })
  it('bulking normal', () => {
    expect(foodPlan(DAVID, { ...DT, arah: 'bulking' }, ACT)).toMatchObject({ adjust: 309, kcal: 2850, protein: 125, proteinPerKg: 2.2 })
  })
  it('recomp', () => {
    expect(foodPlan(DAVID, { ...DT, arah: 'recomp', pace: null }, ACT)).toMatchObject({ adjust: 0, kcal: 2550, protein: 125 })
  })
  it('state butuh data', () => {
    expect(foodPlan([], DT, ACT).state).toBe('needWeighing')
    expect(foodPlan(DAVID, null, ACT).state).toBe('needTarget')
    expect(foodPlan(DAVID, { ...DT, pace: null }, ACT).state).toBe('needPace')
    expect(foodPlan(DAVID, DT, null).state).toBe('needActivity')
    expect(foodPlan(DAVID.map((r) => ({ ...r, bmr: null })), DT, ACT).state).toBe('needBmr')
  })
})

describe('paceStatus', () => {
  const at = '2026-11-20'
  it('cutting normal pas', () => {
    const s = paceStatus(TT, TREN, at)
    expect(s.actual).toBeCloseTo(0.4725, 4)
    expect(s.lo).toBeCloseTo(0.3744, 4)
    expect(s.hi).toBeCloseTo(0.5616, 4)
    expect(s.state).toBe('ok')
  })
  it('santai fast, agresif slow', () => {
    expect(paceStatus({ ...TT, pace: 'santai' }, TREN, at).state).toBe('fast')
    expect(paceStatus({ ...TT, pace: 'agresif' }, TREN, at).state).toBe('slow')
  })
  it('bulking normal', () => {
    const s = paceStatus({ ...TT, arah: 'bulking' }, TREN, at)
    expect(s.actual).toBeCloseTo(-0.4725, 4)
    expect(s.state).toBe('slow')
  })
  it('data kurang & recomp', () => {
    const s = paceStatus(TT, TREN.filter((r) => r.weighedOn >= '2026-11-11'), at)
    expect(s.actual).toBeNull()
    expect(s.state).toBeNull()
    expect(paceStatus({ ...TT, arah: 'recomp', pace: null }, TREN, at)).toBeNull()
  })
})

describe('paceEta', () => {
  const at = '2026-11-20'
  it('cutting normal', () => {
    expect(paceEta(TT, TREN, at)).toEqual({ goal: 69, now: '2027-02', plan: '2027-02' })
  })
  it('actual <= 0 -> now null', () => {
    expect(paceEta({ ...TT, arah: 'bulking', weightMin: 80, weightMax: 85 }, TREN, at).now).toBeNull()
  })
  it('state in / pace null -> null', () => {
    expect(paceEta({ ...TT, weightMin: 60, weightMax: 80 }, TREN, at)).toBeNull()
    expect(paceEta({ ...TT, pace: null }, TREN, at)).toBeNull()
  })
})

describe('clockSpan & sleepSummary', () => {
  it('lewat tengah malam', () => {
    expect(clockSpan('04:54', '11:37')).toBe(403)
    expect(clockSpan('23:30', '06:10')).toBe(400)
  })
  it('ringkasan 7 malam', () => {
    const s = [['2026-11-20', 403], ['2026-11-19', 380], ['2026-11-17', 360], ['2026-11-12', 300]].map(([sleptOn, totalMin]) => ({ sleptOn, totalMin, bedAt: null, wakeAt: null, score: null }))
    expect(sleepSummary(s)).toMatchObject({ lastOn: '2026-11-20', totalMin: 403, avg7Min: 381, nights: 3 })
    expect(sleepSummary([])).toBeNull()
  })
})

describe('paceRange', () => {
  it('null kalau nggak valid', () => {
    expect(paceRange('recomp', null, 70)).toBeNull()
    expect(paceRange('bulking', 'agresif', 70)).toBeNull()
    expect(paceRange('cutting', 'normal', 100)).toEqual({ lo: 0.5, hi: 0.75, mid: 0.625 })
  })
})
