import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { localToday } from '@/lib/duit.js'
import { setCategoriesApi } from '@/stores/categories.js'
import { setExpensesApi } from '@/stores/expenses.js'
import CategoryPage from './CategoryPage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  onIonViewWillEnter: (fn) => fn(),
}))

const makan = { id: 1, name: 'Makan', emoji: '🍜', tint: '#FFE9D6' }
const ngopi = { id: 2, name: 'Ngopi', emoji: '☕', tint: '#FFF3B8' }

async function mountPage(expensesGet) {
  setCategoriesApi({ get: vi.fn(async () => ({ categories: [makan, ngopi] })) })
  setExpensesApi({ get: expensesGet })
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/tabs/menu/kategori', component: CategoryPage }] })
  router.push('/tabs/menu/kategori')
  await router.isReady()
  const w = mount(CategoryPage, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return w
}

describe('CategoryPage', () => {
  it('shows how often each category was used this month', async () => {
    const month = localToday().slice(0, 7)
    const get = vi.fn(async () => ({ month, expenses: [{ id: 1, amount: 18000, category: { id: 2 } }, { id: 2, amount: 32000, category: { id: 2 } }] }))
    const w = await mountPage(get)
    expect(get).toHaveBeenCalledWith(`/expenses?month=${month}`)
    const rows = w.findAll('[data-test="category"]')
    expect(rows[0].text()).toContain('Kategori pengeluaran')
    expect(rows[1].text()).toContain('2 catatan bulan ini')
    expect(rows[1].text()).toContain('Rp50rb')
  })

  it('still lists the categories when the expenses cannot load', async () => {
    const w = await mountPage(vi.fn(async () => { throw new Error('offline') }))
    expect(w.findAll('[data-test="category"]')).toHaveLength(2)
  })

  it('opens a category and the add form', async () => {
    const w = await mountPage(vi.fn(async () => ({ expenses: [] })))
    await w.find('[data-test="category"]').trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/kategori/1')
    await w.find('[data-test="add"]').trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/kategori/tambah')
  })
})
