import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { setInvoicesApi } from '@/stores/invoices.js'
import InvoicePage from './InvoicePage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  onIonViewWillEnter: (fn) => fn(),
}))

const inv = (id, over) => ({
  id, number: `INV/DS/2026/11/00${id}`, tint: '#E4F7C4', client: { name: `Klien ${id}`, attn: '', address: '', email: '' }, subject: `Perihal ${id}`,
  issuedOn: '2026-11-01', dueOn: '2026-11-20', paidOn: null, status: 'open', lateDays: 0, daysLeft: 4, totals: { sub: 1000000, disc: 0, tax: 0, total: 1000000 }, ...over,
})
const invoices = [
  inv(1, { dueOn: '2026-11-25', daysLeft: 9, totals: { total: 2000000 } }),
  inv(2, { dueOn: '2026-11-10', status: 'late', lateDays: 6, totals: { total: 500000 } }),
  inv(3, { paidOn: '2026-10-14', status: 'paid', dueOn: '2026-10-15', totals: { total: 3000000 } }),
  inv(4, { paidOn: '2026-11-05', status: 'paid', dueOn: '2026-11-08', totals: { total: 700000 } }),
]
const data = (over = {}) => ({
  today: '2026-11-16',
  summary: { unpaid: 2500000, unpaidCount: 2, lateCount: 1, nearestDue: '2026-11-25', received: [{ month: '2026-11', total: 700000 }, { month: '2026-10', total: 3000000 }], receivedYear: 3700000 },
  invoices,
  ...over,
})

const media = (matches) => (window.matchMedia = vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() })))

async function mountPage(d = data()) {
  setInvoicesApi({ get: vi.fn(async () => d) })
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/tabs/menu/invoice', component: InvoicePage }] })
  router.push('/tabs/menu/invoice')
  await router.isReady()
  const w = mount(InvoicePage, { global: { plugins: [pinia, router], stubs: { teleport: true } } })
  await flushPromises()
  return w
}

beforeEach(() => {
  ionRouter.push.mockClear()
  localStorage.clear()
  media(false)
})

describe('InvoicePage (HP)', () => {
  it('judul total belum dibayar + chip', async () => {
    const w = await mountPage()
    expect(w.find('h1').text()).toBe('Rp2.500.000belum dibayar')
    const minis = w.find('[data-test="minis"]').text()
    expect(minis).toContain('2 belum dibayar')
    expect(minis).toContain('1 telat')
    expect(w.text()).toContain('Lebih enak di laptop')
  })

  it('belum dibayar urut jatuh tempo, lunas urut paidOn terbaru', async () => {
    const w = await mountPage()
    const open = w.findAll('[data-test="sec-open"] [data-test="inv"]').map((r) => r.text())
    expect(open[0]).toContain('Klien 2')
    expect(open[0]).toContain('Telat 6 hari')
    expect(open[1]).toContain('Klien 1')
    const paid = w.findAll('[data-test="sec-paid"] [data-test="inv"]').map((r) => r.text())
    expect(paid[0]).toContain('Klien 4')
    expect(paid[1]).toContain('Klien 3')
    expect(paid[0]).toContain('Lunas')
  })

  it('tap baris, FAB, dan gear', async () => {
    const w = await mountPage()
    await w.findAll('[data-test="inv"]')[0].trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/invoice/2')
    await w.find('[data-test="add"]').trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/invoice/baru')
    await w.find('[data-test="settings"]').trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/invoice/atur')
  })

  it('kosong', async () => {
    const w = await mountPage(data({ invoices: [], summary: { unpaid: 0, unpaidCount: 0, lateCount: 0, nearestDue: null, received: [], receivedYear: 0 } }))
    expect(w.text()).toContain('Belum ada invoice. Bikin yang pertama yuk.')
  })
})

describe('InvoicePage (PC)', () => {
  beforeEach(() => media(true))

  it('kartu hitam, udah masuk per bulan, tahun', async () => {
    const w = await mountPage()
    expect(w.find('[data-test="hero"]').text()).toContain('Rp2.500.000')
    expect(w.find('[data-test="hero"]').text()).toContain('2 invoice')
    expect(w.find('[data-test="hero"]').text()).toContain('1 telat')
    expect(w.find('[data-test="hero"]').text()).toContain('Terdekat 25 Nov')
    const rec = w.find('[data-test="received"]').text()
    expect(rec).toContain('November 2026')
    expect(rec).toContain('Rp700.000')
    expect(rec).toContain('Oktober 2026')
    expect(rec).toContain('Tahun 2026')
    expect(rec).toContain('Rp3.700.000')
    expect(w.text()).not.toContain('Lebih enak di laptop')
    expect(w.find('[data-test="add"]').exists()).toBe(false)
  })

  it('filter segmented', async () => {
    const w = await mountPage()
    expect(w.findAll('[data-test="inv"]')).toHaveLength(4)
    await w.find('[data-test="seg-open"]').trigger('click')
    expect(w.findAll('[data-test="inv"]')).toHaveLength(2)
    await w.find('[data-test="seg-paid"]').trigger('click')
    expect(w.findAll('[data-test="inv"]')).toHaveLength(2)
  })

  it('tombol Bikin & Atur', async () => {
    const w = await mountPage()
    await w.find('[data-test="pc-add"]').trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/invoice/baru')
    await w.find('[data-test="pc-settings"]').trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/invoice/atur')
  })
})
