import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import SplitBillDetail from '@/components/SplitBillDetail.vue'
import SplitBillWizard from '@/components/SplitBillWizard.vue'
import { setSplitBillsApi } from '@/stores/splitBills.js'
import SplitBillPage from './SplitBillPage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  onIonViewWillEnter: (fn) => fn(),
  actionSheetController: { create: async () => ({ present: vi.fn(), onDidDismiss: async () => ({ data: 'delete' }) }) },
  toastController: { create: async () => ({ present: vi.fn() }) },
}))

const summary = {
  outstanding: 96210,
  waitingCount: 1,
  unpaidPeople: ['Sinta', 'Raka'],
  bills: [
    { id: 7, place: 'Sushi Tei', emoji: '🍣', spentOn: '2026-11-14', total: 316865, peopleCount: 4, othersCount: 3, unpaidCount: 2, outstanding: 96210 },
    { id: 3, place: 'Bensin', emoji: '🚗', spentOn: '2026-11-09', total: 450000, peopleCount: 3, othersCount: 2, unpaidCount: 0, outstanding: 0 },
  ],
}
const bill = { id: 7, place: 'Sushi Tei', emoji: '🍣', spentOn: '2026-11-14', total: 316865, outstanding: 96210, discount: 0, service: 0, tax: 0, other: 0, people: [], items: [], shares: [] }

let api
let testRouter
async function mountPage(data = summary, path = '/tabs/menu/split-bill') {
  api = { get: vi.fn(async (url) => (url === '/split-bills' ? data : { bill })), del: vi.fn(async () => null) }
  setSplitBillsApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/tabs/menu/split-bill', component: SplitBillPage }] })
  testRouter = router
  vi.spyOn(router, 'replace')
  router.push(path)
  await router.isReady()
  const w = mount(SplitBillPage, { global: { plugins: [pinia, router], stubs: { teleport: true } } })
  await flushPromises()
  return w
}

beforeEach(() => ionRouter.push.mockClear())

describe('SplitBillPage', () => {
  it('shows how much is still with friends and every split bill', async () => {
    const w = await mountPage()
    expect(w.find('h1').text()).toBe('Rp96.210masih di temen-temen')
    expect(w.find('[data-test="owed"]').text()).toBe('Rp96.210')
    expect(w.find('[data-test="hero"]').text()).toContain('2 orang belum bayar')
    expect(w.find('[data-test="hero"]').text()).toContain('dari 1 split bill')
    const rows = w.findAll('[data-test="bill"]')
    expect(rows[0].text()).toContain('Sushi Tei')
    expect(rows[0].text()).toContain('14 Nov · 4 orang · total Rp316.865')
    expect(rows[0].text()).toContain('2 dari 3 belum bayar')
    expect(rows[0].text()).toContain('Rp96.210')
    expect(rows[1].text()).toContain('lunas semua')
  })

  it('invites to make the first one when there is none', async () => {
    const w = await mountPage({ outstanding: 0, waitingCount: 0, unpaidPeople: [], bills: [] })
    expect(w.find('[data-test="owed"]').text()).toBe('Aman 🎉')
    expect(w.find('[data-test="empty"]').text()).toContain('Belum ada split bill')
  })

  it('HP: ?baru=1 is ignored and dropped from the address', async () => {
    const w = await mountPage(summary, '/tabs/menu/split-bill?baru=1')
    expect(w.findComponent(SplitBillWizard).exists()).toBe(false)
    expect(ionRouter.push).not.toHaveBeenCalled()
    expect(testRouter.replace).toHaveBeenCalledWith({ path: '/tabs/menu/split-bill', query: {} })
  })

  it('opens a bill and the new split bill flow on the phone', async () => {
    const w = await mountPage()
    await w.findAll('[data-test="bill"]')[0].trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/split-bill/7')
    await w.find('[data-test="add"]').trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/split-bill/baru')
  })

  describe('on a wide screen', () => {
    beforeEach(() => {
      window.matchMedia = vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    })
    afterEach(() => {
      delete window.matchMedia
    })

    it('shows the picked bill in the right panel instead of opening a page', async () => {
      const w = await mountPage()
      expect(w.find('[data-test="add"]').exists()).toBe(false)
      expect(w.find('[data-test="panel"]').text()).toContain('Abis makan bareng?')
      await w.findAll('[data-test="bill"]')[0].trigger('click')
      await flushPromises()
      expect(ionRouter.push).not.toHaveBeenCalled()
      expect(api.get).toHaveBeenCalledWith('/split-bills/7')
      expect(w.findComponent(SplitBillDetail).props('billId')).toBe(7)
    })

    it('clears the right panel after the picked bill is deleted', async () => {
      const w = await mountPage()
      await w.findAll('[data-test="bill"]')[0].trigger('click')
      await flushPromises()
      await w.find('[data-test="delete"]').trigger('click')
      await flushPromises()
      expect(api.del).toHaveBeenCalledWith('/split-bills/7')
      expect(w.find('[data-test="bill"].picked').exists()).toBe(false)
      expect(w.find('[data-test="panel"]').text()).toContain('Abis makan bareng?')
    })

    it('?baru=1 (from Beranda) opens the new split bill in the panel and drops the query', async () => {
      const w = await mountPage(summary, '/tabs/menu/split-bill?baru=1')
      const wizard = w.findComponent(SplitBillWizard)
      expect(wizard.exists()).toBe(true)
      expect(wizard.props('wide')).toBe(true)
      expect(wizard.props('bill')).toBeNull()
      expect(ionRouter.push).not.toHaveBeenCalled()
      expect(testRouter.replace).toHaveBeenCalledWith({ path: '/tabs/menu/split-bill', query: {} })
    })

    it('without ?baru=1 the address is left alone', async () => {
      await mountPage()
      expect(testRouter.replace).not.toHaveBeenCalled()
    })

    it('makes a new split bill right in the panel, then shows it', async () => {
      const w = await mountPage()
      await w.find('[data-test="new-pc"]').trigger('click')
      const wizard = w.findComponent(SplitBillWizard)
      expect(wizard.props('wide')).toBe(true)
      expect(ionRouter.push).not.toHaveBeenCalled()
      wizard.vm.$emit('saved', { ...bill, id: 7 })
      await flushPromises()
      expect(w.findComponent(SplitBillWizard).exists()).toBe(false)
      expect(w.findComponent(SplitBillDetail).props('billId')).toBe(7)
    })
  })
})
