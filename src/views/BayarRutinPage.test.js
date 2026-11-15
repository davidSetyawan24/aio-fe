import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import BayarRutinForm from '@/components/BayarRutinForm.vue'
import { setBayarRutinApi } from '@/stores/bayarRutin.js'
import { setWalletApi } from '@/stores/wallet.js'
import BayarRutinPage from './BayarRutinPage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
const toastCreate = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  onIonViewWillEnter: (fn) => fn(),
  toastController: { create: toastCreate },
}))

const jago = { id: 10, name: 'Jago Fixed Cost', kind: 'debit', bank: 'Jago', archived: false }
const bca = { id: 20, name: 'CC BCA Lama', kind: 'cc', bank: 'BCA', archived: true }
const reminders = [{ offset: 3, time: '09:00' }, { offset: 0, time: '09:00' }]
const bills = [
  { id: 1, name: 'Netflix', emoji: '🎬', tint: '#FFE0E6', amount: 186000, freq: 'monthly', day: 15, month: null, reminders, startMonth: '2026-11', currentPaid: false, source: bca },
  { id: 2, name: 'Cicilan motor', emoji: '🛵', tint: '#DCEBFF', amount: 1250000, freq: 'monthly', day: 12, month: null, reminders, startMonth: '2026-11', currentPaid: false, source: jago },
  { id: 3, name: 'YouTube', emoji: '▶️', tint: '#FFE9D6', amount: 59000, freq: 'monthly', day: 1, month: null, reminders: [], startMonth: '2026-11', currentPaid: true, source: jago },
  { id: 4, name: 'Domain', emoji: '🌐', tint: '#FFF3B8', amount: 250000, freq: 'yearly', day: 12, month: 3, reminders, startMonth: '2027-03', currentPaid: false, source: jago },
]
const row = (b, over) => ({ billId: b.id, name: b.name, emoji: b.emoji, tint: b.tint, amount: b.amount, sourceId: b.source.id, freq: b.freq, period: '2026-11', dueOn: `2026-11-${String(b.day).padStart(2, '0')}`, lateDays: 0, daysLeft: 0, paidOn: null, ...over })
const list = (over = {}) => ({
  month: '2026-11',
  today: '2026-11-15',
  firstMonth: '2026-11',
  summary: { total: 1495000, paid: 59000, left: 1436000, count: 3, paidCount: 1, lateCount: 1 },
  rows: [row(bills[1], { status: 'late', lateDays: 3 }), row(bills[0], { status: 'open', daysLeft: 0 }), row(bills[2], { status: 'paid', paidOn: '2026-11-01' })],
  bySource: [{ sourceId: 10, total: 1250000, count: 1 }, { sourceId: 20, total: 186000, count: 1 }],
  bills,
  ...over,
})

let api
const mounted = []
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))
beforeEach(() => {
  ionRouter.push.mockClear()
  toastCreate.mockReset().mockResolvedValue({ present: vi.fn() })
})

async function mountPage(data = list()) {
  api = {
    get: vi.fn(async (url) => (url.includes('month=2026-12') ? list({ month: '2026-12', rows: [], summary: { total: 0, paid: 0, left: 0, count: 0, paidCount: 0, lateCount: 0 }, bySource: [] }) : data)),
    put: vi.fn(async () => ({ row: {} })),
    del: vi.fn(async () => ({ row: {} })),
  }
  setBayarRutinApi(api)
  setWalletApi({ get: vi.fn(async () => ({ sources: [] })) })
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/tabs/menu/bayar-rutin', component: BayarRutinPage }] })
  router.push('/tabs/menu/bayar-rutin')
  await router.isReady()
  const w = mount(BayarRutinPage, { global: { plugins: [pinia, router], stubs: { teleport: true } }, attachTo: document.body })
  mounted.push(w)
  await flushPromises()
  return w
}

describe('BayarRutinPage', () => {
  it('shows what is still unpaid this month in the title and the black card', async () => {
    const w = await mountPage()
    expect(w.find('h1').text()).toContain('Rp1.436.000')
    expect(w.find('h1').text()).toContain('belum lunas November')
    const hero = w.find('[data-test="hero"]').text()
    expect(hero).toContain('November 2026')
    expect(hero).toContain('Rp1.436.000')
    expect(hero).toContain('Total Rp1.495.000')
    expect(hero).toContain('Lunas 1/3')
    expect(hero).toContain('1 telat')
  })

  it('splits the month into Telat, Belum lunas and Lunas with chips', async () => {
    const w = await mountPage()
    expect(w.find('[data-test="sec-late"]').text()).toContain('Cicilan motor')
    expect(w.find('[data-test="sec-late"]').text()).toContain('Telat 3 hari')
    expect(w.find('[data-test="sec-open"]').text()).toContain('Netflix')
    expect(w.find('[data-test="sec-open"]').text()).toContain('Hari ini')
    expect(w.find('[data-test="sec-open"]').text()).toContain('15 Nov · CC BCA Lama')
    expect(w.find('[data-test="sec-paid"]').text()).toContain('YouTube')
    expect(w.find('[data-test="sec-paid"]').text()).toContain('Lunas')
  })

  it('ticks a row as paid', async () => {
    const w = await mountPage()
    await w.find('[data-test="sec-open"] [data-test="tick"]').trigger('click')
    await flushPromises()
    expect(api.put).toHaveBeenCalledWith('/recurring-bills/1/payments/2026-11', {})
  })

  it('shows money to prepare per account, archived accounts included', async () => {
    const w = await mountPage()
    const prep = w.find('[data-test="prep"]').text()
    expect(prep).toContain('Jago Fixed Cost')
    expect(prep).toContain('Rp1.250.000')
    expect(prep).toContain('CC BCA Lama')
  })

  it('moves between months but not before the first one', async () => {
    const w = await mountPage()
    expect(w.find('[data-test="prev"]').attributes('disabled')).toBeDefined()
    await w.find('[data-test="next"]').trigger('click')
    await flushPromises()
    expect(api.get).toHaveBeenLastCalledWith('/recurring-bills?month=2026-12')
    expect(w.find('[data-test="prep"]').text()).toContain('Nggak ada yang perlu disiapin. Aman 🎉')
  })

  it('shows "Semua lunas" when nothing is left this month', async () => {
    const w = await mountPage(list({ summary: { total: 59000, paid: 59000, left: 0, count: 1, paidCount: 1, lateCount: 0 }, rows: [row(bills[2], { status: 'paid' })], bySource: [] }))
    expect(w.find('[data-test="hero"]').text()).toContain('Semua lunas 🎉')
    expect(w.find('[data-test="hero"]').text()).not.toContain('telat')
  })

  it('lists every bill under Semua with totals and reminders', async () => {
    const w = await mountPage()
    await w.find('[data-test="seg-all"]').trigger('click')
    const all = w.find('[data-test="all"]').text()
    expect(all).toContain('Bulanan')
    expect(all).toContain('Sebulan')
    expect(all).toContain('Rp1.495.000')
    expect(all).toContain('Tahunan')
    expect(all).toContain('Setahun')
    expect(all).toContain('Tiap tahun 12 Mar · Jago Fixed Cost')
    expect(all).toContain('H-3 · 09.00, Hari H · 09.00')
  })

  it('welcomes an empty list', async () => {
    const w = await mountPage(list({ summary: { total: 0, paid: 0, left: 0, count: 0, paidCount: 0, lateCount: 0 }, rows: [], bySource: [], bills: [] }))
    expect(w.text()).toContain('Belum ada bayar rutin')
  })

  it('opens the form pages on a phone', async () => {
    const w = await mountPage()
    await w.find('[data-test="sec-open"] [data-test="edit"]').trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/bayar-rutin/1/ubah')
    await w.find('[data-test="add"]').trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/bayar-rutin/baru')
  })

  describe('on a wide screen', () => {
    beforeEach(() => {
      window.matchMedia = vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    })
    afterEach(() => {
      delete window.matchMedia
    })

    it('shows the card, the month and every bill side by side without the switch', async () => {
      const w = await mountPage()
      expect(w.find('[data-test="add"]').exists()).toBe(false)
      expect(w.find('[data-test="pc-add"]').exists()).toBe(true)
      expect(w.find('[data-test="seg-all"]').exists()).toBe(false)
      expect(w.find('[data-test="hero"]').exists()).toBe(true)
      expect(w.find('[data-test="sec-open"]').exists()).toBe(true)
      expect(w.find('[data-test="all"]').exists()).toBe(true)
    })

    it('opens add and edit in the side panel instead of a new page', async () => {
      const w = await mountPage()
      const panel = () => w.find('[data-test="panel"]')
      expect(panel().classes()).not.toContain('show')
      await w.find('[data-test="pc-add"]').trigger('click')
      expect(panel().classes()).toContain('show')
      expect(w.findComponent(BayarRutinForm).props('billId')).toBeNull()
      await w.find('[data-test="panel-close"]').trigger('click')
      expect(panel().classes()).not.toContain('show')
      await w.find('[data-test="sec-open"] [data-test="edit"]').trigger('click')
      expect(panel().classes()).toContain('show')
      expect(w.findComponent(BayarRutinForm).props('billId')).toBe(1)
      expect(w.find('[data-test="panel"]').text()).toContain('Netflix')
      expect(ionRouter.push).not.toHaveBeenCalled()
    })

    it('closes only the account list on Esc, keeping the panel and what was typed', async () => {
      const w = await mountPage()
      await w.find('[data-test="pc-add"]').trigger('click')
      await w.find('[data-test="amount"]').setValue('50000')
      await w.find('[data-test="more-src"]').trigger('click')
      expect(w.find('.br-src-sheet').classes()).toContain('show')
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await flushPromises()
      expect(w.find('.br-src-sheet').classes()).not.toContain('show')
      expect(w.find('[data-test="panel"]').classes()).toContain('show')
      expect(w.find('[data-test="amount"]').element.value).toBe('50.000')
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await flushPromises()
      expect(w.find('[data-test="panel"]').classes()).not.toContain('show')
    })

    it('closes the panel and shows a toast once saved', async () => {
      const w = await mountPage()
      await w.findAll('[data-test="master"]')[0].trigger('click')
      w.findComponent(BayarRutinForm).vm.$emit('done', 'Disimpen.')
      await flushPromises()
      expect(w.find('[data-test="panel"]').classes()).not.toContain('show')
      expect(toastCreate).toHaveBeenCalledWith(expect.objectContaining({ message: 'Disimpen.' }))
    })
  })
})
