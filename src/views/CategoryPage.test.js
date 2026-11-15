import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { localToday } from '@/lib/duit.js'
import { setCategoriesApi } from '@/stores/categories.js'
import { setExpensesApi } from '@/stores/expenses.js'
import CategoryForm from '@/components/CategoryForm.vue'
import CategoryPage from './CategoryPage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
const toastCreate = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  onIonViewWillEnter: (fn) => fn(),
  toastController: { create: toastCreate },
}))

const makan = { id: 1, name: 'Makan', emoji: '🍜', tint: '#FFE9D6' }
const ngopi = { id: 2, name: 'Ngopi', emoji: '☕', tint: '#FFF3B8' }

const mounted = []
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))
beforeEach(() => {
  ionRouter.push.mockClear()
  toastCreate.mockReset().mockResolvedValue({ present: vi.fn() })
})

async function mountPage(expensesGet) {
  setCategoriesApi({ get: vi.fn(async () => ({ categories: [makan, ngopi] })) })
  setExpensesApi({ get: expensesGet })
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/tabs/menu/kategori', component: CategoryPage }] })
  router.push('/tabs/menu/kategori')
  await router.isReady()
  const w = mount(CategoryPage, { global: { plugins: [pinia, router], stubs: { teleport: true } }, attachTo: document.body })
  mounted.push(w)
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

  describe('on a wide screen', () => {
    const month = localToday().slice(0, 7)
    const spent = () => vi.fn(async () => ({ month, expenses: [{ id: 1, amount: 18000, category: { id: 2 } }, { id: 2, amount: 32000, category: { id: 2 } }, { id: 3, amount: 20000, category: { id: 1 } }] }))
    const panel = (w) => w.find('[data-test="panel"]')
    beforeEach(() => {
      window.matchMedia = vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    })
    afterEach(() => {
      delete window.matchMedia
    })

    it('shows this month at a glance and the categories as a grid', async () => {
      const w = await mountPage(spent())
      expect(w.find('[data-test="add"]').exists()).toBe(false)
      expect(w.find('[data-test="pc-add"]').exists()).toBe(true)
      const sum = w.find('[data-test="sum"]').text()
      expect(sum).toContain('Keluar bulan ini')
      expect(sum).toContain('Rp70rb')
      expect(sum).toContain('Paling gede')
      expect(sum).toContain('Ngopi')
      const tiles = w.findAll('[data-test="tile"]')
      expect(tiles).toHaveLength(2)
      expect(tiles[1].text()).toContain('2 catatan bulan ini')
      expect(tiles[1].text()).toContain('Rp50rb')
      expect(w.find('[data-test="tile-new"]').exists()).toBe(true)
    })

    it('still works when this month cannot load', async () => {
      const w = await mountPage(vi.fn(async () => { throw new Error('offline') }))
      const sum = w.find('[data-test="sum"]').text()
      expect(sum).toContain('Rp0')
      expect(sum).toContain('Belum ada')
      expect(w.findAll('[data-test="tile"]')).toHaveLength(2)
    })

    it('opens a category in the side panel instead of a new page', async () => {
      const w = await mountPage(spent())
      expect(panel(w).classes()).not.toContain('show')
      await w.findAll('[data-test="tile"]')[1].trigger('click')
      expect(panel(w).classes()).toContain('show')
      expect(w.findComponent(CategoryForm).props('categoryId')).toBe(2)
      expect(ionRouter.push).not.toHaveBeenCalled()
    })

    it('opens an empty form from Tambah and from the new tile', async () => {
      const w = await mountPage(spent())
      await w.find('[data-test="pc-add"]').trigger('click')
      expect(panel(w).classes()).toContain('show')
      expect(w.findComponent(CategoryForm).props('categoryId')).toBeNull()
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await flushPromises()
      expect(panel(w).classes()).not.toContain('show')
      await w.find('[data-test="tile-new"]').trigger('click')
      expect(w.findComponent(CategoryForm).props('categoryId')).toBeNull()
      expect(panel(w).classes()).toContain('show')
    })

    it('closes the panel and says so once the form is done', async () => {
      const w = await mountPage(spent())
      await w.findAll('[data-test="tile"]')[0].trigger('click')
      w.findComponent(CategoryForm).vm.$emit('done', 'Disimpen.')
      await flushPromises()
      expect(panel(w).classes()).not.toContain('show')
      expect(toastCreate).toHaveBeenCalledWith(expect.objectContaining({ message: 'Disimpen.' }))
    })
  })
})
