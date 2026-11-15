import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { setNotificationsApi } from '@/stores/notifications.js'
import NotificationSettingsPage from './NotificationSettingsPage.vue'

const toast = vi.hoisted(() => ({ present: vi.fn() }))
const toastCreate = vi.hoisted(() => vi.fn())
const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn() }))
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  onIonViewWillEnter: (fn) => fn(),
  toastController: { create: toastCreate },
}))

let api
async function mountPage(patch) {
  api = {
    get: vi.fn(async () => ({ settings: { tagihan: true, todo: true, agenda: true, keamanan: true } })),
    patch: patch ?? vi.fn(async (url, body) => ({ settings: { tagihan: true, todo: true, agenda: true, keamanan: true, ...body } })),
  }
  setNotificationsApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/tabs/notifikasi/atur', component: NotificationSettingsPage }] })
  router.push('/tabs/notifikasi/atur')
  await router.isReady()
  const w = mount(NotificationSettingsPage, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return w
}
const toggle = (w, key) => w.find(`[data-test="toggle-${key}"]`)

beforeEach(() => {
  toastCreate.mockReset().mockResolvedValue(toast)
  ionRouter.navigate.mockClear()
})

describe('NotificationSettingsPage', () => {
  it('shows the four kinds as switches, all on', async () => {
    const w = await mountPage()
    for (const key of ['tagihan', 'todo', 'agenda', 'keamanan']) expect(toggle(w, key).attributes('aria-checked'), key).toBe('true')
    expect(w.text()).toContain('Jadwal pengingatnya diatur di tiap Bayar Rutin, to-do, & acara.')
  })

  it('baris Device ini udah hidup (bukan "Segera" lagi)', async () => {
    const w = await mountPage()
    expect(w.find('[data-test="push-row"]').exists()).toBe(true)
    expect(w.text()).not.toContain('Segera')
  })

  it('stays here on a phone or tablet', async () => {
    await mountPage()
    expect(ionRouter.navigate).not.toHaveBeenCalled()
  })

  describe('on a wide screen', () => {
    beforeEach(() => {
      window.matchMedia = vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    })
    afterEach(() => {
      delete window.matchMedia
    })

    it('goes back to Notifikasi, where the switches already are', async () => {
      await mountPage()
      expect(ionRouter.navigate).toHaveBeenCalledWith('/tabs/notifikasi', 'back', 'replace')
    })
  })
})
