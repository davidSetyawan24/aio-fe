import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import InvoicePaidSheet from '@/components/InvoicePaidSheet.vue'
import { setInvoicesApi } from '@/stores/invoices.js'
import InvoiceDetailPage from './InvoiceDetailPage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
const sheetChoice = vi.hoisted(() => ({ data: 'delete' }))
const toast = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  onIonViewWillEnter: (fn) => fn(),
  actionSheetController: { create: vi.fn(async (opts) => { sheetChoice.opts = opts; return { present: vi.fn(), onDidDismiss: async () => ({ data: sheetChoice.data }) } }) },
  toastController: { create: async (o) => { toast(o.message); return { present: vi.fn() } } },
}))
// PDF beneran nggak dibikin di sini (ada test sendiri di lib/invoicePdf): tiap panggilan nunggu dilepas dari test.
const pdf = vi.hoisted(() => ({ calls: [], build: null }))
vi.mock('@/lib/invoicePdf.js', () => ({ buildInvoicePdf: (...args) => pdf.build(...args) }))
const share = vi.hoisted(() => ({ shareOrDownload: vi.fn(async () => 'shared'), downloadFile: vi.fn() }))
vi.mock('@/lib/shareFile.js', () => share)

const letterhead = { name: 'David', phone: '', email: '', initial: 'd', bank: 'BCA', accountNo: '1', accountName: 'D', opening: '', closing: '', signature: null }
const inv = (over = {}) => ({
  id: 7, number: 'INV/DS/2026/11/002', tint: '#E4F7C4', letterhead,
  client: { name: 'PT Maju', attn: '', address: 'Jl A', email: '' }, subject: 'Web', issuedOn: '2026-11-10', dueOn: '2026-11-20', paidOn: null,
  status: 'open', lateDays: 0, daysLeft: 4, items: [{ desc: 'Desain', detail: '', qty: 1, unit: 'pkt', price: 27192000 }], discount: 0, taxOn: false, taxPct: 11, notes: [],
  totals: { sub: 27192000, disc: 0, tax: 0, total: 27192000 }, ...over,
})
const data = (invoices) => ({ today: '2026-11-16', summary: { unpaid: 0, unpaidCount: 0, lateCount: 0, nearestDue: null, received: [], receivedYear: 0 }, invoices })

const media = (matches) => (window.matchMedia = vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() })))

/** Lepas PDF ke-i (isinya 'pdf-i' biar bisa dibedain). */
async function readyPdf(i = 0) {
  pdf.calls[i].resolve(new Blob([`pdf-${i}`], { type: 'application/pdf' }))
  await flushPromises()
}

let api
async function mountPage(invoices = [inv()]) {
  api = {
    get: vi.fn(async () => data(invoices)),
    put: vi.fn(async (url, body) => ({ invoice: inv({ paidOn: body.paidOn, status: 'paid' }) })),
    del: vi.fn(async (url) => (url.endsWith('/paid') ? { invoice: inv() } : null)),
  }
  setInvoicesApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/tabs/menu/invoice/:id', component: InvoiceDetailPage }] })
  router.push('/tabs/menu/invoice/7')
  await router.isReady()
  const w = mount(InvoiceDetailPage, { global: { plugins: [pinia, router], stubs: { teleport: true } } })
  await flushPromises()
  return w
}

beforeEach(() => {
  pdf.calls = []
  pdf.build = vi.fn((invoice) => new Promise((resolve, reject) => pdf.calls.push({ invoice, resolve, reject })))
  share.shareOrDownload.mockClear()
  share.shareOrDownload.mockImplementation(async () => 'shared')
  share.downloadFile.mockClear()
  ionRouter.push.mockClear()
  ionRouter.back.mockClear()
  toast.mockClear()
  sheetChoice.data = 'delete'
  localStorage.clear()
  media(false)
})

describe('InvoiceDetailPage', () => {
  it('judul total + klien, chip dan jatuh tempo', async () => {
    const w = await mountPage()
    expect(w.find('h1').text()).toBe('Rp27.192.000PT Maju')
    expect(w.text()).toContain('INV/DS/2026/11/002')
    expect(w.find('[data-test="stline"]').text()).toContain('Tempo 20 Nov')
    expect(w.find('[data-test="stline"]').text()).toContain('Jatuh tempo 20 November 2026')
    expect(w.text()).toContain('Lebih enak di laptop')
  })

  it('lunas: chip Lunas + Diterima', async () => {
    const w = await mountPage([inv({ paidOn: '2026-11-12', status: 'paid' })])
    const line = w.find('[data-test="stline"]').text()
    expect(line).toContain('Lunas')
    expect(line).toContain('Diterima 12 November 2026')
  })

  it('Tandain lunas: sheet -> Kemarin -> setPaid + toast', async () => {
    const w = await mountPage()
    await w.find('[data-test="paid"]').trigger('click')
    const sheet = w.findComponent(InvoicePaidSheet)
    expect(sheet.props('open')).toBe(true)
    await w.find('[data-test="pick-yest"]').trigger('click')
    await w.find('[data-test="ok"]').trigger('click')
    await flushPromises()
    expect(api.put).toHaveBeenCalledWith('/invoices/7/paid', { paidOn: '2026-11-15' })
    expect(toast).toHaveBeenCalledWith('Lunas ✓ PDF-nya udah dapet cap LUNAS')
    expect(w.findComponent(InvoicePaidSheet).props('open')).toBe(false)
  })

  it('tap dobel = 1 request', async () => {
    const w = await mountPage()
    await w.find('[data-test="paid"]').trigger('click')
    const sheet = w.findComponent(InvoicePaidSheet)
    sheet.vm.$emit('done', '2026-11-16')
    sheet.vm.$emit('done', '2026-11-16')
    await flushPromises()
    expect(api.put).toHaveBeenCalledTimes(1)
  })

  it('Udah lunas -> unsetPaid', async () => {
    const w = await mountPage([inv({ paidOn: '2026-11-12', status: 'paid' })])
    await w.find('[data-test="unpaid"]').trigger('click')
    await flushPromises()
    expect(api.del).toHaveBeenCalledWith('/invoices/7/paid')
    expect(toast).toHaveBeenCalledWith('Lunasnya dibatalin.')
  })

  it('Hapus: konfirmasi lalu remove dan balik', async () => {
    const w = await mountPage()
    await w.find('[data-test="delete"]').trigger('click')
    await flushPromises()
    expect(sheetChoice.opts.header).toBe('Hapus invoice ini?')
    expect(sheetChoice.opts.subHeader).toBe('Nomornya nggak dipakai ulang.')
    expect(api.del).toHaveBeenCalledWith('/invoices/7')
    expect(ionRouter.back).toHaveBeenCalled()
  })

  it('Hapus dibatalin: nggak ada request', async () => {
    sheetChoice.data = undefined
    const w = await mountPage()
    await w.find('[data-test="delete"]').trigger('click')
    await flushPromises()
    expect(api.del).not.toHaveBeenCalled()
  })

  it('Ubah dan Duplikat', async () => {
    const w = await mountPage()
    await w.find('[data-test="edit"]').trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/invoice/7/ubah')
    await w.find('[data-test="dup"]').trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/invoice/baru?dari=7')
  })

  it('Bagikan & Unduh disabled sampai PDF siap', async () => {
    const w = await mountPage()
    expect(pdf.build).toHaveBeenCalledTimes(1)
    expect(pdf.calls[0].invoice.number).toBe('INV/DS/2026/11/002')
    expect(w.find('[data-test="share"]').attributes('disabled')).toBeDefined()
    expect(w.find('[data-test="download"]').attributes('disabled')).toBeDefined()
    expect(w.find('[data-test="share"]').text()).toContain('Lagi nyiapin PDF…')
    await readyPdf()
    expect(w.find('[data-test="share"]').attributes('disabled')).toBeUndefined()
    expect(w.find('[data-test="download"]').attributes('disabled')).toBeUndefined()
    expect(w.find('[data-test="share"]').text()).not.toContain('Lagi nyiapin PDF…')
  })

  it('Bagikan: file PDF nama INV-DS-2026-11-002.pdf, tap dobel = 1 share', async () => {
    let finish
    share.shareOrDownload.mockImplementation(() => new Promise((r) => (finish = r)))
    const w = await mountPage()
    await readyPdf()
    await w.find('[data-test="share"]').trigger('click')
    await w.find('[data-test="share"]').trigger('click')
    expect(share.shareOrDownload).toHaveBeenCalledTimes(1)
    const [file, title] = share.shareOrDownload.mock.calls[0]
    expect(file.name).toBe('INV-DS-2026-11-002.pdf')
    expect(file.type).toBe('application/pdf')
    expect(title).toBe('Invoice INV/DS/2026/11/002')
    finish('cancelled')
    await flushPromises()
    expect(w.find('.det-error').exists()).toBe(false)
    await w.find('[data-test="share"]').trigger('click')
    expect(share.shareOrDownload).toHaveBeenCalledTimes(2)
  })

  it('Unduh: langsung download', async () => {
    const w = await mountPage()
    await readyPdf()
    await w.find('[data-test="download"]').trigger('click')
    expect(share.downloadFile).toHaveBeenCalledTimes(1)
    expect(share.downloadFile.mock.calls[0][0].name).toBe('INV-DS-2026-11-002.pdf')
    expect(share.shareOrDownload).not.toHaveBeenCalled()
  })

  it('Tandain lunas -> PDF disiapin ulang (cap LUNAS), tombol nunggu lagi', async () => {
    const w = await mountPage()
    await readyPdf()
    api.get.mockImplementation(async () => data([inv({ paidOn: '2026-11-16', status: 'paid' })]))
    await w.find('[data-test="paid"]').trigger('click')
    w.findComponent(InvoicePaidSheet).vm.$emit('done', '2026-11-16')
    await flushPromises()
    expect(pdf.build).toHaveBeenCalledTimes(2)
    expect(pdf.calls[1].invoice.paidOn).toBe('2026-11-16')
    expect(w.find('[data-test="share"]').attributes('disabled')).toBeDefined()
    await readyPdf(1)
    expect(w.find('[data-test="share"]').attributes('disabled')).toBeUndefined()
  })

  it('daftar dimuat ulang dengan isi sama -> PDF nggak dibikin ulang', async () => {
    const w = await mountPage()
    await readyPdf()
    const store = (await import('@/stores/invoices.js')).useInvoicesStore()
    await store.load()
    await flushPromises()
    expect(pdf.build).toHaveBeenCalledTimes(1)
    expect(w.find('[data-test="share"]').attributes('disabled')).toBeUndefined()
  })

  it('PDF lama yang telat jadi nggak nimpa PDF terbaru', async () => {
    const w = await mountPage()
    api.get.mockImplementation(async () => data([inv({ paidOn: '2026-11-16', status: 'paid' })]))
    await w.find('[data-test="paid"]').trigger('click')
    w.findComponent(InvoicePaidSheet).vm.$emit('done', '2026-11-16')
    await flushPromises()
    await readyPdf(1)
    await readyPdf(0)
    await w.find('[data-test="share"]').trigger('click')
    expect(await share.shareOrDownload.mock.calls[0][0].text()).toBe('pdf-1')
  })

  it('PDF gagal dibikin -> tap Bagikan = coba lagi', async () => {
    const w = await mountPage()
    pdf.calls[0].reject(new Error('rusak'))
    await flushPromises()
    const btn = w.find('[data-test="share"]')
    expect(btn.text()).toContain('PDF-nya gagal dibikin')
    expect(btn.attributes('disabled')).toBeUndefined()
    await btn.trigger('click')
    expect(pdf.build).toHaveBeenCalledTimes(2)
    expect(share.shareOrDownload).not.toHaveBeenCalled()
  })

  it('pratinjau layar penuh: tombol bagikan ikut aktif', async () => {
    const w = await mountPage()
    await w.find('[data-test="paper"]').trigger('click')
    expect(w.find('[data-test="preview-share"]').attributes('disabled')).toBeDefined()
    await readyPdf()
    await w.find('[data-test="preview-share"]').trigger('click')
    expect(share.shareOrDownload).toHaveBeenCalledTimes(1)
  })

  it('HP: tap kertas buka pratinjau layar penuh', async () => {
    const w = await mountPage()
    expect(w.find('[data-test="preview"]').exists()).toBe(false)
    await w.find('[data-test="paper"]').trigger('click')
    expect(w.find('[data-test="preview"]').exists()).toBe(true)
    await w.find('[data-test="preview-close"]').trigger('click')
    expect(w.find('[data-test="preview"]').exists()).toBe(false)
  })

  it('PC: ada kolom Detail, tanpa catatan laptop', async () => {
    media(true)
    const w = await mountPage()
    expect(w.find('[data-test="info"]').text()).toContain('Perihal')
    expect(w.text()).not.toContain('Lebih enak di laptop')
  })

  it('id nggak ada: Invoice-nya nggak ketemu', async () => {
    const w = await mountPage([])
    expect(w.text()).toContain('Invoice-nya nggak ketemu.')
    await w.find('[data-test="notfound-back"]').trigger('click')
    expect(ionRouter.back).toHaveBeenCalled()
  })
})
