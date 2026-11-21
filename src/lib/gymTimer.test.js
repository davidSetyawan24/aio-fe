import { mss, plus30, startTimer, timerView } from './gymTimer.js'

describe('gymTimer', () => {
  const t0 = 1_000_000
  it('startTimer: selesai = sekarang + istirahat', () => {
    expect(startTimer(120, 'Shoulder Press', t0)).toEqual({ endAt: t0 + 120_000, total: 120, name: 'Shoulder Press', beeped: false })
  })

  it('timerView: jalan → sisa dibulatin ke atas', () => {
    const t = startTimer(120, 'X', t0)
    expect(timerView(t, t0 + 13_000)).toMatchObject({ state: 'run', left: 107, over: 0 })
    expect(timerView(t, t0 + 13_400).left).toBe(107)
    expect(timerView(t, t0).ratio).toBe(1)
    expect(timerView(t, t0 + 60_000).ratio).toBeCloseTo(0.5)
  })

  it('timerView: lewat → done + lewat berapa detik', () => {
    const t = startTimer(120, 'X', t0)
    expect(timerView(t, t0 + 143_000)).toMatchObject({ state: 'done', over: 23, left: 0 })
    expect(timerView(t, t0 + 120_000)).toMatchObject({ state: 'done', over: 0 })
  })

  it('plus30: total & sisa nambah 30, bunyi boleh lagi', () => {
    const t = { ...startTimer(120, 'X', t0), beeped: true }
    const p = plus30(t)
    expect(p).toMatchObject({ total: 150, endAt: t.endAt + 30_000, beeped: false })
    expect(timerView(p, t0 + 13_000).left).toBe(137)
    expect(t.total).toBe(120)
  })

  it('mss: m:ss', () => {
    expect(mss(107)).toBe('1:47')
    expect(mss(23)).toBe('0:23')
    expect(mss(600)).toBe('10:00')
  })
})
