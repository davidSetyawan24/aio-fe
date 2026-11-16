import { attentionView, dateLine, doneToast, durationText, eventFinished, eventSub, eventTime, firstName, footerText, greeting, homeKey, nextChip, splitToday, todayTodoItem, wibNow } from './home.js'

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

describe('Hari ini', () => {
  const ev = (o) => ({ id: 1, title: 'A', allDay: false, startTime: '10:00', endTime: '11:00', location: null, occurrence: '2026-11-16', dayIndex: 1, dayCount: 1, ...o })

  it('durasi', () => {
    expect(durationText(60)).toBe('1 jam')
    expect(durationText(30)).toBe('30 mnt')
    expect(durationText(90)).toBe('1 jam 30 mnt')
  })

  it('jam & keterangan acara kayak Agenda', () => {
    const e = ev({ endTime: '11:30', location: 'Kantor APS' })
    expect(eventTime(e)).toEqual({ main: '10:00', sub: '11:30' })
    expect(eventSub(e)).toBe('Kantor APS · 1 jam 30 mnt')
    expect(eventSub(ev({ endTime: '10:30' }))).toBe('30 mnt')
    const all = ev({ allDay: true, dayIndex: 2, dayCount: 3, location: 'Bali' })
    expect(eventTime(all)).toEqual({ main: 'Seharian', sub: 'hari 2/3' })
    expect(eventSub(all)).toBe('Bali')
    expect(eventTime(ev({ allDay: true }))).toEqual({ main: 'Seharian', sub: '' })
    expect(eventTime(ev({ startTime: '19:00', dayCount: 3 }))).toEqual({ main: '19:00', sub: 'hari 1/3' })
    expect(eventTime(ev({ endTime: '10:00', dayIndex: 3, dayCount: 3 }))).toEqual({ main: 's.d. 10:00', sub: 'hari 3/3' })
    expect(eventTime(ev({ dayIndex: 2, dayCount: 3 }))).toEqual({ main: 'Seharian', sub: 'hari 2/3' })
    expect(eventSub(ev({ dayCount: 3, location: 'Bali' }))).toBe('Bali')
    expect(eventSub(ev({ dayCount: 3 }))).toBe('')
  })

  it('acara selesai', () => {
    expect(eventFinished(ev(), 659)).toBe(false)
    expect(eventFinished(ev(), 660)).toBe(true)
    expect(eventFinished(ev({ allDay: true }), 1400)).toBe(false)
    expect(eventFinished(ev({ dayIndex: 2, dayCount: 3 }), 1400)).toBe(false)
    expect(eventFinished(ev({ endTime: '10:00', dayIndex: 3, dayCount: 3 }), 600)).toBe(true)
    expect(eventFinished(ev({ endTime: '10:00', dayIndex: 3, dayCount: 3 }), 599)).toBe(false)
  })

  it('chip acara terdekat', () => {
    const all = ev({ id: 9, allDay: true })
    const a = ev({ id: 1 })
    expect(nextChip([all, a], 492)).toEqual({ key: '1:2026-11-16', text: '1 jam lagi' })
    expect(nextChip([all, ev({ id: 2, startTime: '10:30', endTime: '11:30' })], 492).text).toBe('2 jam lagi')
    expect(nextChip([all, a], 555).text).toBe('45 mnt lagi')
    expect(nextChip([all, a], 620).text).toBe('Lagi jalan')
    const b = ev({ id: 2, startTime: '13:00', endTime: '14:00' })
    expect(nextChip([a, b], 700)).toEqual({ key: '2:2026-11-16', text: '1 jam lagi' })
    expect(nextChip([all], 100)).toBeNull()
    expect(nextChip([], 100)).toBeNull()
  })

  it('bagi 4 baris', () => {
    const n = (c) => Array.from({ length: c }, (_, i) => i)
    const r = (nE, nT) => {
      const s = splitToday(n(nE), n(nT))
      return [s.events.length, s.todos.length, s.hiddenEvents, s.hiddenTodos]
    }
    expect(r(3, 3)).toEqual([2, 2, 1, 1])
    expect(r(1, 5)).toEqual([1, 3, 0, 2])
    expect(r(5, 0)).toEqual([4, 0, 1, 0])
    expect(r(3, 1)).toEqual([3, 1, 0, 0])
  })

  it('footer', () => {
    expect(footerText(1, 2)).toBe('1 acara · 2 to-do lagi di Agenda')
    expect(footerText(0, 2)).toBe('2 to-do lagi di Agenda')
    expect(footerText(1, 0)).toBe('1 acara lagi di Agenda')
    expect(footerText(0, 0)).toBe('Buka Agenda')
  })
})
