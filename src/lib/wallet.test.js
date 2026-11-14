import { bankLook, daysUntilDay, formatExpiry, groupSources, parseExpiry, rp, rpShort, summary } from './wallet.js'

const cash = { id: 1, kind: 'cash', bank: null, name: 'Cash', favorite: true }
const jago = { id: 2, kind: 'debit', bank: 'Jago', name: 'Jago Utama', favorite: true }
const bcaDebit = { id: 3, kind: 'debit', bank: 'BCA', name: 'BCA Pribadi', favorite: false }
const bcaCc = { id: 4, kind: 'cc', bank: 'BCA', name: 'BCA Card', creditLimit: 20_000_000, favorite: true }
const bni = { id: 5, kind: 'cc', bank: 'BNI', name: 'BNI Gold', creditLimit: 25_000_000, favorite: false }

describe('groupSources', () => {
  it('splits Cash and groups the rest per bank, keeping the server order', () => {
    const g = groupSources([cash, jago, bcaDebit, bcaCc, bni])
    expect(g.cash).toBe(cash)
    expect(g.banks.map((b) => b.bank)).toEqual(['Jago', 'BCA', 'BNI'])
    expect(g.banks[1]).toMatchObject({ debit: [bcaDebit], cc: [bcaCc] })
  })
})

describe('summary', () => {
  it('counts savings, cards and the total card limit', () => {
    expect(summary([cash, jago, bcaDebit, bcaCc, bni])).toEqual({ debit: 2, cc: 2, totalLimit: 45_000_000 })
  })
})

describe('money', () => {
  it('formats Rupiah', () => {
    expect(rp(20_000_000)).toBe('Rp20.000.000')
    expect(rpShort(20_000_000)).toBe('Rp20jt')
    expect(rpShort(4_200_000)).toBe('Rp4,2jt')
    expect(rpShort(462_000)).toBe('Rp462rb')
    expect(rpShort(900)).toBe('Rp900')
  })
})

describe('expiry', () => {
  it('reads BB/TT and writes it back', () => {
    expect(parseExpiry('08/28')).toEqual({ expMonth: 8, expYear: 2028 })
    expect(parseExpiry('')).toEqual({ expMonth: null, expYear: null })
    expect(parseExpiry('13/28')).toBeUndefined()
    expect(parseExpiry('8/2')).toBeUndefined()
    expect(formatExpiry(8, 2028)).toBe('08/28')
    expect(formatExpiry(null, null)).toBe('')
  })
})

describe('daysUntilDay', () => {
  const today = new Date(2026, 10, 14) // 14 Nov (Nov = 30 hari)
  it('counts to this month or next month', () => {
    expect(daysUntilDay(25, today)).toBe(11)
    expect(daysUntilDay(14, today)).toBe(0)
    expect(daysUntilDay(2, today)).toBe(18)
  })
  it('uses the last day when the month is shorter', () => {
    expect(daysUntilDay(31, today)).toBe(16) // 30 Nov
    expect(daysUntilDay(31, new Date(2027, 1, 20))).toBe(8) // 28 Feb 2027
  })
})

describe('bankLook', () => {
  it('has colours for the usual banks and a fallback', () => {
    expect(bankLook('BCA').short).toBe('BCA')
    expect(bankLook('jago').short).toBe('JG')
    expect(bankLook('Seabank')).toMatchObject({ short: 'SEA' })
  })
})
