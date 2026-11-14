import { dayLabel, longDay, filterSuggestions, formatAmount, groupByDay, monthName, parseAmount, prevMonth, weekdayShort } from './duit.js'

describe('duit helpers', () => {
  it('reads an amount from whatever was typed or pasted', () => {
    expect(parseAmount('18.000')).toBe(18000)
    expect(parseAmount('Rp 18,000')).toBe(18000)
    expect(parseAmount('abc')).toBe(0)
    expect(parseAmount('')).toBe(0)
    expect(parseAmount(' 0 ')).toBe(0)
    expect(parseAmount(null)).toBe(0)
  })

  it('formats an amount for the big input', () => {
    expect(formatAmount(18000)).toBe('18.000')
    expect(formatAmount(1000000000)).toBe('1.000.000.000')
    expect(formatAmount(0)).toBe('')
  })

  it('names days like a person would', () => {
    expect(dayLabel('2026-11-14', '2026-11-14')).toBe('Hari ini')
    expect(dayLabel('2026-11-13', '2026-11-14')).toBe('Kemarin')
    expect(dayLabel('2026-11-12', '2026-11-14')).toBe('Kamis, 12 Nov')
    expect(dayLabel('2026-11-30', '2026-12-01')).toBe('Kemarin')
    expect(dayLabel('2025-12-31', '2026-11-14')).toBe('Rabu, 31 Des 2025')
    expect(weekdayShort('2026-11-14')).toBe('Sab')
    expect(longDay('2026-11-14')).toBe('Sabtu, 14 Nov')
  })

  it('groups expenses per day with a total, newest day first', () => {
    const e = (id, spentOn, amount) => ({ id, spentOn, amount })
    const groups = groupByDay([e(3, '2026-11-14', 18000), e(2, '2026-11-14', 27000), e(1, '2026-11-12', 212000)], '2026-11-14')
    expect(groups).toEqual([
      { date: '2026-11-14', label: 'Hari ini', total: 45000, items: [e(3, '2026-11-14', 18000), e(2, '2026-11-14', 27000)] },
      { date: '2026-11-12', label: 'Kamis, 12 Nov', total: 212000, items: [e(1, '2026-11-12', 212000)] },
    ])
  })

  it('suggests notes: newest when empty, matching part of the text otherwise', () => {
    const list = ['Superindo', 'Kopi Kenangan', 'Bakmi GM', 'kopi tuku', 'Fore', 'Grab', 'Gojek'].map((note, i) => ({ note, categoryId: i }))
    expect(filterSuggestions(list, '').map((s) => s.note)).toEqual(['Superindo', 'Kopi Kenangan', 'Bakmi GM', 'kopi tuku', 'Fore', 'Grab'])
    expect(filterSuggestions(list, ' KOP ').map((s) => s.note)).toEqual(['Kopi Kenangan', 'kopi tuku'])
    expect(filterSuggestions(list, 'kopi kenangan')).toEqual([])
    expect(filterSuggestions(list, 'xyz')).toEqual([])
  })

  it('steps months back and names them', () => {
    expect(prevMonth('2026-11')).toBe('2026-10')
    expect(prevMonth('2026-01')).toBe('2025-12')
    expect(monthName('2026-10')).toBe('Oktober')
    expect(monthName('2025-12', '2026-11')).toBe('Desember 2025')
  })
})
