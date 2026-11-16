import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { setInvoicesApi } from '@/stores/invoices.js'
import InvoiceFormPage from './InvoiceFormPage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
const toast = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  onIonViewWillEnter: (fn) => fn(),
  onIonViewWillLeave: () => {},
  onIonViewDidEnter: () => {},
  toastController: { create: async (o) => { toast(o.message); return { present: vi.fn() } } },
}))

const settings = (over = {}) => ({
  name: 'David', phone: '', email: '', initial: 'ds', bank: 'BCA', accountNo: '1', accountName: 'D', opening: '', closing: '', signature: null,
  prefix: 'INV/DS', dueDays: 7, defaultNotes: [], lastNumberThisMonth: 1, minLastNumber: 1, complete: true, ...over,
})
const inv = (id, name) => ({
  id, number: `INV/DS/2026/11/00${id}`, clientId: 1, tint: '#eee', paidOn: null, client: { name, attn: '', address: '', email: '' },
  issuedOn: '2026-11-03', dueOn: '2026-11-10', subject: '', items: [{ desc: 'K', detail: '', qty: 1, unit: 'Paket', price: 1000 }],
  discount: 0, taxOn: false, taxPct: 11, notes: [], letterhead: {},
})
const media = (matches) => (window.matchMedia = vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
const Paper = { props: ['invoice'], template: '<div data-test="paper" />' }

let api
async function mountAt(path, { s = settings() } = {}) {
  media(false)
  api = {
    get: vi.fn(async (url) => {
      if (url === '/invoice-settings') return { settings: s }
      if (url === '/invoices/suggestions') return { clients: [], items: [] }
      if (url.startsWith('/invoices/next-number')) return { number: 'INV/DS/2026/11/002' }
      return { today: '2026-11-16', summary: {}, invoices: [inv(7, 'PT Lama')] }
    }),
    post: vi.fn(async (u, body) => ({ invoice: { ...inv(55, 'x'), ...body, id: 55 } })),
    put: vi.fn(async (u, body) => ({ invoice: { ...inv(7, 'x'), ...body, id: 7 } })),
  }
  setInvoicesApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/tabs/menu/invoice/baru', component: InvoiceFormPage }, { path: '/tabs/menu/invoice/:id/ubah', component: InvoiceFormPage }],
  })
  router.push(path)
  await router.isReady()
  const w = mount(InvoiceFormPage, { global: { plugins: [pinia, router], stubs: { teleport: true, InvoicePaper: Paper } } })
  await flushPromises()
  return w
}
const t = (w, id) => w.find(`[data-test="${id}"]`)

beforeEach(() => {
  ionRouter.navigate.mockClear()
  toast.mockClear()
  document.body.classList.remove('aio-no-tabbar')
})

describe('InvoiceFormPage', () => {
  it('Atur invoice belum lengkap → ganti ke /atur?lanjut=baru', async () => {
    const w = await mountAt('/tabs/menu/invoice/baru', { s: settings({ complete: false }) })
    expect(ionRouter.navigate).toHaveBeenCalledWith('/tabs/menu/invoice/atur?lanjut=baru', 'forward', 'replace')
    expect(t(w, 'client-name').exists()).toBe(false)
  })

  it('baru: form tampil, judul nomor perkiraan, tab bar HP disembunyiin', async () => {
    const w = await mountAt('/tabs/menu/invoice/baru')
    expect(t(w, 'client-name').exists()).toBe(true)
    expect(w.text()).toContain('INV/DS/2026/11/002')
    expect(w.text()).toContain('Invoice baru')
    expect(document.body.classList.contains('aio-no-tabbar')).toBe(true)
    w.unmount()
    expect(document.body.classList.contains('aio-no-tabbar')).toBe(false)
  })

  it('Simpan → create → pindah ke detail (replace) + toast dari BE', async () => {
    const w = await mountAt('/tabs/menu/invoice/baru')
    await t(w, 'client-name').setValue('PT Baru')
    await t(w, 'item-desc').setValue('Kerja')
    await t(w, 'save').trigger('click')
    await flushPromises()
    expect(api.post).toHaveBeenCalledTimes(1)
    expect(ionRouter.navigate).toHaveBeenCalledWith('/tabs/menu/invoice/55', 'forward', 'replace')
    expect(toast).toHaveBeenCalledWith('Invoice jadi ✓')
  })

  it('Duplikat (?dari=7): klien kesalin', async () => {
    const w = await mountAt('/tabs/menu/invoice/baru?dari=7')
    expect(t(w, 'client-name').element.value).toBe('PT Lama')
    expect(t(w, 'issued-date').element.value).toBe('2026-11-16')
  })

  it('Ubah (/:id/ubah): judul nomor asli, Simpan → update → detail', async () => {
    const w = await mountAt('/tabs/menu/invoice/7/ubah')
    expect(w.text()).toContain('Ubah invoice')
    expect(w.text()).toContain('INV/DS/2026/11/007')
    await t(w, 'save').trigger('click')
    await flushPromises()
    expect(api.put).toHaveBeenCalledWith('/invoices/7', expect.any(Object))
    expect(ionRouter.navigate).toHaveBeenCalledWith('/tabs/menu/invoice/7', 'forward', 'replace')
    expect(toast).toHaveBeenCalledWith('Kesimpen, PDF-nya udah ikut baru ✓')
  })

  it('Ubah invoice yang nggak ada → pesan nggak ketemu', async () => {
    const w = await mountAt('/tabs/menu/invoice/999/ubah')
    expect(t(w, 'notfound').exists()).toBe(true)
    expect(t(w, 'client-name').exists()).toBe(false)
  })
})
