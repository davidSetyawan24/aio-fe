import { categoryMonthSummary } from './categories.js'

const cats = [{ id: 1, name: 'Makan' }, { id: 2, name: 'Ngopi' }, { id: 3, name: 'Belanja' }]

describe('categoryMonthSummary', () => {
  it('adds up this month and finds the biggest category', () => {
    const s = categoryMonthSummary(cats, { 1: { count: 2, total: 30000 }, 2: { count: 1, total: 50000 } })
    expect(s.total).toBe(80000)
    expect(s.usedCount).toBe(2)
    expect(s.unusedCount).toBe(1)
    expect(s.top).toEqual({ category: cats[1], total: 50000, count: 1 })
  })

  it('has no top category when nothing was spent', () => {
    const s = categoryMonthSummary(cats, {})
    expect(s).toEqual({ total: 0, usedCount: 0, unusedCount: 3, top: null })
  })

  // Review 15/11: catatan dari kategori yang udah dihapus tetep ikut total (sama kayak kartu hitam Duit).
  it('still counts spending under deleted categories in the total', () => {
    const s = categoryMonthSummary(cats, { 1: { count: 1, total: 20000 }, 99: { count: 2, total: 50000 } })
    expect(s.total).toBe(70000)
    expect(s.usedCount).toBe(1)
    expect(s.unusedCount).toBe(2)
    expect(s.top).toEqual({ category: cats[0], total: 20000, count: 1 })
  })
})
