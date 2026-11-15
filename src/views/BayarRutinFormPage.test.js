import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import BayarRutinForm from '@/components/BayarRutinForm.vue'
import { setBayarRutinApi } from '@/stores/bayarRutin.js'
import { setWalletApi } from '@/stores/wallet.js'
import BayarRutinFormPage from './BayarRutinFormPage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
const toastCreate = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  onIonViewWillEnter: (fn) => fn(),
  toastController: { create: toastCreate },
}))

const mounted = []
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))
beforeEach(() => {
  ionRouter.back.mockClear()
  ionRouter.navigate.mockClear()
  toastCreate.mockReset().mockResolvedValue({ present: vi.fn() })
})

async function mountAt(path) {
  setBayarRutinApi({ get: vi.fn(async () => ({ month: '2026-11', today: '2026-11-15', firstMonth: '2026-11', summary: null, rows: [], bySource: [], bills: [] })) })
  setWalletApi({ get: vi.fn(async () => ({ sources: [] })) })
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/tabs/menu/bayar-rutin/baru', component: BayarRutinFormPage }, { path: '/tabs/menu/bayar-rutin/:id/ubah', component: BayarRutinFormPage }],
  })
  router.push(path)
  await router.isReady()
  const w = mount(BayarRutinFormPage, { global: { plugins: [pinia, router], stubs: { teleport: true } } })
  mounted.push(w)
  await flushPromises()
  return w
}

describe('BayarRutinFormPage', () => {
  it('opens an empty form for a new bill', async () => {
    const w = await mountAt('/tabs/menu/bayar-rutin/baru')
    expect(w.find('h1').text()).toContain('Bayar rutin baru')
    expect(w.findComponent(BayarRutinForm).props('billId')).toBeNull()
  })

  it('opens the bill from the address when editing', async () => {
    const w = await mountAt('/tabs/menu/bayar-rutin/7/ubah')
    expect(w.find('h1').text()).toContain('Ubah bayar rutin')
    expect(w.findComponent(BayarRutinForm).props('billId')).toBe('7')
  })

  it('goes back and shows a toast once saved', async () => {
    const w = await mountAt('/tabs/menu/bayar-rutin/baru')
    w.findComponent(BayarRutinForm).vm.$emit('done', 'Netflix ditambahin 🔁')
    await flushPromises()
    expect(ionRouter.back).toHaveBeenCalled()
    expect(toastCreate).toHaveBeenCalledWith(expect.objectContaining({ message: 'Netflix ditambahin 🔁' }))
  })

  describe('on a wide screen', () => {
    beforeEach(() => {
      window.matchMedia = vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    })
    afterEach(() => {
      delete window.matchMedia
    })

    it('sends the user to the main page where the form is a side panel', async () => {
      await mountAt('/tabs/menu/bayar-rutin/baru')
      expect(ionRouter.navigate).toHaveBeenCalledWith('/tabs/menu/bayar-rutin', 'back', 'replace')
    })
  })
})
