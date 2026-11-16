import { fileName, fmtDM, fmtLong, fmtShort, formatNumber, initialsOf, invoiceStatus, rp, rpPaper, sheetModel, statusChip, terbilang, totals } from './invoice.js'

describe('totals', () => {
  it('jumlahin item', () => {
    const items = [{ qty: 1, price: 12000000 }, { qty: 2, price: 3500000 }, { qty: 4, price: 2048000 }]
    expect(totals({ items, discount: 0, taxOn: false, taxPct: 11 })).toEqual({ sub: 27192000, disc: 0, tax: 0, total: 27192000 })
  })
  it('diskon lalu PPN dari sisa', () => {
    expect(totals({ items: [{ qty: 1, price: 27192000 }], discount: 1000000, taxOn: true, taxPct: 11 })).toEqual({ sub: 27192000, disc: 1000000, tax: 2881120, total: 29073120 })
  })
  it('diskon kelewat subtotal', () => {
    expect(totals({ items: [{ qty: 1, price: 1000 }], discount: 5000, taxOn: true, taxPct: 11 })).toEqual({ sub: 1000, disc: 5000, tax: 0, total: 0 })
  })
  it('PPN mati', () => {
    expect(totals({ items: [{ qty: 2, price: 500 }], discount: 0, taxOn: false, taxPct: 11 }).tax).toBe(0)
  })
})

describe('terbilang', () => {
  it.each([
    [27192000, 'dua puluh tujuh juta seratus sembilan puluh dua ribu rupiah'],
    [29073120, 'dua puluh sembilan juta tujuh puluh tiga ribu seratus dua puluh rupiah'],
    [1000, 'seribu rupiah'],
    [11, 'sebelas rupiah'],
    [100, 'seratus rupiah'],
    [1000000, 'satu juta rupiah'],
    [0, 'nol rupiah'],
    [15, 'lima belas rupiah'],
    [2000, 'dua ribu rupiah'],
    [110, 'seratus sepuluh rupiah'],
  ])('%i', (n, words) => expect(terbilang(n)).toBe(words))
})

describe('formatNumber / initialsOf / invoiceStatus', () => {
  it('nomor', () => {
    expect(formatNumber('INV/DS', '2026-11', 2)).toBe('INV/DS/2026/11/002')
    expect(formatNumber('INV/DS', '2026-11', 1000)).toBe('INV/DS/2026/11/1000')
  })
  it('inisial', () => {
    expect(initialsOf('David Setyawan')).toBe('ds')
    expect(initialsOf('David')).toBe('d')
    expect(initialsOf('   ')).toBe('')
  })
  it('status', () => {
    expect(invoiceStatus({ dueOn: '2026-10-30', paidOn: null }, '2026-11-16')).toEqual({ status: 'late', lateDays: 17, daysLeft: 0 })
    expect(invoiceStatus({ dueOn: '2026-11-18', paidOn: null }, '2026-11-16')).toEqual({ status: 'open', lateDays: 0, daysLeft: 2 })
    expect(invoiceStatus({ dueOn: '2026-10-30', paidOn: '2026-11-01' }, '2026-11-16')).toEqual({ status: 'paid', lateDays: 0, daysLeft: 0 })
  })
})

describe('format', () => {
  it('uang & tanggal', () => {
    expect(rp(27192000)).toBe('Rp27.192.000')
    expect(rpPaper(27192000)).toBe('Rp 27.192.000')
    expect(fmtLong('2026-11-18')).toBe('18 November 2026')
    expect(fmtShort('2026-11-18')).toBe('18 Nov 2026')
    expect(fmtDM('2026-11-18')).toBe('18 Nov')
    expect(fileName('INV/DS/2026/11/001')).toBe('INV-DS-2026-11-001.pdf')
  })
})

describe('statusChip', () => {
  const chip = (over) => statusChip({ status: 'open', lateDays: 0, daysLeft: 9, dueOn: '2026-11-18', paidOn: null, ...over })
  it('semua keadaan', () => {
    expect(chip({ status: 'late', lateDays: 3 })).toEqual({ text: 'Telat 3 hari', tone: 'red' })
    expect(chip({ daysLeft: 0 })).toEqual({ text: 'Hari ini', tone: 'amber' })
    expect(chip({ daysLeft: 1 })).toEqual({ text: 'Besok', tone: 'amber' })
    expect(chip({ daysLeft: 3 })).toEqual({ text: '3 hari lagi', tone: 'amber' })
    expect(chip({ daysLeft: 4 })).toEqual({ text: 'Tempo 18 Nov', tone: 'soft' })
    expect(chip({ status: 'paid', paidOn: '2026-11-17' })).toEqual({ text: 'Lunas', tone: 'green' })
  })
})

const lh = { name: 'David Setyawan', phone: '0812', email: 'd@x.id', initial: 'ds', bank: 'BCA', accountNo: '123', accountName: 'David Setyawan', opening: 'Dengan hormat.', closing: 'Terima kasih.', signature: null }
const aps = (over = {}) => ({
  id: 1, number: 'INV/DS/2026/11/001', letterhead: lh, paidOn: null,
  client: { name: 'PT Artha Puncak Semesta Indonesia', attn: 'Bagian Keuangan', address: 'Ruko Cibubur\nJakarta Timur', email: '' },
  issuedOn: '2026-11-11', dueOn: '2026-11-18', subject: 'Pembuatan POC',
  items: [
    { desc: 'Jasa POC', detail: 'Pengerjaan 4 minggu', qty: 1, unit: 'Paket', price: 15000000 },
    { desc: 'Cloud Development', detail: '', qty: 2, unit: 'Bulan', price: 850000 },
    { desc: 'Cloud Production', detail: '', qty: 1, unit: 'Bulan', price: 1250000 },
    { desc: 'Setup Server', detail: 'Web host · SSL · VPN\nDatabase PostgreSQL', qty: 2, unit: 'Bulan', price: 4471000 },
    { desc: 'Domain', detail: '', qty: 1, unit: 'Tahun', price: 300000 },
  ],
  discount: 0, taxOn: false, taxPct: 11,
  notes: ['Pajak ditanggung oleh {klien}.', '  ', 'Biaya transfer ditanggung pengirim.'],
  ...over,
})

describe('sheetModel', () => {
  it('invoice APS', () => {
    const m = sheetModel(aps())
    expect(m.number).toBe('INV/DS/2026/11/001')
    expect(m.lh).toEqual(lh)
    expect(m.client).toEqual({ name: 'PT Artha Puncak Semesta Indonesia', attn: 'Bagian Keuangan', addressLines: ['Ruko Cibubur', 'Jakarta Timur'], email: '' })
    expect(m.issued).toBe('11 November 2026')
    expect(m.due).toBe('18 November 2026')
    expect(m.dueShort).toBe('18 Nov 2026')
    expect(m.rows).toHaveLength(5)
    expect(m.rows[0]).toEqual({ no: '01', desc: 'Jasa POC', detail: 'Pengerjaan 4 minggu', qty: '1 Paket', price: 'Rp 15.000.000', subtotal: 'Rp 15.000.000' })
    expect(m.rows[3].detail).toBe('Web host · SSL · VPN\nDatabase PostgreSQL')
    expect(m.rows[3].subtotal).toBe('Rp 8.942.000')
    expect(m.extras).toEqual([])
    expect(m.total).toBe('Rp 27.192.000')
    expect(m.terbilang).toBe('Terbilang: dua puluh tujuh juta seratus sembilan puluh dua ribu rupiah')
    expect(m.notes).toEqual(['Pajak ditanggung oleh PT Artha Puncak Semesta Indonesia.', 'Biaya transfer ditanggung pengirim.'])
    expect(m.opening).toBe('Dengan hormat.')
    expect(m.closing).toBe('Terima kasih.')
    expect(m.chip).toEqual({ label: 'Jatuh tempo', text: '18 Nov 2026' })
    expect(m.stamp).toBeNull()
  })

  it('lunas: chip Status & cap', () => {
    const m = sheetModel(aps({ paidOn: '2026-11-17' }))
    expect(m.chip).toEqual({ label: 'Status', text: 'Lunas' })
    expect(m.stamp).toBe('DITERIMA 17 NOV 2026')
  })

  it('diskon & PPN jadi baris tambahan', () => {
    const m = sheetModel(aps({ discount: 1000000, taxOn: true, taxPct: 11 }))
    expect(m.extras).toEqual([
      { label: 'Subtotal', value: 'Rp 27.192.000' },
      { label: 'Diskon', value: '- Rp 1.000.000' },
      { label: 'PPN 11%', value: 'Rp 2.881.120' },
    ])
    expect(m.total).toBe('Rp 29.073.120')
  })

  it('kosong: nggak crash, baris kosong disaring', () => {
    const m = sheetModel(aps({ client: { name: '', attn: '', address: '', email: '' }, items: [{ desc: '', detail: '', qty: 1, unit: 'Paket', price: 0 }], notes: [] }))
    expect(m.rows).toEqual([])
    expect(m.client.addressLines).toEqual([])
    expect(m.notes).toEqual([])
  })
})
