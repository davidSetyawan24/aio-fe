import { dateLine, firstName, greeting, homeKey, todayTodoItem, wibNow } from './home.js'

describe('lib/home', () => {
  it('wibNow pakai WIB, bukan jam HP', () => {
    expect(wibNow(new Date('2026-11-15T17:30:00Z'))).toEqual({ date: '2026-11-16', minutes: 30 })
  })

  it('sapaan per jam WIB', () => {
    const n = 'David Setyawan'
    expect(greeting(239, n)).toBe('Malem, David 👋')
    expect(greeting(240, n)).toBe('Pagi, David 👋')
    expect(greeting(659, n)).toBe('Pagi, David 👋')
    expect(greeting(660, n)).toBe('Siang, David 👋')
    expect(greeting(899, n)).toBe('Siang, David 👋')
    expect(greeting(900, n)).toBe('Sore, David 👋')
    expect(greeting(1079, n)).toBe('Sore, David 👋')
    expect(greeting(1080, n)).toBe('Malem, David 👋')
    expect(greeting(480, '')).toBe('Pagi 👋')
    expect(greeting(480, null)).toBe('Pagi 👋')
    expect(firstName('  David Setyawan ')).toBe('David')
  })

  it('tanggal', () => {
    expect(dateLine('2026-11-16')).toBe('Senin, 16 November')
  })

  it('kunci item', () => {
    expect(homeKey({ kind: 'bill', billId: 3, period: '2026-11' })).toBe('bill:3:2026-11')
    expect(homeKey({ kind: 'card', sourceId: 2, dueOn: '2026-11-14' })).toBe('card:2:2026-11-14')
    expect(homeKey({ kind: 'todo', todoId: 5, occurrence: '2026-11-12' })).toBe('todo:5:2026-11-12')
    expect(homeKey({ kind: 'invoice', invoiceId: 7 })).toBe('invoice:7')
    expect(homeKey({ kind: 'budget', categoryId: 4 })).toBe('budget:4')
  })

  it('todayTodoItem', () => {
    const row = { id: 5, title: 'Beli galon', occurrence: '2026-11-16', repeat: { freq: 'daily', days: [], until: null } }
    expect(todayTodoItem(row)).toEqual({ kind: 'todo', todoId: 5, title: 'Beli galon', occurrence: '2026-11-16', recurring: true })
    expect(todayTodoItem({ ...row, repeat: { freq: 'none' } }).recurring).toBe(false)
  })
})
