import { attentionKey, attentionText, changeLabel, dayCaption, dayExpenses, dayTitle, defaultDay, jatahNote, pct } from './overview.js'

const bill = { kind: 'bill', billId: 2, period: '2026-11', name: 'Cicilan motor', emoji: '🛵', tint: '#DCEBFF', amount: 1_250_000, dueOn: '2026-11-12', status: 'late', lateDays: 3, daysLeft: 0 }
const card = { kind: 'card', sourceId: 10, name: 'CC BCA', bank: 'BCA', dueOn: '2026-11-17', daysLeft: 2, lateDays: 0 }
const budget = { kind: 'budget', categoryId: 3, name: 'Ngopi', emoji: '☕', tint: '#FFF3B8', spent: 312_000, budget: 350_000, level: 'warn' }

describe('attentionText', () => {
  it('kartu kredit telat merah', () => {
    const late = { kind: 'card', sourceId: 2, name: 'BCA', dueOn: '2026-11-14', daysLeft: 0, lateDays: 2 }
    expect(attentionText(late)).toEqual({ title: 'Tagihan BCA', sub: 'Kartu kredit · telat 2 hari', tone: 'red' })
  })

  it('Bayar Rutin telat merah, mau jatuh tempo kuning', () => {
    expect(attentionText(bill)).toEqual({ title: 'Cicilan motor', sub: 'Bayar rutin · telat 3 hari · Rp1.250.000', tone: 'red' })
    const soon = { ...bill, name: 'iCloud 200GB', amount: 15_000, status: 'open', lateDays: 0, daysLeft: 3 }
    expect(attentionText(soon)).toEqual({ title: 'iCloud 200GB', sub: 'Bayar rutin · 3 hari lagi · Rp15.000', tone: 'amber' })
    expect(attentionText({ ...soon, daysLeft: 1 }).sub).toBe('Bayar rutin · besok · Rp15.000')
    expect(attentionText({ ...soon, daysLeft: 0 }).sub).toBe('Bayar rutin · hari ini · Rp15.000')
  })

  it('kartu kredit jatuh tempo', () => {
    expect(attentionText(card)).toEqual({ title: 'Tagihan CC BCA', sub: 'Kartu kredit · jatuh tempo 2 hari lagi', tone: 'amber' })
    expect(attentionText({ ...card, daysLeft: 1 }).sub).toBe('Kartu kredit · jatuh tempo besok')
    expect(attentionText({ ...card, daysLeft: 0 }).sub).toBe('Kartu kredit · jatuh tempo hari ini')
  })

  it('budget mepet / kelewat', () => {
    expect(attentionText(budget, 16)).toEqual({ title: 'Ngopi udah 89% budget', sub: 'Atur budget · sisa Rp38.000 buat 16 hari', tone: 'amber' })
    expect(attentionText(budget).sub).toBe('Atur budget · sisa Rp38.000')
    expect(attentionText({ ...budget, spent: 350_000 }, 1).sub).toBe('Atur budget · sisa Rp0 buat 1 hari')
    const over = { ...budget, name: 'Makan', spent: 780_000, budget: 600_000, level: 'over' }
    expect(attentionText(over, 16)).toEqual({ title: 'Makan kelewat budget', sub: 'Atur budget · kelewat Rp180.000', tone: 'red' })
  })
})

describe('attentionKey', () => {
  it('unik per jenis', () => {
    expect(attentionKey(bill)).toBe('bill:2:2026-11')
    expect(attentionKey(card)).toBe('card:10:2026-11-17')
    expect(attentionKey(budget)).toBe('budget:3')
  })
})

describe('changeLabel', () => {
  it('turun / naik dibanding bulan sebelumnya', () => {
    expect(changeLabel(-8, '2026-09')).toBe('▼ 8% dari September')
    expect(changeLabel(12, '2026-09')).toBe('▲ 12% dari September')
    expect(changeLabel(0, '2026-09')).toBe('sama kayak September')
    expect(changeLabel(null, '2026-09')).toBe('')
  })
})

describe('pct', () => {
  it('persen dibulatin, total 0 → 0', () => {
    expect(pct(312, 1105)).toBe(28)
    expect(pct(5, 0)).toBe(0)
  })
})

describe('dayCaption', () => {
  it('tanggal · keluar · jatah', () => {
    expect(dayCaption({ date: '2026-11-12', total: 160_000, jatah: 72_000 })).toBe('12 Nov · Rp160.000 · jatah Rp72.000')
    expect(dayCaption({ date: '2026-11-03', total: 0, jatah: null })).toBe('3 Nov · Rp0')
  })
})

describe('rincian per hari', () => {
  const nowData = { isCurrent: true, today: '2026-11-24', daily: [{ date: '2026-11-01' }, { date: '2026-11-30' }] }
  it('defaultDay: bulan ini → hari ini, bulan lalu → tanggal terakhir', () => {
    expect(defaultDay(nowData)).toBe('2026-11-24')
    expect(defaultDay({ ...nowData, isCurrent: false, daily: [{ date: '2026-10-01' }, { date: '2026-10-31' }] })).toBe('2026-10-31')
  })
  it('dayTitle', () => {
    expect(dayTitle('2026-11-24', true)).toBe('Hari ini · Selasa, 24 Nov')
    expect(dayTitle('2026-11-09', false)).toBe('Senin, 9 Nov')
  })
  it('jatahNote: hari ini sisa / kelewat', () => {
    expect(jatahNote({ total: 18_100, jatah: 71_500 }, true)).toEqual({ jatah: 71_500, label: 'sisa Rp53.400', tone: 'good' })
    expect(jatahNote({ total: 80_000, jatah: 71_500 }, true)).toEqual({ jatah: 71_500, label: 'kelewat Rp8.500', tone: 'bad' })
  })
  it('jatahNote: hari lewat hemat / kelewat / pas', () => {
    expect(jatahNote({ total: 60_000, jatah: 75_000 }, false)).toEqual({ jatah: 75_000, label: 'hemat Rp15.000', tone: 'good' })
    expect(jatahNote({ total: 160_000, jatah: 72_000 }, false)).toEqual({ jatah: 72_000, label: 'kelewat Rp88.000', tone: 'bad' })
    expect(jatahNote({ total: 72_000, jatah: 72_000 }, false)).toEqual({ jatah: 72_000, label: 'pas jatah', tone: '' })
  })
  it('jatahNote: tanpa budget → null', () => {
    expect(jatahNote({ total: 10_000, jatah: null }, false)).toBeNull()
  })
  it('dayExpenses: filter tanggal, urutan tetep, null aman', () => {
    const list = [{ id: 3, spentOn: '2026-11-09' }, { id: 2, spentOn: '2026-11-08' }, { id: 1, spentOn: '2026-11-09' }]
    expect(dayExpenses(list, '2026-11-09').map((e) => e.id)).toEqual([3, 1])
    expect(dayExpenses(undefined, '2026-11-09')).toEqual([])
  })
})
