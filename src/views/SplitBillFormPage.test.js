import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import SplitBillWizard from '@/components/SplitBillWizard.vue'
import { setSplitBillsApi } from '@/stores/splitBills.js'
import SplitBillFormPage from './SplitBillFormPage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
vi.mock('@ionic/vue', async (importOriginal) => ({ ...(await importOriginal()), useIonRouter: () => ionRouter, onIonViewWillEnter: (fn) => fn() }))

const bill = { id: 4, place: 'Kopi', emoji: '☕', spentOn: '2026-11-12', discount: 0, service: 0, tax: 0, other: 0, people: [{ id: 'me', name: 'Gue', me: true, paid: true }, { id: 'p1', name: 'Andi', me: false, paid: false }], items: [], shares: [] }

async function mountAt(path) {
  setSplitBillsApi({ get: vi.fn(async () => ({ bill })) })
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/tabs/menu/split-bill/baru', component: SplitBillFormPage }, { path: '/tabs/menu/split-bill/:id/ubah', component: SplitBillFormPage }] })
  router.push(path)
  await router.isReady()
  const w = mount(SplitBillFormPage, { global: { plugins: [pinia, router], stubs: { teleport: true } } })
  await flushPromises()
  return w
}

beforeEach(() => {
  ionRouter.navigate.mockClear()
  ionRouter.back.mockClear()
})

describe('SplitBillFormPage', () => {
  it('makes a new split bill, then replaces itself with the result', async () => {
    const w = await mountAt('/tabs/menu/split-bill/baru')
    const wizard = w.findComponent(SplitBillWizard)
    expect(wizard.props('bill')).toBeNull()
    wizard.vm.$emit('saved', { id: 9 })
    expect(ionRouter.navigate).toHaveBeenCalledWith('/tabs/menu/split-bill/9', 'forward', 'replace')
  })

  it('loads the bill to change it, then goes back', async () => {
    const w = await mountAt('/tabs/menu/split-bill/4/ubah')
    const wizard = w.findComponent(SplitBillWizard)
    expect(wizard.props('bill')).toMatchObject({ id: 4, place: 'Kopi' })
    wizard.vm.$emit('saved', bill)
    expect(ionRouter.back).toHaveBeenCalled()
  })

  describe('on a wide screen', () => {
    beforeEach(() => {
      window.matchMedia = vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    })
    afterEach(() => {
      delete window.matchMedia
    })

    it('a new split bill moves to the right panel of the list', async () => {
      await mountAt('/tabs/menu/split-bill/baru')
      expect(ionRouter.navigate).toHaveBeenCalledWith('/tabs/menu/split-bill?baru=1', 'back', 'replace')
    })

    it('changing a split bill stays on this page', async () => {
      await mountAt('/tabs/menu/split-bill/4/ubah')
      expect(ionRouter.navigate).not.toHaveBeenCalled()
    })
  })
})
