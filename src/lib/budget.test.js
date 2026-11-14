import { historyText, perDay, shortDate, usage } from './budget.js'

describe('budget helpers', () => {
  it('spreads a monthly budget over the days of that month', () => {
    expect(perDay(450000, '2026-11')).toBe(15000)
    expect(perDay(310000, '2026-10')).toBe(10000)
    expect(perDay(0, '2026-11')).toBe(0)
  })

  it('marks a category bar yellow from 80% and red once over', () => {
    expect(usage(100000, 450000)).toEqual({ pct: 100000 / 450000, state: '' })
    expect(usage(380000, 450000).state).toBe('warn')
    expect(usage(450000, 450000).state).toBe('warn')
    expect(usage(500000, 450000).state).toBe('over')
  })

  it('describes a budget change for the history list', () => {
    expect(historyText({ from: null, to: 450000 })).toEqual({ text: 'budget dipasang Rp450rb', trend: '' })
    expect(historyText({ from: 450000, to: 600000 })).toEqual({ text: 'Rp450rb → Rp600rb', trend: 'up' })
    expect(historyText({ from: 600000, to: 450000 })).toEqual({ text: 'Rp600rb → Rp450rb', trend: 'down' })
    expect(historyText({ from: 600000, to: 0 })).toEqual({ text: 'Rp600rb → dilepas', trend: '' })
  })

  it('writes a short date', () => {
    expect(shortDate('2026-11-01')).toBe('1 Nov')
    expect(shortDate('2026-12-24')).toBe('24 Des')
  })
})
