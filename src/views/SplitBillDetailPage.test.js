import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import SplitBillDetail from '@/components/SplitBillDetail.vue'
import { setSplitBillsApi } from '@/stores/splitBills.js'
import SplitBillDetailPage from './SplitBillDetailPage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  onIonViewWillEnter: (fn) => fn(),
}))

const bill = { id: 7, place: 'Sushi Tei', emoji: '🍣', spentOn: '2026-11-14', total: 0, outstanding: 0, discount: 0, service: 0, tax: 0, other: 0, people: [], items: [], shares: [] }

async function mountPage(found = true) {
  setSplitBillsApi({ get: vi.fn(async () => (found ? { bill } : Promise.reject({ status: 404, message: 'Split bill nggak ketemu.' }))) })
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/tabs/menu/split-bill/:id', component: SplitBillDetailPage }] })
  router.push('/tabs/menu/split-bill/7')
  await router.isReady()
  const w = mount(SplitBillDetailPage, { global: { plugins: [pinia, router], stubs: { teleport: true } } })
  await flushPromises()
  return w
}

beforeEach(() => {
  ionRouter.push.mockClear()
  ionRouter.back.mockClear()
})

describe('SplitBillDetailPage', () => {
  it('loads the bill from the link and goes to the edit flow', async () => {
    const w = await mountPage()
    const detail = w.findComponent(SplitBillDetail)
    expect(detail.props('billId')).toBe('7')
    detail.vm.$emit('edit')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/split-bill/7/ubah')
    detail.vm.$emit('deleted')
    expect(ionRouter.back).toHaveBeenCalled()
  })

  it('says so when the bill is gone', async () => {
    const w = await mountPage(false)
    expect(w.text()).toContain('Split bill nggak ketemu.')
  })
})
