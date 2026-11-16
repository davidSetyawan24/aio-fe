import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { setInvoicesApi } from '@/stores/invoices.js'
import InvoiceSettingsPage from './InvoiceSettingsPage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
const toast = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  onIonViewWillEnter: (fn) => fn(),
  onIonViewDidEnter: () => {},
  toastController: { create: async (o) => { toast(o.message); return { present: vi.fn() } } },
}))
const photo = vi.hoisted(() => ({ fromPhoto: vi.fn(async () => 'data:image/png;base64,FOTO') }))
vi.mock('@/lib/signatureImage.js', async (importOriginal) => ({ ...(await importOriginal()), ...photo }))

const settings = (over = {}) => ({
  name: 'David Setyawan', phone: '0812', email: 'd@x.com', initial: 'ds', bank: 'BCA', accountNo: '123', accountName: 'David S',
  opening: 'Dengan hormat.', closing: 'Terima kasih.', signature: null, prefix: 'INV/DS', dueDays: 7,
  defaultNotes: ['Catatan satu', 'Catatan dua'], lastNumberThisMonth: 1, minLastNumber: 1, complete: true, ...over,
})
const media = (matches) => (window.matchMedia = vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() })))

let api
async function mountPage({ query = '', s = settings(), putError = null, invoices = [] } = {}) {
  api = {
    get: vi.fn(async (url) => (url === '/invoice-settings' ? { settings: s } : { today: '2026-11-16', summary: {}, invoices })),
    put: vi.fn(async (url, body) => {
      if (putError) throw putError
      return { settings: { ...s, ...body, complete: true, minLastNumber: 1 } }
    }),
  }
  setInvoicesApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/tabs/menu/invoice/atur', component: InvoiceSettingsPage }] })
  router.push(`/tabs/menu/invoice/atur${query}`)
  await router.isReady()
  const w = mount(InvoiceSettingsPage, { global: { plugins: [pinia, router], stubs: { teleport: true } } })
  await flushPromises()
  return w
}
const val = (w, f) => w.find(`[data-f="${f}"]`).element.value

beforeEach(() => {
  media(false)
  ionRouter.navigate.mockClear()
  ionRouter.back.mockClear()
  toast.mockClear()
  photo.fromPhoto.mockClear()
})

describe('InvoiceSettingsPage', () => {
  it('form keisi dari settings', async () => {
    const w = await mountPage()
    expect(val(w, 'name')).toBe('David Setyawan')
    expect(val(w, 'phone')).toBe('0812')
    expect(val(w, 'initial')).toBe('ds')
    expect(val(w, 'bank')).toBe('BCA')
    expect(val(w, 'accountNo')).toBe('123')
    expect(val(w, 'accountName')).toBe('David S')
    expect(val(w, 'prefix')).toBe('INV/DS')
    expect(val(w, 'opening')).toBe('Dengan hormat.')
    expect(val(w, 'closing')).toBe('Terima kasih.')
    expect(w.findAll('[data-test="note"]')).toHaveLength(2)
  })

  it('judul dua baris: "Isi sekali" lalu "kepake di semua invoice" di baris sendiri', async () => {
    const w = await mountPage()
    expect(w.find('h1 br + span').text()).toBe('kepake di semua invoice')
  })

  it('monogram ikut inisial', async () => {
    const w = await mountPage()
    expect(w.find('[data-test="mark"]').text()).toBe('ds')
    await w.find('[data-f="initial"]').setValue('abc')
    expect(w.find('[data-test="mark"]').text()).toBe('abc')
  })

  it('Simpan ngirim semua kolom', async () => {
    const w = await mountPage()
    await w.find('[data-f="name"]').setValue('Dave')
    await w.find('[data-test="save"]').trigger('click')
    await flushPromises()
    expect(api.put).toHaveBeenCalledTimes(1)
    const [url, body] = api.put.mock.calls[0]
    expect(url).toBe('/invoice-settings')
    expect(body).toEqual({
      name: 'Dave', phone: '0812', email: 'd@x.com', initial: 'ds', bank: 'BCA', accountNo: '123', accountName: 'David S',
      opening: 'Dengan hormat.', closing: 'Terima kasih.', signature: null, prefix: 'INV/DS', dueDays: 7,
      defaultNotes: ['Catatan satu', 'Catatan dua'],
    })
    expect(toast).toHaveBeenCalledWith('Pengaturan invoice kesimpen ✓')
  })

  it('tap dobel Simpan → 1 request', async () => {
    const w = await mountPage()
    const b = w.find('[data-test="save"]')
    await b.trigger('click')
    await b.trigger('click')
    await flushPromises()
    expect(api.put).toHaveBeenCalledTimes(1)
  })

  it('error 422 per kolom tampil di kolomnya', async () => {
    const { ApiError } = await import('@/lib/api.js')
    const w = await mountPage({ putError: new ApiError('Ada yang salah.', 422, { lastNumberThisMonth: 'Nomor app bulan ini udah sampai 5.', signature: 'Tanda tangannya kegedean.' }) })
    await w.find('[data-test="save"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-err="lastNumberThisMonth"]').text()).toBe('Nomor app bulan ini udah sampai 5.')
    expect(w.find('[data-err="signature"]').text()).toBe('Tanda tangannya kegedean.')
    expect(ionRouter.navigate).not.toHaveBeenCalled()
  })

  it('error 422 di Telp / Email tampil di bawah kolomnya', async () => {
    const { ApiError } = await import('@/lib/api.js')
    const w = await mountPage({ putError: new ApiError('x', 422, { email: 'Emailnya nggak valid.', phone: 'Nomornya nggak valid.' }) })
    await w.find('[data-test="save"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-err="email"]').text()).toBe('Emailnya nggak valid.')
    expect(w.find('[data-err="phone"]').text()).toBe('Nomornya nggak valid.')
  })

  it('error 422 di kolom tak dikenal tetep keliatan', async () => {
    const { ApiError } = await import('@/lib/api.js')
    const w = await mountPage({ putError: new ApiError('x', 422, { cobaan: ['Ada yang nggak beres.'] }) })
    await w.find('[data-test="save"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-test="orphan-error"]').text()).toBe('Ada yang nggak beres.')
  })

  it('nomor terakhir bulan ini: hint + contoh nomor berikutnya live', async () => {
    const w = await mountPage()
    expect(w.text()).toContain('Udah ngirim invoice di luar app bulan ini? Isi nomor terakhirnya biar nggak dobel.')
    expect(w.find('[data-test="next-example"]').text()).toBe('INV/DS/2026/11/002')
    await w.find('[data-f="lastNumberThisMonth"]').setValue('7')
    expect(w.find('[data-test="next-example"]').text()).toBe('INV/DS/2026/11/008')
    await w.find('[data-f="prefix"]').setValue('FAK')
    expect(w.find('[data-test="next-example"]').text()).toBe('FAK/2026/11/008')
    await w.find('[data-test="save"]').trigger('click')
    await flushPromises()
    expect(api.put.mock.calls[0][1].lastNumberThisMonth).toBe(7)
  })

  it('nomor terakhir nggak diubah → nggak ikut dikirim (buka 31 Okt, simpan abis tengah malem nggak nyetel bulan baru)', async () => {
    const w = await mountPage({ s: settings({ lastNumberThisMonth: 4 }) })
    await w.find('[data-f="lastNumberThisMonth"]').setValue('9')
    await w.find('[data-f="lastNumberThisMonth"]').setValue('4')
    await w.find('[data-test="save"]').trigger('click')
    await flushPromises()
    expect(api.put.mock.calls[0][1]).not.toHaveProperty('lastNumberThisMonth')
  })

  it('chip jatuh tempo 7/14/30', async () => {
    const w = await mountPage()
    const chips = w.findAll('[data-due]')
    expect(chips.map((c) => c.text())).toEqual(['7 hari', '14 hari', '30 hari'])
    expect(chips[0].classes()).toContain('on')
    await chips[2].trigger('click')
    expect(chips[2].classes()).toContain('on')
    await w.find('[data-test="save"]').trigger('click')
    await flushPromises()
    expect(api.put.mock.calls[0][1].dueDays).toBe(30)
  })

  it('catatan bawaan: tambah & hapus, maksimal 10', async () => {
    const w = await mountPage()
    await w.find('[data-test="add-note"]').trigger('click')
    expect(w.findAll('[data-test="note"]')).toHaveLength(3)
    await w.findAll('[data-test="del-note"]')[0].trigger('click')
    expect(w.findAll('[data-test="note"]')).toHaveLength(2)
    expect(w.find('[data-f="notes.0"]').element.value).toBe('Catatan dua')
    while (w.find('[data-test="add-note"]').exists()) await w.find('[data-test="add-note"]').trigger('click')
    expect(w.findAll('[data-test="note"]')).toHaveLength(10)
    expect(w.find('[data-test="add-note"]').exists()).toBe(false)
  })

  it('?lanjut=baru: hint atas + abis Simpan pindah ke bikin invoice', async () => {
    const w = await mountPage({ query: '?lanjut=baru' })
    expect(w.text()).toContain('Isi sekali dulu ya, abis itu langsung bisa bikin invoice.')
    await w.find('[data-test="save"]').trigger('click')
    await flushPromises()
    expect(ionRouter.navigate).toHaveBeenCalledWith('/tabs/menu/invoice/baru', 'forward', 'replace')
  })

  it('tanpa ?lanjut: abis Simpan balik, hint atas nggak ada', async () => {
    const w = await mountPage()
    expect(w.text()).not.toContain('Isi sekali dulu ya')
    await w.find('[data-test="save"]').trigger('click')
    await flushPromises()
    expect(ionRouter.back).toHaveBeenCalled()
  })

  it('tanda tangan: foto dipakai & ikut dikirim, bisa dihapus', async () => {
    const w = await mountPage()
    const file = new File(['x'], 'ttd.png', { type: 'image/png' })
    const input = w.find('[data-test="photo"]')
    expect(input.attributes('capture')).toBeUndefined()
    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    await flushPromises()
    expect(photo.fromPhoto).toHaveBeenCalledWith(file)
    expect(w.find('[data-test="sig-img"]').attributes('src')).toBe('data:image/png;base64,FOTO')
    await w.find('[data-test="save"]').trigger('click')
    await flushPromises()
    expect(api.put.mock.calls[0][1].signature).toBe('data:image/png;base64,FOTO')
  })

  it('foto nggak kebaca → pesan error, tanda tangan lama tetep', async () => {
    photo.fromPhoto.mockRejectedValueOnce(new Error('Nggak ada coretan yang kebaca di foto itu.'))
    const w = await mountPage({ s: settings({ signature: 'data:image/png;base64,LAMA' }) })
    const input = w.find('[data-test="photo"]')
    Object.defineProperty(input.element, 'files', { value: [new File(['x'], 'a.png')] })
    await input.trigger('change')
    await flushPromises()
    expect(w.find('[data-err="signature"]').text()).toBe('Nggak ada coretan yang kebaca di foto itu.')
    expect(w.find('[data-test="sig-img"]').attributes('src')).toBe('data:image/png;base64,LAMA')
  })

  it('papan coret kebuka dari tombol Coret, hasilnya jadi tanda tangan', async () => {
    const w = await mountPage()
    expect(w.find('[data-test="pad"]').exists()).toBe(false)
    await w.find('[data-test="draw"]').trigger('click')
    expect(w.find('[data-test="pad"]').exists()).toBe(true)
    w.findComponent({ name: 'SignaturePad' }).vm.$emit('use', 'data:image/png;base64,CORET')
    await flushPromises()
    expect(w.find('[data-test="pad"]').exists()).toBe(false)
    expect(w.find('[data-test="sig-img"]').attributes('src')).toBe('data:image/png;base64,CORET')
  })

  it('PC: pratinjau kertas ada; HP: nggak ada', async () => {
    const hp = await mountPage()
    expect(hp.find('[data-test="preview"]').exists()).toBe(false)
    media(true)
    const pc = await mountPage()
    expect(pc.find('[data-test="preview"]').exists()).toBe(true)
    expect(pc.find('[data-test="sheet"]').text()).toContain('David Setyawan')
    await pc.find('[data-f="name"]').setValue('Dave Baru')
    expect(pc.find('[data-test="sheet"]').text()).toContain('Dave Baru')
  })

  it('PC: contoh hasilnya pakai invoice yang paling baru dibikin (bukan tanggal invoice terbaru)', async () => {
    media(true)
    const inv = (id, name, issuedOn, createdAt) => ({
      id, number: `INV/DS/2026/11/00${id}`, clientId: id, tint: '#eee', paidOn: null, client: { name, attn: '', address: '', email: '' },
      issuedOn, dueOn: issuedOn, subject: '', items: [{ desc: 'K', detail: '', qty: 1, unit: 'Paket', price: 1000 }],
      discount: 0, taxOn: false, taxPct: 11, notes: [], letterhead: {}, createdAt,
    })
    // Daftar dari BE urut tanggal invoice terbaru dulu.
    const pc = await mountPage({
      invoices: [
        inv(2, 'PT Tanggal Paling Baru', '2026-11-20', '2026-11-10T03:00:00.000Z'),
        inv(5, 'PT Barusan Dibikin', '2026-11-05', '2026-11-16T03:00:00.000Z'),
        inv(4, 'PT Kemarin', '2026-11-06', '2026-11-15T03:00:00.000Z'),
      ],
    })
    expect(pc.find('[data-test="sheet"]').text()).toContain('PT Barusan Dibikin')
  })
})
