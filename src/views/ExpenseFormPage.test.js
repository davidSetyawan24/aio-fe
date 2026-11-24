import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { setCategoriesApi } from '@/stores/categories.js'
import { setExpensesApi } from '@/stores/expenses.js'
import { setWalletApi } from '@/stores/wallet.js'
import ExpenseFormPage from './ExpenseFormPage.vue'

const hooks = vi.hoisted(() => ({ didEnter: [] }))
const sheet = vi.hoisted(() => ({ present: vi.fn(), onDidDismiss: vi.fn(async () => ({ data: 'delete' })) }))
const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  onIonViewWillEnter: () => {},
  onIonViewDidEnter: (fn) => hooks.didEnter.push(fn),
  actionSheetController: { create: vi.fn(async () => sheet) },
  toastController: { create: vi.fn(async () => ({ present: vi.fn() })) },
}))

const expense = {
  id: 7, spentOn: '2026-11-10', amount: 18000, note: 'Fore',
  category: { id: 2, name: 'Ngopi', emoji: '☕', tint: '#FFF3B8', archived: false },
  source: { id: 1, name: 'Cash', kind: 'cash', bank: null, archived: false },
}

async function mountPage(path) {
  hooks.didEnter = []
  setCategoriesApi({ get: vi.fn(async () => ({ categories: [expense.category] })) })
  setWalletApi({ get: vi.fn(async () => ({ sources: [] })) })
  let list = [expense]
  setExpensesApi({
    get: vi.fn(async (url) => {
      if (url === '/expenses/summary') return { today: '2026-11-14', todayTotal: 0, todayCount: 0, monthTotal: 0, last7Days: [], lastSourceId: 1 }
      if (url === '/expenses/suggestions') return { suggestions: [] }
      return { month: '2026-11', expenses: list }
    }),
    del: vi.fn(async () => {
      list = []
      return null
    }),
  })
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/tabs/menu/duit/catat', component: ExpenseFormPage },
      { path: '/tabs/menu/duit/:id', component: ExpenseFormPage },
    ],
  })
  router.push(path)
  await router.isReady()
  const w = mount(ExpenseFormPage, { global: { plugins: [pinia, router] }, attachTo: document.body })
  await flushPromises()
  return w
}
afterEach(() => (document.body.innerHTML = ''))
beforeEach(() => ionRouter.back.mockClear())

describe('ExpenseFormPage', () => {
  it('puts the cursor in the amount once the Catat screen is shown', async () => {
    const w = await mountPage('/tabs/menu/duit/catat')
    hooks.didEnter.forEach((fn) => fn())
    expect(document.activeElement).toBe(w.find('[data-test="amount"]').element)
  })

  it('opens an expense from a direct link and leaves the cursor alone', async () => {
    const w = await mountPage('/tabs/menu/duit/7')
    hooks.didEnter.forEach((fn) => fn())
    expect(w.find('[data-test="amount"]').element.value).toBe('18.000')
    expect(document.activeElement).not.toBe(w.find('[data-test="amount"]').element)
  })

  it('opened from Uang → back button says Uang; otherwise Duit', async () => {
    let w = await mountPage('/tabs/menu/duit/7?dari=uang')
    expect(w.find('button.back').text()).toBe('Uang')
    w.unmount()
    w = await mountPage('/tabs/menu/duit/7')
    expect(w.find('button.back').text()).toBe('Duit')
  })

  it('goes back after deleting the expense it shows', async () => {
    const w = await mountPage('/tabs/menu/duit/7')
    await w.find('[data-test="delete"]').trigger('click')
    await flushPromises()
    expect(ionRouter.back).toHaveBeenCalled()
  })
})
