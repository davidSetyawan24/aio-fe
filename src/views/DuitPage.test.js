import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { setCategoriesApi } from '@/stores/categories.js'
import { setExpensesApi } from '@/stores/expenses.js'
import { setWalletApi } from '@/stores/wallet.js'
import DuitPage from './DuitPage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  onIonViewWillEnter: (fn) => fn(),
}))

const ngopi = { id: 2, name: 'Ngopi', emoji: '☕', tint: '#FFF3B8', archived: false }
const makan = { id: 1, name: 'Makan', emoji: '🍜', tint: '#FFE9D6', archived: false }
const jago = { id: 3, name: 'Jago Utama', kind: 'debit', bank: 'Jago', archived: false }
const ex = (id, spentOn, amount, note, category = ngopi) => ({ id, spentOn, amount, note, category, source: jago, createdAt: '' })
const november = [ex(3, '2026-11-14', 18000, 'Kopi Kenangan'), ex(2, '2026-11-14', 27000, null, makan), ex(1, '2026-11-12', 212000, 'Superindo')]
const october = [ex(9, '2026-10-30', 50000, 'Bakmi GM', makan)]
const summary = {
  today: '2026-11-14', todayTotal: 45000, todayCount: 2, monthTotal: 257000, lastSourceId: 3,
  last7Days: ['08', '09', '10', '11', '12', '13', '14'].map((d) => ({ date: `2026-11-${d}`, total: d === '14' ? 45000 : d === '12' ? 212000 : 0 })),
}

let expensesApi
async function mountPage() {
  expensesApi = {
    get: vi.fn(async (url) => {
      if (url === '/expenses/summary') return summary
      if (url === '/expenses/suggestions') return { suggestions: [] }
      if (url === '/expenses?month=2026-10') return { month: '2026-10', expenses: october }
      return { month: '2026-11', expenses: november }
    }),
  }
  setExpensesApi(expensesApi)
  setCategoriesApi({ get: vi.fn(async () => ({ categories: [makan, ngopi] })) })
  setWalletApi({ get: vi.fn(async () => ({ sources: [] })) })
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/tabs/menu/duit', component: DuitPage }] })
  router.push('/tabs/menu/duit')
  await router.isReady()
  const w = mount(DuitPage, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return w
}

beforeEach(() => ionRouter.push.mockClear())

describe('DuitPage', () => {
  it('shows this month\'s total and today in the black card', async () => {
    const w = await mountPage()
    expect(w.find('h1').text()).toBe('Rp257.000keluar bulan ini')
    expect(w.find('[data-test="today-total"]').text()).toBe('Rp45.000')
    expect(w.find('[data-test="today-count"]').text()).toBe('2 catatan hari ini')
    expect(w.findAll('[data-test="bar"]')).toHaveLength(7)
  })

  it('lists expenses per day with day totals; a blank note shows the category name', async () => {
    const w = await mountPage()
    const days = w.findAll('[data-test="day"]')
    expect(days.map((d) => d.find('[data-test="day-head"]').text())).toEqual(['Hari ini Rp45.000', 'Kamis, 12 Nov Rp212.000'])
    const rows = days[0].findAll('[data-test="expense"]')
    expect(rows[0].text()).toContain('Kopi Kenangan')
    expect(rows[0].text()).toContain('Ngopi · Jago Utama')
    expect(rows[1].find('.title').text()).toBe('Makan')
  })

  it('loads the previous month on request', async () => {
    const w = await mountPage()
    const more = w.find('[data-test="older"]')
    expect(more.text()).toContain('Lihat bulan Oktober')
    await more.trigger('click')
    await flushPromises()
    expect(expensesApi.get).toHaveBeenCalledWith('/expenses?month=2026-10')
    expect(w.findAll('[data-test="day"]').map((d) => d.find('[data-test="day-head"]').text())).toContain('Jumat, 30 Okt Rp50.000')
    expect(w.find('[data-test="older"]').text()).toContain('Lihat bulan September')
  })

  it('opens an expense and the Catat screen', async () => {
    const w = await mountPage()
    await w.find('[data-test="expense"]').trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/duit/3')
    await w.find('[data-test="add"]').trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/duit/catat')
  })

  describe('on a wide screen (iPad landscape / Mac)', () => {
    beforeEach(() => {
      window.matchMedia = vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    })
    afterEach(() => {
      delete window.matchMedia
    })

    it('shows the roomy black card: short amounts above the bars and this month\'s total', async () => {
      const w = await mountPage()
      expect(w.findAll('[data-test="bar"]').map((b) => b.find('em').text())).toEqual(['', '', '', '', '212rb', '', '45rb'])
      expect(w.find('[data-test="month-fact"]').text()).toBe('bulan ini Rp257.000')
    })

    it('puts the Catat form as a card next to the list, without the floating button', async () => {
      const w = await mountPage()
      expect(w.find('[data-test="side-form"] form').exists()).toBe(true)
      expect(w.find('[data-test="add"]').exists()).toBe(false)
    })
  })
})
