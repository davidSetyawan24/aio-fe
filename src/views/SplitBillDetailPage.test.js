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
  actionSheetController: { create: async () => ({ present: vi.fn(), onDidDismiss: async () => ({ data: 'delete' }) }) },
  toastController: { create: async () => ({ present: vi.fn() }) },
}))

const bill = { id: 7, place: 'Sushi Tei', emoji: '🍣', spentOn: '2026-11-14', total: 0, outstanding: 0, discount: 0, service: 0, tax: 0, other: 0, people: [], items: [], shares: [] }

let api
async function mountPage(found = true) {
  api = {
    get: vi.fn(async (url) => {
      if (url === '/split-bills') return { outstanding: 0, waitingCount: 0, unpaidPeople: [], bills: [] }
      return found ? { bill } : Promise.reject({ status: 404, message: 'Split bill nggak ketemu.' })
    }),
    del: vi.fn(async () => null),
  }
  setSplitBillsApi(api)
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

  it('goes back to the list after Hapus is tapped and confirmed', async () => {
    const w = await mountPage()
    await w.find('[data-test="delete"]').trigger('click')
    await flushPromises()
    expect(api.del).toHaveBeenCalledWith('/split-bills/7')
    expect(ionRouter.back).toHaveBeenCalled()
  })

  it('says so when the bill is gone', async () => {
    const w = await mountPage(false)
    expect(w.text()).toContain('Split bill nggak ketemu.')
  })
})
