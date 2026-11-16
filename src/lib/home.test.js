import { attentionView, dateLine, doneToast, firstName, greeting, homeKey, todayTodoItem, wibNow } from './home.js'

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

describe('Perlu diurus', () => {
  const bill = { kind: 'bill', billId: 2, period: '2026-11', name: 'Cicilan motor', emoji: '🏍️', tint: '#FFE9D6', amount: 1_250_000, status: 'late', lateDays: 4 }
  const invoice = { kind: 'invoice', invoiceId: 7, number: 'INV-7', client: 'PT Maju', amount: 4_500_000, lateDays: 17, daysLeft: 0 }
  const todo = { kind: 'todo', todoId: 3, title: 'Kirim revisi desain APS', occurrence: '2026-11-13', recurring: false, lateDays: 3 }
  const card = { kind: 'card', sourceId: 10, name: 'CC BCA Everyday', bank: 'BCA', dueOn: '2026-11-14', lateDays: 2, daysLeft: 0 }

  it('teks tiap jenis Perlu diurus', () => {
    const v = attentionView(bill)
    expect(v).toMatchObject({ key: 'bill:2:2026-11', emoji: '🏍️', tint: '#FFE9D6', title: 'Cicilan motor', sub: 'Rp1.250.000 · telat 4 hari', tone: 'red', ask: 'Lunas?', doneLabel: 'Lunas', to: '/tabs/menu/bayar-rutin' })
    const soon = (daysLeft) => attentionView({ ...bill, amount: 186_000, status: 'open', lateDays: 0, daysLeft })
    expect(soon(0).sub).toBe('Rp186.000 · jatuh tempo hari ini')
    expect(soon(1).sub).toBe('Rp186.000 · jatuh tempo besok')
    expect(soon(3)).toMatchObject({ sub: 'Rp186.000 · jatuh tempo 3 hari lagi', tone: 'amber' })

    expect(attentionView(invoice)).toMatchObject({ key: 'invoice:7', title: 'PT Maju', sub: 'Rp4.500.000 · invoice telat 17 hari', tone: 'red', ask: null, doneLabel: null, to: '/tabs/menu/invoice/7', emoji: '📄', tint: '#DCEBFF' })
    const inv = (daysLeft) => attentionView({ ...invoice, amount: 27_192_000, lateDays: 0, daysLeft })
    expect(inv(0).sub).toBe('Rp27.192.000 · jatuh tempo hari ini')
    expect(inv(1).sub).toBe('Rp27.192.000 · jatuh tempo besok')
    expect(inv(3)).toMatchObject({ sub: 'Rp27.192.000 · jatuh tempo 3 hari lagi', tone: 'amber' })

    expect(attentionView({ ...todo, lateDays: 1 }).sub).toBe('to-do telat dari kemarin')
    expect(attentionView(todo)).toMatchObject({ key: 'todo:3:2026-11-13', title: 'Kirim revisi desain APS', sub: 'to-do telat 3 hari', tone: 'red', ask: 'Beres?', doneLabel: 'Beres', to: '/tabs/agenda', emoji: '✅', tint: '#E4F7C4' })

    expect(attentionView(card)).toMatchObject({ key: 'card:10:2026-11-14', title: 'CC BCA Everyday', sub: 'Telat 2 hari · jatuh tempo 14 Nov', tone: 'red', ask: 'Udah bayar?', doneLabel: 'Udah bayar', to: '/tabs/uang', emoji: '💳', tint: '#F3E1FF' })
    const cc = (daysLeft, dueOn) => attentionView({ ...card, lateDays: 0, daysLeft, dueOn })
    expect(cc(0, '2026-11-16').sub).toBe('Jatuh tempo hari ini · 16 Nov')
    expect(cc(1, '2026-11-17').sub).toBe('Jatuh tempo besok · 17 Nov')
    expect(cc(3, '2026-11-19')).toMatchObject({ sub: 'Jatuh tempo 3 hari lagi · 19 Nov', tone: 'amber' })

    const budget = { kind: 'budget', categoryId: 2, name: 'Ngopi', emoji: '☕', tint: '#FFF3B8', spent: 255_000, budget: 300_000, level: 'warn' }
    expect(attentionView(budget)).toMatchObject({ sub: 'Budget udah 85% · sisa Rp45.000', tone: 'amber', ask: null, to: '/tabs/menu/budget' })
    expect(attentionView({ ...budget, spent: 345_000, level: 'over' })).toMatchObject({ sub: 'Budget kelewat Rp45.000', tone: 'red' })
  })

  it('toast centang', () => {
    expect(doneToast(bill, true)).toBe('Cicilan motor · lunas ✓')
    expect(doneToast(card, true)).toBe('CC BCA Everyday · udah bayar ✓')
    expect(doneToast(todo, true)).toBe('Kirim revisi desain APS · beres ✓')
    expect(doneToast(bill, false)).toBe('Dibatalin')
  })
})
