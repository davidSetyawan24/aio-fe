import { mount } from '@vue/test-utils'
import InvoiceSheet from './InvoiceSheet.vue'

const letterhead = {
  name: 'David Setyawan', phone: '0812', email: 'd@x.id', initial: 'ds', bank: 'BCA', accountNo: '123', accountName: 'David S',
  opening: 'Dengan hormat.', closing: 'Terima kasih.', signature: null,
}
const base = (over = {}) => ({
  number: 'INV/DS/2026/11/002', letterhead,
  client: { name: 'PT Maju', attn: '', address: 'Jl. A\nBandung', email: '' },
  issuedOn: '2026-11-10', dueOn: '2026-11-17', paidOn: null, subject: 'Jasa website',
  items: [{ desc: 'Desain', detail: 'Tiga halaman', qty: 2, unit: 'hari', price: 1000000 }],
  discount: 0, taxOn: false, taxPct: 11, notes: [], ...over,
})
const mountSheet = (over) => mount(InvoiceSheet, { props: { invoice: base(over) } })

describe('InvoiceSheet', () => {
  it('nomor, klien, alamat per baris, total, rekening', () => {
    const w = mountSheet()
    expect(w.text()).toContain('INV/DS/2026/11/002')
    expect(w.text()).toContain('PT Maju')
    expect(w.find('.s-addr').html()).toContain('Jl. A<br')
    expect(w.text()).toContain('Rp 2.000.000')
    expect(w.text()).toContain('Terbilang: dua juta rupiah')
    expect(w.text()).toContain('123')
    expect(w.text()).toContain('Hal 1/1')
  })

  it('U.p. cuma kalau ada', () => {
    expect(mountSheet().text()).not.toContain('U.p.')
    expect(mountSheet({ client: { ...base().client, attn: 'Bu Ani' } }).text()).toContain('U.p. Bu Ani')
  })

  it('baris item: 5 kolom + detail', () => {
    const w = mountSheet()
    const tds = w.findAll('tbody tr')[0].findAll('td')
    expect(tds).toHaveLength(5)
    expect(tds[0].text()).toBe('01')
    expect(w.find('.s-it small').text()).toBe('Tiga halaman')
    expect(tds[2].text()).toBe('2 hari')
  })

  it('subtotal/diskon/PPN cuma kalau ada', () => {
    expect(mountSheet().find('.s-row').exists()).toBe(false)
    const w = mountSheet({ discount: 100000, taxOn: true })
    const rows = w.findAll('.s-row').map((r) => r.text())
    expect(rows[0]).toContain('Subtotal')
    expect(rows[1]).toContain('Diskon')
    expect(rows[2]).toContain('PPN 11%')
  })

  it('cap LUNAS cuma kalau lunas', () => {
    expect(mountSheet().find('.s-stamp').exists()).toBe(false)
    const w = mountSheet({ paidOn: '2026-11-12' })
    expect(w.find('.s-stamp').text()).toContain('LUNAS')
    expect(w.find('.s-stamp').text()).toContain('DITERIMA 12 NOV 2026')
    expect(w.find('.s-lunas').exists()).toBe(true)
  })

  it('placeholder abu kalau masih kosong', () => {
    const w = mountSheet({ client: { name: '', attn: '', address: '', email: '' }, items: [] })
    expect(w.text()).toContain('Nama klien')
    expect(w.text()).toContain('Alamat klien')
    expect(w.text()).toContain('Belum ada item')
    expect(w.findAll('.s-ph').length).toBeGreaterThanOrEqual(3)
  })

  it('tanda tangan <img> kalau ada', () => {
    expect(mountSheet().find('.s-ttd img').exists()).toBe(false)
    const w = mountSheet({ letterhead: { ...letterhead, signature: 'data:image/png;base64,AAAA' } })
    expect(w.find('.s-ttd img').attributes('src')).toBe('data:image/png;base64,AAAA')
  })

  it('catatan cuma kalau ada, {klien} diganti', () => {
    expect(mountSheet().find('.s-notes').exists()).toBe(false)
    const w = mountSheet({ notes: ['Pajak ditanggung {klien}.'] })
    expect(w.find('.s-notes li').text()).toBe('Pajak ditanggung PT Maju.')
  })
})
