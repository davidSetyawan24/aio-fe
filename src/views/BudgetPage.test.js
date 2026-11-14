import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import BudgetSheet from '@/components/BudgetSheet.vue'
import { setBudgetsApi } from '@/stores/budgets.js'
import BudgetPage from './BudgetPage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  onIonViewWillEnter: (fn) => fn(),
}))

const makan = { id: 1, name: 'Makan', emoji: '🍜', tint: '#FFE9D6', budget: 900000, spent: 310000 }
const ngopi = { id: 2, name: 'Ngopi', emoji: '☕', tint: '#FFF3B8', budget: 450000, spent: 380000 }
const belanja = { id: 3, name: 'Belanja', emoji: '🛒', tint: '#F3E1FF', budget: 900000, spent: 1000000 }
const transport = { id: 4, name: 'Transportasi', emoji: '🚗', tint: '#DCEBFF', budget: 0, spent: 80000 }
const hiburan = { id: 5, name: 'Hiburan', emoji: '🎬', tint: '#FFE0E6', budget: 0, spent: 0 }
const base = {
  today: '2026-11-14', month: '2026-11', daysLeft: 17, total: 2250000, spentBefore: 900000, spentToday: 18000,
  jatahToday: 79400, todayLeft: 61400, monthLeft: 1332000,
  categories: [makan, ngopi, belanja, transport, hiburan],
  history: [
    { date: '2026-11-14', category: ngopi, from: 300000, to: 450000 },
    { date: '2026-11-01', category: makan, from: null, to: 900000 },
  ],
  lastMonth: { month: '2026-10', budget: 2250000, spent: 2040000, left: 210000 },
}

let api
async function mountPage(overview = base) {
  api = { get: vi.fn(async () => overview) }
  setBudgetsApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/tabs/menu/budget', component: BudgetPage }] })
  router.push('/tabs/menu/budget')
  await router.isReady()
  const w = mount(BudgetPage, { global: { plugins: [pinia, router], stubs: { teleport: true } } })
  await flushPromises()
  return w
}
const cat = (w, id) => w.find(`[data-test="cat"][data-cat="${id}"]`)

describe('BudgetPage', () => {
  it('shows this month\'s total budget and what is left for today', async () => {
    const w = await mountPage()
    expect(api.get).toHaveBeenCalledWith('/budgets')
    expect(w.find('h1').text()).toBe('Rp2.250.000budget November')
    expect(w.find('[data-test="left-label"]').text()).toBe('Sisa jatah hari ini')
    const left = w.find('[data-test="left"]')
    expect(left.text()).toBe('Rp61.400')
    expect(left.classes()).not.toContain('over')
    const facts = w.find('[data-test="hero"]').text()
    expect(facts).toContain('jatah Rp79.400')
    expect(facts).toContain('udah keluar Rp18.000')
    expect(facts).toContain('sisa budget bulan ini Rp1,3jt')
    expect(facts).toContain('17 hari lagi')
    expect(facts).toContain('kepake Rp918rb dari Rp2,3jt')
  })

  it('shows the overrun in coral when today went past the allowance', async () => {
    const w = await mountPage({ ...base, spentToday: 84400, todayLeft: -5000 })
    expect(w.find('[data-test="left-label"]').text()).toBe('Jatah hari ini kelewat')
    expect(w.find('[data-test="left"]').text()).toBe('−Rp5.000')
    expect(w.find('[data-test="left"]').classes()).toContain('over')
    expect(w.find('[data-test="meter"]').classes()).toContain('over')
  })

  it('invites to set a budget when there is none yet', async () => {
    const w = await mountPage({ ...base, total: 0, jatahToday: 0, todayLeft: -18000, categories: [{ ...makan, budget: 0 }], history: [], lastMonth: null })
    expect(w.find('[data-test="no-budget"]').text()).toContain('Belum ada budget')
    expect(w.find('[data-test="left"]').exists()).toBe(false)
    expect(w.find('[data-test="last-month"]').exists()).toBe(false)
    expect(w.find('[data-test="history"]').text()).toContain('Belum ada perubahan bulan ini.')
  })

  it('shows each category against its budget, with the warning colours', async () => {
    const w = await mountPage()
    expect(w.find('[data-test="cat-sum"]').text()).toBe('3 dari 5 pakai budget')
    expect(cat(w, 1).text()).toContain('Rp310rb / Rp900rb')
    expect(cat(w, 1).text()).toContain('sisa Rp590.000')
    expect(cat(w, 2).find('.bar i').classes()).toContain('warn')
    expect(cat(w, 3).text()).toContain('kelewat Rp100.000')
    expect(cat(w, 3).find('.bar i').classes()).toContain('over')
    expect(cat(w, 4).text()).toContain('di luar budget')
    expect(cat(w, 4).text()).toContain('kepake Rp80.000 bulan ini')
    expect(cat(w, 4).text()).toContain('Pasang')
    expect(cat(w, 5).text()).toContain('belum ada pengeluaran')
  })

  it('shows what was left last month and this month\'s changes', async () => {
    const w = await mountPage()
    expect(w.find('[data-test="last-month"]').text()).toContain('Oktober · tersisa dana Rp210.000')
    expect(w.find('[data-test="last-month"]').text()).toContain('budget Rp2.250.000 · keluar Rp2.040.000')
    const rows = w.findAll('[data-test="hist"]')
    expect(rows[0].text()).toContain('14 Nov')
    expect(rows[0].text()).toContain('Ngopi')
    expect(rows[0].text()).toContain('Rp300rb → Rp450rb')
    expect(rows[0].text()).toContain('▲ naik')
    expect(rows[1].text()).toContain('budget dipasang Rp900rb')
  })

  it('says how much last month went over', async () => {
    const w = await mountPage({ ...base, lastMonth: { month: '2026-10', budget: 2000000, spent: 2100000, left: -100000 } })
    expect(w.find('[data-test="last-month"]').text()).toContain('Oktober · kelewat Rp100.000')
  })

  it('opens the sheet for a tapped category, and empty for a new budget', async () => {
    const w = await mountPage()
    const sheet = () => w.findComponent(BudgetSheet)
    expect(sheet().props('open')).toBe(false)
    await cat(w, 2).trigger('click')
    expect(sheet().props('open')).toBe(true)
    expect(sheet().props('category')).toEqual(ngopi)
    sheet().vm.$emit('close')
    await flushPromises()
    expect(sheet().props('open')).toBe(false)
    await w.find('[data-test="new-budget"]').trigger('click')
    expect(sheet().props('open')).toBe(true)
    expect(sheet().props('category')).toBeNull()
  })

  describe('on a wide screen', () => {
    beforeEach(() => {
      window.matchMedia = vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    })
    afterEach(() => {
      delete window.matchMedia
    })

    it('uses the full width with a side column and a centred dialog', async () => {
      const w = await mountPage()
      expect(w.find('.page').classes()).toContain('wide')
      expect(w.find('[data-test="side"]').exists()).toBe(true)
      expect(w.findComponent(BudgetSheet).props('wide')).toBe(true)
    })
  })
})
