import { attentionKey, attentionText, changeLabel, dayCaption, pct } from './overview.js'

const bill = { kind: 'bill', billId: 2, period: '2026-11', name: 'Cicilan motor', emoji: '🛵', tint: '#DCEBFF', amount: 1_250_000, dueOn: '2026-11-12', status: 'late', lateDays: 3, daysLeft: 0 }
const card = { kind: 'card', sourceId: 10, name: 'CC BCA', bank: 'BCA', dueOn: '2026-11-17', daysLeft: 2 }
const budget = { kind: 'budget', categoryId: 3, name: 'Ngopi', emoji: '☕', tint: '#FFF3B8', spent: 312_000, budget: 350_000, level: 'warn' }

describe('attentionText', () => {
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
