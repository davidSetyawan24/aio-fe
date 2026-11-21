import { describe, expect, it } from 'vitest'
import {
  agoText, bestSet, cmpSet, durText, e1rm, flatCount, forgotSuggest, kgText, livePr, prOf,
  recordOf, restText, setText, volText, volume, weekStart, wibDate,
} from './gym'

const set = (id, w, r) => ({ id, exerciseId: 1, weight: w, reps: r, doneAt: '2026-11-02T11:00:00Z' })
const sess = (id, sets, endedAt = 'x') => ({ id, endedAt, sets: sets.map(([w, r], i) => set(id * 10 + i, w, r)) })
const s1 = sess(1, [[20, 10], [20, 10], [20, 9]])
const s2 = sess(2, [[22.5, 8], [22.5, 8], [22.5, 7]])
const s3 = sess(3, [[22.5, 10], [22.5, 9], [22.5, 9]])

describe('tanggal WIB', () => {
  it('wibDate lewat tengah malam', () => {
    expect(wibDate('2026-11-17T17:30:00Z')).toBe('2026-11-18')
    expect(wibDate('2026-11-17T16:59:00Z')).toBe('2026-11-17')
  })
  it('weekStart Senin', () => {
    expect(weekStart('2026-11-22')).toBe('2026-11-16')
    expect(weekStart('2026-11-16')).toBe('2026-11-16')
  })
})

describe('hitungan', () => {
  it('volume, bestSet, cmpSet', () => {
    expect(volume([{ weight: 25, reps: 8 }, { weight: 25, reps: 8 }, { weight: 25, reps: 7 }])).toBe(575)
    expect(bestSet([[22.5, 8], [22.5, 10], [20, 12]])).toEqual([22.5, 10])
    expect(bestSet([])).toBeNull()
    expect(cmpSet([22.5, 10], [22.5, 10])).toBe(0)
    expect(cmpSet([20, 12], [22.5, 8])).toBe(-1)
    expect(cmpSet([25, 8], [22.5, 10])).toBe(1)
  })
  it('e1rm Epley', () => {
    expect(e1rm(22.5, 10)).toBe(30)
    expect(e1rm(25, 7)).toBe(31)
    expect(e1rm(100, 1)).toBe(100)
  })
  it('recordOf + prOf', () => {
    const rec = recordOf(1, [s1, s2, s3])
    expect(rec).toEqual({ maxWeight: 22.5, repsAt: { 20: 10, 22.5: 10 } })
    expect(recordOf(1, [])).toBeNull()
    expect(prOf([25, 8], rec)).toEqual({ kind: 'beban', set: [25, 8], prev: 22.5 })
    expect(prOf([22.5, 10], recordOf(1, [s1, s2]))).toEqual({ kind: 'reps', set: [22.5, 10], prev: 8 })
    expect(prOf([22.5, 8], recordOf(1, [s1]))).toEqual({ kind: 'beban', set: [22.5, 8], prev: 20 })
    expect(prOf([20, 10], null)).toBeNull()
    expect(prOf([22.5, 10], rec)).toBeNull()
  })
  it('flatCount', () => {
    const pts = (ws) => ws.map((w) => ({ best: [w, 8] }))
    expect(flatCount(pts([20, 22.5, 22.5]))).toBe(2)
    expect(flatCount(pts([30, 30, 30, 30, 30, 30]))).toBe(6)
    expect(flatCount(pts([30, 30, 27.5, 30]))).toBe(1)
    expect(flatCount([])).toBe(0)
  })
  it('forgotSuggest', () => {
    const start = '2026-11-23T11:00:00Z'
    expect(forgotSuggest(start, '2026-11-23T12:17:00Z', '2026-11-23T14:00:00Z')).toBe('2026-11-23T12:22:00.000Z')
    expect(forgotSuggest(start, '2026-11-23T12:17:00Z', '2026-11-23T12:20:00Z')).toBe('2026-11-23T12:20:00.000Z')
    expect(forgotSuggest(start, null, '2026-11-23T14:00:00Z')).toBe('2026-11-23T11:05:00.000Z')
  })
})

describe('livePr', () => {
  const rec = { maxWeight: 22.5, repsAt: { 20: 10, 22.5: 10 } }
  it('aturan PR sesi live', () => {
    expect(livePr([25, 8], rec, null).kind).toBe('beban')
    expect(livePr([25, 8], rec, [25, 8])).toBeNull()
    expect(livePr([25, 9], rec, [25, 8]).kind).toBe('beban')
    expect(livePr([22.5, 9], rec, null)).toBeNull()
  })
})

describe('format', () => {
  it('kgText & setText', () => {
    expect(kgText(22.5)).toBe('22,5')
    expect(kgText(25)).toBe('25')
    expect(kgText(102.5)).toBe('102,5')
    expect(setText([22.5, 8])).toBe('22,5 × 8')
  })
  it('restText', () => {
    expect(restText(120)).toBe('2 mnt')
    expect(restText(90)).toBe('1,5 mnt')
  })
  it('durText', () => {
    expect(durText(72)).toBe('1 j 12 m')
    expect(durText(45)).toBe('45 m')
    expect(durText(60)).toBe('1 j 0 m')
  })
  it('volText', () => {
    expect(volText(5642)).toBe('5.642')
    expect(volText(575.4)).toBe('575')
  })
  it('agoText', () => {
    expect(agoText('2026-11-20', '2026-11-21')).toBe('kemarin')
    expect(agoText('2026-11-14', '2026-11-21')).toBe('7 hari lalu')
    expect(agoText('2026-11-21', '2026-11-21')).toBe('hari ini')
  })
})
