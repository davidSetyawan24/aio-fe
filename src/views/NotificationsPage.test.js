import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { setNotificationsApi } from '@/stores/notifications.js'
import NotificationsPage from './NotificationsPage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  onIonViewWillEnter: (fn) => fn(),
}))

const now = Date.now()
const ago = (days) => new Date(now - days * 24 * 60 * 60 * 1000).toISOString()
const unreadToday = { id: 1, type: 'keamanan', title: 'iPad baru login ke akun lo', body: 'Safari · iPad. Bukan lo? Keluarin dari Profil.', link: '/tabs/profil', read: false, createdAt: ago(0) }
const readOld = { id: 2, type: 'keamanan', title: 'Mac baru login ke akun lo', body: 'Chrome · Mac.', link: null, read: true, createdAt: ago(20) }

let api
async function mountPage(items) {
  api = {
    get: vi.fn(async () => ({ items, unread: items.filter((n) => !n.read).length })),
    post: vi.fn(async () => ({ unread: 0 })),
  }
  setNotificationsApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/tabs/notifikasi', component: NotificationsPage }] })
  router.push('/tabs/notifikasi')
  await router.isReady()
  const w = mount(NotificationsPage, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return w
}

beforeEach(() => ionRouter.push.mockClear())

describe('NotificationsPage', () => {
  it('groups notifications by day and marks unread ones', async () => {
    const w = await mountPage([unreadToday, readOld])
    expect(w.find('h1').text()).toBe('Notifikasi.1 belum dibaca')
    expect(w.findAll('.group-label').map((l) => l.text())).toEqual(['Hari ini', 'Lebih lama'])
    const rows = w.findAll('[data-test="notif"]')
    expect(rows[0].classes()).toContain('unread')
    expect(rows[1].classes()).not.toContain('unread')
    expect(rows[0].find('.t').text()).toBe('iPad baru login ke akun lo')
  })

  it('marks as read and opens the link on tap', async () => {
    const w = await mountPage([unreadToday, readOld])
    await w.findAll('[data-test="notif"]')[0].trigger('click')
    await flushPromises()
    expect(api.post).toHaveBeenCalledWith('/notifications/1/read')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/profil')
    expect(w.find('h1').text()).toBe('Notifikasi.Semua udah dibaca')
  })

  // Review 14/11: tap dobel (sering di iPhone) jangan buka halaman tujuan dua kali.
  it('opens the link only once on a quick double tap', async () => {
    const w = await mountPage([{ ...unreadToday }, readOld])
    const row = w.findAll('[data-test="notif"]')[0]
    row.trigger('click')
    row.trigger('click')
    await flushPromises()
    expect(ionRouter.push).toHaveBeenCalledTimes(1)
  })

  it('marks everything as read', async () => {
    const w = await mountPage([unreadToday, readOld])
    await w.find('[data-test="read-all"]').trigger('click')
    await flushPromises()
    expect(api.post).toHaveBeenCalledWith('/notifications/read-all')
    expect(w.find('[data-test="read-all"]').attributes('disabled')).toBeDefined()
  })

  it('shows a friendly empty state', async () => {
    const w = await mountPage([])
    expect(w.find('h1').text()).toBe('Notifikasi.Masih sepi.')
    expect(w.find('[data-test="empty"]').text()).toContain('Belum ada notif.')
  })

  it('opens the settings', async () => {
    const w = await mountPage([])
    await w.find('[data-test="settings"]').trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/notifikasi/atur')
  })
})
