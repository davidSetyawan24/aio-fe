import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useBudgetsStore, setBudgetsApi } from '@/stores/budgets.js'
import { setCategoriesApi } from '@/stores/categories.js'
import { setExpensesApi } from '@/stores/expenses.js'
import BudgetSheet from './BudgetSheet.vue'

const toast = vi.hoisted(() => ({ present: vi.fn() }))
const toastCreate = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  toastController: { create: toastCreate },
}))

const makan = { id: 1, name: 'Makan', emoji: '🍜', tint: '#FFE9D6', budget: 900000, spent: 310000 }
const ngopi = { id: 2, name: 'Ngopi', emoji: '☕', tint: '#FFF3B8', budget: 450000, spent: 380000 }
const transport = { id: 4, name: 'Transportasi', emoji: '🚗', tint: '#DCEBFF', budget: 0, spent: 80000 }
const hiburan = { id: 5, name: 'Hiburan', emoji: '🎬', tint: '#FFE0E6', budget: 0, spent: 0 }
const overview = { today: '2026-11-14', month: '2026-11', total: 1350000, categories: [makan, ngopi, transport, hiburan], history: [], lastMonth: null }

let budgetsApi
let categoriesApi
const mounted = []
async function mountSheet(props) {
  budgetsApi = {
    get: vi.fn(async () => overview),
    put: vi.fn(async () => overview),
    del: vi.fn(async () => overview),
  }
  categoriesApi = {
    get: vi.fn(async () => ({ categories: [] })),
    post: vi.fn(async (url, body) => ({ category: { id: 9, ...body } })),
  }
  setBudgetsApi(budgetsApi)
  setCategoriesApi(categoriesApi)
  setExpensesApi({ get: vi.fn(async () => ({})) })
  const pinia = createPinia()
  setActivePinia(pinia)
  useBudgetsStore().overview = overview
  const w = mount(BudgetSheet, { props: { open: true, ...props }, global: { plugins: [pinia], stubs: { teleport: true } }, attachTo: document.body })
  mounted.push(w)
  await flushPromises()
  return w
}
async function typeIn(w, sel, text) {
  const el = w.find(sel)
  el.element.value = text
  await el.trigger('input')
}
const save = (w) => w.find('[data-test="save"]')

beforeEach(() => toastCreate.mockReset().mockResolvedValue(toast))
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  document.body.innerHTML = ''
})

describe('BudgetSheet — ubah budget', () => {
  it('starts from the current budget and shows the daily share and when it applies', async () => {
    const w = await mountSheet({ category: ngopi })
    expect(w.text()).toContain('Ngopi')
    expect(w.text()).toContain('budget sekarang Rp450.000 sebulan')
    expect(w.find('[data-test="amount"]').element.value).toBe('450.000')
    expect(w.find('[data-test="per"]').text()).toBe('≈ Rp15.000 sehari')
    expect(w.text()).toContain('Berlaku mulai hari ini (14 Nov)')
  })

  it('puts the cursor in the amount on a Mac, but not on a touch screen (iOS scrolls to it when tapped)', async () => {
    const media = (coarse) => vi.fn((q) => ({ matches: q === '(pointer: coarse)' ? coarse : false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    window.matchMedia = media(false)
    const mac = await mountSheet({ category: ngopi })
    expect(document.activeElement).toBe(mac.find('[data-test="amount"]').element)
    mac.unmount()
    mounted.splice(mounted.indexOf(mac), 1)
    window.matchMedia = media(true)
    const phone = await mountSheet({ category: ngopi })
    expect(document.activeElement).not.toBe(phone.find('[data-test="amount"]').element)
    delete window.matchMedia
  })

  it('saves the new amount once even when tapped twice, then closes', async () => {
    const w = await mountSheet({ category: ngopi })
    await typeIn(w, '[data-test="amount"]', '600000')
    expect(w.find('[data-test="amount"]').element.value).toBe('600.000')
    await save(w).trigger('click')
    await save(w).trigger('click')
    await flushPromises()
    expect(budgetsApi.put).toHaveBeenCalledTimes(1)
    expect(budgetsApi.put).toHaveBeenCalledWith('/budgets/2', { amount: 600000 })
    expect(w.emitted('close')).toHaveLength(1)
  })

  it('keeps Simpan off without an amount', async () => {
    const w = await mountSheet({ category: ngopi })
    await typeIn(w, '[data-test="amount"]', '')
    expect(save(w).attributes('disabled')).toBeDefined()
  })

  it('releases the budget, and only offers that when there is one', async () => {
    const w = await mountSheet({ category: ngopi })
    await w.find('[data-test="release"]').trigger('click')
    await flushPromises()
    expect(budgetsApi.del).toHaveBeenCalledWith('/budgets/2')
    expect(w.emitted('close')).toHaveLength(1)

    const none = await mountSheet({ category: transport })
    expect(none.find('[data-test="release"]').exists()).toBe(false)
    expect(none.text()).toContain('belum ada budget')
  })

  it('closes with Escape (keyboard on Mac/iPad)', async () => {
    const w = await mountSheet({ category: ngopi })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(w.emitted('close')).toHaveLength(1)
    await w.setProps({ open: false })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(w.emitted('close')).toHaveLength(1)
  })

  it('shows the server message and stays open when saving fails', async () => {
    const w = await mountSheet({ category: ngopi })
    budgetsApi.put.mockRejectedValue({ status: 0, message: 'Server nggak bisa dihubungi.' })
    await save(w).trigger('click')
    await flushPromises()
    expect(w.find('[role="alert"]').text()).toBe('Server nggak bisa dihubungi.')
    expect(w.emitted('close')).toBeUndefined()
  })
})

describe('BudgetSheet — budget baru', () => {
  it('offers only categories without a budget', async () => {
    const w = await mountSheet({ category: null })
    expect(w.text()).toContain('Budget baru')
    expect(w.findAll('[data-pick]').map((b) => b.text())).toEqual(['🚗Transportasi', '🎬Hiburan'])
  })

  it('sets a budget on a picked category', async () => {
    const w = await mountSheet({ category: null })
    expect(save(w).attributes('disabled')).toBeDefined()
    await w.find('[data-pick="4"]').trigger('click')
    await typeIn(w, '[data-test="amount"]', '200000')
    await save(w).trigger('click')
    await flushPromises()
    expect(budgetsApi.put).toHaveBeenCalledWith('/budgets/4', { amount: 200000 })
    expect(w.emitted('close')).toHaveLength(1)
  })

  it('makes a new category on the spot, then sets its budget — once, even when tapped twice', async () => {
    const w = await mountSheet({ category: null })
    await w.find('[data-test="new-cat"]').trigger('click')
    await typeIn(w, '[data-test="amount"]', '150000')
    expect(save(w).attributes('disabled')).toBeDefined()
    await typeIn(w, '[data-test="cat-name"]', '  Skincare ')
    await w.find('[data-emoji="💊"]').trigger('click')
    await w.find('[data-tint="#DCEBFF"]').trigger('click')
    await save(w).trigger('click')
    await save(w).trigger('click')
    await flushPromises()
    expect(categoriesApi.post).toHaveBeenCalledTimes(1)
    expect(categoriesApi.post).toHaveBeenCalledWith('/expense-categories', { name: 'Skincare', emoji: '💊', tint: '#DCEBFF' })
    expect(budgetsApi.put).toHaveBeenCalledTimes(1)
    expect(budgetsApi.put).toHaveBeenCalledWith('/budgets/9', { amount: 150000 })
  })

  it('shows why the new category was refused and sets no budget', async () => {
    const w = await mountSheet({ category: null })
    categoriesApi.post.mockRejectedValue({ status: 422, message: 'Data tidak valid.', fields: { name: ['Kategori "Makan" udah ada.'] } })
    await w.find('[data-test="new-cat"]').trigger('click')
    await typeIn(w, '[data-test="cat-name"]', 'makan')
    await typeIn(w, '[data-test="amount"]', '150000')
    await save(w).trigger('click')
    await flushPromises()
    expect(w.find('[role="alert"]').text()).toBe('Kategori "Makan" udah ada.')
    expect(budgetsApi.put).not.toHaveBeenCalled()
  })

  it('does not make the category twice when only the budget failed and Simpan is tapped again', async () => {
    const w = await mountSheet({ category: null })
    await w.find('[data-test="new-cat"]').trigger('click')
    await typeIn(w, '[data-test="cat-name"]', 'Skincare')
    await typeIn(w, '[data-test="amount"]', '150000')
    budgetsApi.put.mockRejectedValueOnce({ status: 0, message: 'Server nggak bisa dihubungi.' })
    await save(w).trigger('click')
    await flushPromises()
    await save(w).trigger('click')
    await flushPromises()
    expect(categoriesApi.post).toHaveBeenCalledTimes(1)
    expect(budgetsApi.put).toHaveBeenLastCalledWith('/budgets/9', { amount: 150000 })
    expect(w.emitted('close')).toHaveLength(1)
  })
})
