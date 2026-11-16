import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { setInvoicesApi, useInvoicesStore } from '@/stores/invoices.js'
import InvoiceForm from './InvoiceForm.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
vi.mock('@ionic/vue', async (importOriginal) => ({ ...(await importOriginal()), useIonRouter: () => ionRouter }))

const settings = (over = {}) => ({
  name: 'David Setyawan', phone: '0812', email: 'd@x.com', initial: 'ds', bank: 'BCA', accountNo: '123', accountName: 'David S',
  opening: 'Dengan hormat.', closing: 'Terima kasih.', signature: null, prefix: 'INV/DS', dueDays: 7,
  defaultNotes: ['Catatan satu {klien}', 'Biaya transfer ditanggung pengirim.'], lastNumberThisMonth: 1, minLastNumber: 1, complete: true, ...over,
})
const suggestions = {
  clients: [{ id: 1, name: 'PT Artha Prima Solusi', attn: 'Bagian Keuangan', address: 'Jl. Sudirman 1\nJakarta', email: 'fin@aps.id', tint: '#DCEBFF' }],
  items: [{ desc: 'Cloud Development', unit: 'Bulan', price: 850000 }],
}
const existing = () => ({
  id: 7, number: 'INV/DS/2026/11/001', clientId: 1, tint: '#DCEBFF', paidOn: null,
  client: { name: 'PT Lama', attn: 'Pak A', address: 'Jl. Lama', email: 'a@lama.id' },
  issuedOn: '2026-11-03', dueOn: '2026-11-10', subject: 'Proyek lama',
  items: [{ desc: 'Kerja', detail: 'rinci', qty: 2, unit: 'Jam', price: 100000 }],
  discount: 10000, taxOn: true, taxPct: 11, notes: ['Satu'],
  letterhead: { name: 'Lama', initial: 'lm', bank: 'BNI', accountNo: '9', accountName: 'L', opening: '', closing: '', signature: null },
})
const media = (matches) => (window.matchMedia = vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
const Paper = { props: ['invoice', 'fit'], template: '<div data-test="paper" :data-fit="fit">{{ invoice.number }}|{{ invoice.client.name }}|{{ invoice.letterhead.bank }}</div>' }

let api
async function mountForm(props = {}, { putError = null, wide = false } = {}) {
  media(wide)
  api = {
    get: vi.fn(async (url) => {
      if (url === '/invoices/suggestions') return suggestions
      if (url.startsWith('/invoices/next-number')) return { number: `INV/DS/${url.slice(-10, -3).replace('-', '/')}/002` }
      return { today: '2026-11-16', summary: {}, invoices: [] }
    }),
    post: vi.fn(async (url, body) => {
      if (putError) throw putError
      return { invoice: { ...existing(), id: 99, ...body } }
    }),
    put: vi.fn(async (url, body) => {
      if (putError) throw putError
      return { invoice: { ...existing(), ...body } }
    }),
  }
  setInvoicesApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useInvoicesStore()
  store.settings = settings()
  store.today = '2026-11-16'
  const w = mount(InvoiceForm, { props: { invoice: null, from: null, ...props }, global: { plugins: [pinia], stubs: { teleport: true, InvoicePaper: Paper } } })
  await flushPromises()
  return w
}
const t = (w, id) => w.find(`[data-test="${id}"]`)
const type = async (w, id, v) => { await t(w, id).setValue(v); await flushPromises() }
const lastBody = () => api.post.mock.calls.at(-1)[1]

beforeEach(() => {
  ionRouter.navigate.mockClear()
})

describe('InvoiceForm — baru', () => {
  it('isian awal: tanggal today, tempo +dueDays, catatan bawaan, nomor perkiraan, 1 item kosong', async () => {
    const w = await mountForm()
    expect(t(w, 'issued-date').element.value).toBe('2026-11-16')
    expect(t(w, 'due-hint').text()).toContain('23 November 2026')
    expect(t(w, 'due-chip-7').classes()).toContain('on')
    expect(w.findAll('[data-test="note"]').map((n) => n.element.value)).toEqual(['Catatan satu {klien}', 'Biaya transfer ditanggung pengirim.'])
    expect(api.get).toHaveBeenCalledWith('/invoices/next-number?date=2026-11-16')
    expect(w.emitted('number').at(-1)[0]).toBe('INV/DS/2026/11/002')
    expect(w.findAll('[data-test="item"]')).toHaveLength(1)
    expect(w.find('[data-unit="Paket"]').classes()).toContain('on')
    expect(t(w, 'item-qty').element.value).toBe('1')
  })

  it('ketik "art" → saran klien → pilih → attn/alamat/email keisi', async () => {
    const w = await mountForm()
    await type(w, 'client-name', 'art')
    expect(t(w, 'sug-client').exists()).toBe(true)
    await t(w, 'sug-client-item').trigger('click')
    expect(t(w, 'client-name').element.value).toBe('PT Artha Prima Solusi')
    expect(t(w, 'client-attn').element.value).toBe('Bagian Keuangan')
    expect(t(w, 'client-address').element.value).toBe('Jl. Sudirman 1\nJakarta')
    expect(t(w, 'client-email').element.value).toBe('fin@aps.id')
    expect(t(w, 'sug-client').exists()).toBe(false)
  })

  it('ketik 1 huruf belum muncul saran', async () => {
    const w = await mountForm()
    await type(w, 'client-name', 'a')
    expect(t(w, 'sug-client').exists()).toBe(false)
  })

  it('ketik "clou" → saran item → pilih → keterangan/satuan/harga keisi', async () => {
    const w = await mountForm()
    await type(w, 'item-desc', 'clou')
    await t(w, 'sug-item-item').trigger('click')
    expect(t(w, 'item-desc').element.value).toBe('Cloud Development')
    expect(w.find('[data-unit="Bulan"]').classes()).toContain('on')
    expect(t(w, 'item-price').element.value).toBe('850.000')
  })

  it('harga "850000" tampil "850.000"; subtotal item & total bar live', async () => {
    const w = await mountForm()
    await type(w, 'item-price', '850000')
    expect(t(w, 'item-price').element.value).toBe('850.000')
    await type(w, 'item-qty', '3')
    expect(t(w, 'item-sub').text()).toBe('Rp2.550.000')
    expect(t(w, 'total').text()).toBe('Rp2.550.000')
  })

  it('chip +14 ganti jatuh tempo; Pilih… kalender punya min = tanggal invoice', async () => {
    const w = await mountForm()
    await t(w, 'due-chip-14').trigger('click')
    expect(t(w, 'due-hint').text()).toContain('30 November 2026')
    expect(t(w, 'due-chip-14').classes()).toContain('on')
    expect(t(w, 'due-date').attributes('min')).toBe('2026-11-16')
    await t(w, 'due-date').setValue('2026-12-05')
    expect(t(w, 'due-hint').text()).toContain('5 Desember 2026')
    expect(t(w, 'due-pick').classes()).toContain('on')
    expect(t(w, 'due-chip-7').classes()).not.toContain('on')
  })

  it('ganti tanggal invoice: tempo chip ikut geser, nomor perkiraan ditanya ulang', async () => {
    const w = await mountForm()
    await t(w, 'issued-date').setValue('2026-12-01')
    await flushPromises()
    expect(t(w, 'due-hint').text()).toContain('8 Desember 2026')
    expect(api.get).toHaveBeenCalledWith('/invoices/next-number?date=2026-12-01')
  })

  it('"+ Diskon / pajak" → kartu; saklar PPN → kolom % default 11; total ikut', async () => {
    const w = await mountForm()
    await type(w, 'item-price', '1000000')
    expect(t(w, 'discount').exists()).toBe(false)
    await t(w, 'add-extra').trigger('click')
    await type(w, 'discount', '100000')
    expect(t(w, 'discount').element.value).toBe('100.000')
    expect(t(w, 'tax-pct').exists()).toBe(false)
    await t(w, 'tax-switch').trigger('click')
    expect(t(w, 'tax-pct').element.value).toBe('11')
    expect(t(w, 'total').text()).toBe('Rp999.000')
  })

  it('tambah/hapus item (min 1) dan catatan', async () => {
    const w = await mountForm()
    expect(t(w, 'item-del').exists()).toBe(false)
    await t(w, 'add-item').trigger('click')
    expect(w.findAll('[data-test="item"]')).toHaveLength(2)
    await w.findAll('[data-test="item-del"]')[0].trigger('click')
    expect(w.findAll('[data-test="item"]')).toHaveLength(1)
    await t(w, 'add-note').trigger('click')
    expect(w.findAll('[data-test="note"]')).toHaveLength(3)
    await w.findAll('[data-test="del-note"]')[0].trigger('click')
    expect(w.findAll('[data-test="note"]')).toHaveLength(2)
  })

  it('Simpan tanpa nama klien → pesan, tanpa request', async () => {
    const w = await mountForm()
    await t(w, 'save').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Nama klien belum diisi')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('Simpan → create dengan isi yang bener lalu emit saved', async () => {
    const w = await mountForm()
    await type(w, 'client-name', 'PT Baru')
    await type(w, 'item-desc', 'Kerja')
    await type(w, 'item-price', '500000')
    await t(w, 'save').trigger('click')
    await flushPromises()
    expect(api.post).toHaveBeenCalledTimes(1)
    expect(lastBody()).toEqual({
      client: { name: 'PT Baru', attn: '', address: '', email: '' },
      issuedOn: '2026-11-16', dueOn: '2026-11-23', subject: '',
      items: [{ desc: 'Kerja', detail: '', qty: 1, unit: 'Paket', price: 500000 }],
      discount: 0, taxOn: false, taxPct: 11, notes: ['Catatan satu {klien}', 'Biaya transfer ditanggung pengirim.'],
    })
    expect(w.emitted('saved')[0][0].id).toBe(99)
  })

  it('tap dobel Simpan → 1 request', async () => {
    const w = await mountForm()
    await type(w, 'client-name', 'PT Baru')
    await type(w, 'item-desc', 'Kerja')
    await t(w, 'save').trigger('click')
    await t(w, 'save').trigger('click')
    await flushPromises()
    expect(api.post).toHaveBeenCalledTimes(1)
  })

  it('error 422 per kolom tampil (items.2.qty di item 3, client.name, dueOn, discount)', async () => {
    const err = { fields: { 'items.2.qty': ['Jumlah minimal 1.'], 'client.name': 'Nama klien wajib diisi.', dueOn: 'Jatuh tempo nggak boleh sebelum tanggal invoice.', discount: 'Diskon nggak boleh lebih dari subtotal.', settings: 'Isi dulu Atur invoice (nama & rekening).' }, message: 'x' }
    const w = await mountForm({}, { putError: err })
    await type(w, 'client-name', 'PT Baru')
    await t(w, 'add-item').trigger('click')
    await t(w, 'add-item').trigger('click')
    await t(w, 'add-extra').trigger('click')
    await t(w, 'save').trigger('click')
    await flushPromises()
    const items = w.findAll('[data-test="item"]')
    expect(items[2].text()).toContain('Jumlah minimal 1.')
    expect(items[0].text()).not.toContain('Jumlah minimal 1.')
    expect(w.find('[data-err="client.name"]').text()).toBe('Nama klien wajib diisi.')
    expect(w.find('[data-err="dueOn"]').text()).toContain('Jatuh tempo nggak boleh')
    expect(w.find('[data-err="discount"]').text()).toContain('Diskon nggak boleh')
    expect(w.find('[data-err="settings"]').text()).toContain('Atur invoice')
    // bisa simpan lagi abis gagal
    await t(w, 'save').trigger('click')
    await flushPromises()
    expect(api.post).toHaveBeenCalledTimes(2)
  })

  it('HP: tombol PDF buka pratinjau layar penuh; PC: pratinjau di kanan ikut ketikan', async () => {
    const w = await mountForm()
    expect(t(w, 'preview').exists()).toBe(false)
    await t(w, 'pdf').trigger('click')
    expect(t(w, 'pv').exists()).toBe(true)
    expect(t(w, 'pv').find('[data-fit="width"]').exists()).toBe(true)
    await t(w, 'pv-close').trigger('click')
    expect(t(w, 'pv').exists()).toBe(false)

    const wide = await mountForm({}, { wide: true })
    expect(t(wide, 'pdf').exists()).toBe(false)
    expect(t(wide, 'preview').find('[data-fit="desk"]').text()).toContain('INV/DS/2026/11/002|')
    await type(wide, 'client-name', 'PT Live')
    expect(t(wide, 'preview').text()).toContain('PT Live')
    expect(t(wide, 'preview').text()).toContain('|BCA')
  })
})

describe('InvoiceForm — ubah & duplikat', () => {
  it('Ubah: isi dari invoice, nomor asli, Simpan → update, pratinjau pakai rekening terbaru', async () => {
    const w = await mountForm({ invoice: existing() }, { wide: true })
    expect(t(w, 'client-name').element.value).toBe('PT Lama')
    expect(t(w, 'issued-date').element.value).toBe('2026-11-03')
    expect(t(w, 'item-desc').element.value).toBe('Kerja')
    expect(t(w, 'item-detail').element.value).toBe('rinci')
    expect(t(w, 'discount').element.value).toBe('10.000')
    expect(t(w, 'tax-pct').element.value).toBe('11')
    expect(t(w, 'due-pick').classes()).not.toContain('on')
    expect(t(w, 'due-chip-7').classes()).toContain('on')
    expect(api.get).not.toHaveBeenCalledWith(expect.stringContaining('next-number'))
    expect(t(w, 'preview').text()).toContain('INV/DS/2026/11/001|PT Lama|BCA')
    await t(w, 'save').trigger('click')
    await flushPromises()
    expect(api.put).toHaveBeenCalledWith('/invoices/7', expect.objectContaining({ issuedOn: '2026-11-03', dueOn: '2026-11-10' }))
    expect(api.post).not.toHaveBeenCalled()
    expect(w.emitted('saved')[0][0].id).toBe(7)
  })

  it('Duplikat: klien/perihal/item/diskon/PPN/catatan kesalin, tanggal hari ini, nomor baru', async () => {
    const w = await mountForm({ from: existing() })
    expect(t(w, 'client-name').element.value).toBe('PT Lama')
    expect(t(w, 'subject').element.value).toBe('Proyek lama')
    expect(t(w, 'item-desc').element.value).toBe('Kerja')
    expect(t(w, 'discount').element.value).toBe('10.000')
    expect(t(w, 'tax-pct').element.value).toBe('11')
    expect(w.findAll('[data-test="note"]').map((n) => n.element.value)).toEqual(['Satu'])
    expect(t(w, 'issued-date').element.value).toBe('2026-11-16')
    expect(t(w, 'due-hint').text()).toContain('23 November 2026')
    await t(w, 'save').trigger('click')
    await flushPromises()
    expect(api.post).toHaveBeenCalledTimes(1)
    expect(lastBody()).not.toHaveProperty('paidOn')
  })
})
