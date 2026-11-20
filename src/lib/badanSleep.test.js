import { describe, it, expect } from 'vitest'
import { durL, durParts, durMin, blankSleep, fromSleep, fromSleepRead, sleepErrors, sleepPayload, sleepHistory } from './badanSleep.js'

const NOW = { date: '2026-11-20', minutes: 600 }

describe('durasi', () => {
  it('durL', () => {
    expect(durL(403)).toBe('6 j 43 m')
    expect(durL(55)).toBe('55 m')
  })
  it('durParts', () => expect(durParts(403)).toEqual({ h: '6', m: '43' }))
  it('durMin', () => {
    expect(durMin('6', '43')).toBe(403)
    expect(durMin('', '')).toBeNull()
    expect(durMin('6', '75')).toBeNaN()
    expect(durMin('x', '5')).toBeNaN()
    expect(durMin('', '55')).toBe(55)
  })
})

describe('isian', () => {
  it('blankSleep', () => {
    const f = blankSleep(NOW)
    expect(f.date).toBe('2026-11-20')
    expect(f.bedAt).toBe('')
    expect(f.total).toEqual({ h: '', m: '' })
  })
  it('fromSleep & fromSleepRead', () => {
    const s = { sleptOn: '2026-11-19', bedAt: '04:54', wakeAt: '11:37', totalMin: 403, deepMin: 169, lightMin: 179, remMin: 55, score: 87, awakeCount: 0, avgHr: 67, avgHrv: null }
    const f = fromSleep(s)
    expect(f).toMatchObject({ date: '2026-11-19', bedAt: '04:54', total: { h: '6', m: '43' }, deepMin: { h: '2', m: '49' }, score: '87', awakeCount: '0', avgHrv: '' })
    expect(fromSleepRead({ ...s, sleptOn: null }, NOW).date).toBe('2026-11-20')
    expect(fromSleepRead(s, NOW).date).toBe('2026-11-19')
  })
})

describe('sleepErrors', () => {
  const ok = { ...blankSleep(NOW), total: { h: '6', m: '43' } }
  it('aman', () => expect(sleepErrors(ok, NOW.date)).toEqual({}))
  it('tanggal', () => {
    expect(sleepErrors({ ...ok, date: '' }, NOW.date).date).toBe('Tanggalnya belum diisi.')
    expect(sleepErrors({ ...ok, date: '2026-11-21' }, NOW.date).date).toBe('Tanggalnya belum kejadian.')
  })
  it('total kosong', () => {
    expect(sleepErrors(blankSleep(NOW), NOW.date).total).toBe('Lama tidurnya wajib diisi.')
    expect(sleepErrors({ ...blankSleep(NOW), bedAt: '23:30' }, NOW.date).total).toBe('Lama tidurnya wajib diisi.')
    expect(sleepErrors({ ...blankSleep(NOW), bedAt: '23:30', wakeAt: '06:10' }, NOW.date)).toEqual({})
  })
  it('angka ngaco & di luar rentang', () => {
    expect(sleepErrors({ ...ok, total: { h: '6', m: '75' } }, NOW.date).total).toBe('Isi angka aja ya.')
    expect(sleepErrors({ ...ok, score: 'abc' }, NOW.date).score).toBe('Isi angka aja ya.')
    expect(sleepErrors({ ...ok, score: '120' }, NOW.date).score).toBe('Di luar rentang wajar (0–100).')
    expect(sleepErrors({ ...ok, total: { h: '0', m: '30' } }, NOW.date).total).toBe('Di luar rentang wajar (60–960).')
    expect(sleepErrors({ ...ok, avgHr: '20' }, NOW.date).avgHr).toBe('Di luar rentang wajar (30–150).')
  })
})

describe('sleepPayload', () => {
  it('total kosong dihitung dari jam', () => {
    const p = sleepPayload({ ...blankSleep(NOW), bedAt: '23:30', wakeAt: '06:10' }, 'manual')
    expect(p).toMatchObject({ sleptOn: '2026-11-20', bedAt: '23:30', wakeAt: '06:10', totalMin: 400, deepMin: null, score: null, source: 'manual' })
  })
  it('total diisi menang', () => {
    const p = sleepPayload({ ...blankSleep(NOW), total: { h: '6', m: '43' }, score: '87' }, 'scan')
    expect(p).toMatchObject({ totalMin: 403, bedAt: null, score: 87, source: 'scan' })
  })
})

describe('sleepHistory', () => {
  it('gabung per tanggal, turun', () => {
    const w = [{ weighedOn: '2026-11-20', weight: 74 }, { weighedOn: '2026-11-18', weight: 75 }]
    const s = [{ sleptOn: '2026-11-20', totalMin: 400 }, { sleptOn: '2026-11-19', totalMin: 380 }]
    const h = sleepHistory(w, s)
    expect(h.map((r) => r.date)).toEqual(['2026-11-20', '2026-11-19', '2026-11-18'])
    expect(h[0].weighing.weight).toBe(74)
    expect(h[0].sleep.totalMin).toBe(400)
    expect(h[1].weighing).toBeNull()
    expect(h[2].sleep).toBeNull()
  })
})
