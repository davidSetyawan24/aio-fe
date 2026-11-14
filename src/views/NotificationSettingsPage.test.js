import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ApiError } from '@/lib/api.js'
import { setNotificationsApi } from '@/stores/notifications.js'
import NotificationSettingsPage from './NotificationSettingsPage.vue'

const toast = vi.hoisted(() => ({ present: vi.fn() }))
const toastCreate = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn() }),
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

beforeEach(() => toastCreate.mockReset().mockResolvedValue(toast))

describe('NotificationSettingsPage', () => {
  it('shows the four kinds as switches, all on', async () => {
    const w = await mountPage()
    for (const key of ['tagihan', 'todo', 'agenda', 'keamanan']) expect(toggle(w, key).attributes('aria-checked'), key).toBe('true')
  })

  it('has the phone push switch as "Segera" and disabled', async () => {
    const w = await mountPage()
    expect(w.find('[data-test="push"]').text()).toContain('Segera')
    expect(w.find('[data-test="toggle-push"]').attributes('disabled')).toBeDefined()
  })

  it('saves a switch right away', async () => {
    const w = await mountPage()
    await toggle(w, 'keamanan').trigger('click')
    await flushPromises()
    expect(api.patch).toHaveBeenCalledWith('/notifications/settings', { keamanan: false })
    expect(toggle(w, 'keamanan').attributes('aria-checked')).toBe('false')
  })

  it('flips back and says why when saving fails', async () => {
    const w = await mountPage(vi.fn(async () => { throw new ApiError('Nggak bisa nyambung ke server.', 0) }))
    await toggle(w, 'todo').trigger('click')
    await flushPromises()
    expect(toggle(w, 'todo').attributes('aria-checked')).toBe('true')
    expect(toastCreate).toHaveBeenCalledWith(expect.objectContaining({ message: 'Nggak bisa nyambung ke server.' }))
  })
})
