import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { flushPromises } from '@vue/test-utils'
import App from './App.vue'
import { LIVE_KEY } from './lib/gymLive.js'
import { setAuthApi, useAuthStore } from './stores/auth.js'
import { setGymApi, setGymStorage, useGymStore } from './stores/gym.js'

const toastCreate = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({ ...(await importOriginal()), toastController: { create: toastCreate } }))

async function mountApp(path) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  auth.status = 'authed'
  auth.user = { id: 1, username: 'david', name: 'David' }
  const stub = { render: () => null }
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/tabs/home', component: stub }, { path: '/login', component: stub }] })
  router.push(path)
  await router.isReady()
  // ion-router-outlet butuh router khusus Ionic; yang dites di sini cuma menu samping.
  return mount(App, { global: { plugins: [pinia, router], stubs: { IonRouterOutlet: true, GymForgotDialog: true } } })
}

describe('App sidebar menu', () => {
  // Di iPhone, geser dari pinggir kiri = kebiasaan "back". Jangan sampai malah ngebuka sidebar.
  it('cannot be opened with a swipe gesture', async () => {
    const wrapper = await mountApp('/tabs/home')
    const menu = wrapper.find('ion-menu')
    expect(menu.exists()).toBe(true)
    expect(menu.element.swipeGesture).toBe(false)
  })
})

describe('App: kabar store Gym', () => {
  beforeEach(() => {
    toastCreate.mockReset()
    toastCreate.mockResolvedValue({ present: vi.fn() })
  })

  // Kabar (mis. "Disambung ke sesi Push") bisa muncul dari halaman mana aja, jadi ditampilin di level App, sekali per kabar.
  it('tiap kabar baru (notice) jadi satu toast, kabar yang sama nggak dobel', async () => {
    const wrapper = await mountApp('/tabs/home')
    const store = useGymStore()
    store.notice = { id: 1, text: '1 set nggak kesimpen. Coba centang lagi.' }
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    expect(toastCreate).toHaveBeenCalledTimes(1)
    expect(toastCreate.mock.calls[0][0].message).toBe('1 set nggak kesimpen. Coba centang lagi.')
    store.notice = { id: 2, text: 'Disambung ke sesi Push yang udah jalan' }
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    expect(toastCreate).toHaveBeenCalledTimes(2)
  })

  it('dialog lupa Selesai dipasang di App', async () => {
    const wrapper = await mountApp('/tabs/home')
    expect(wrapper.findComponent({ name: 'GymForgotDialog' }).exists()).toBe(true)
  })
})

describe('App: offline tapi ada sesi Gym jalan di HP', () => {
  const draft = { clientId: 'c1', serverId: 100, program: 'push', startedAt: '2026-11-23T11:05:00.000Z', planned: [1], open: 0, timer: null, queue: [], joined: false, lost: 0, items: [{ exerciseId: 1, extra: false, rows: [] }] }
  let mem, authGet
  async function mountOffline(path, { withDraft = true } = {}) {
    mem = new Map(withDraft ? [[LIVE_KEY, JSON.stringify(draft)]] : [])
    setGymStorage({ getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) })
    setGymApi({ get: vi.fn(() => new Promise(() => {})), post: vi.fn(() => new Promise(() => {})), patch: vi.fn(), put: vi.fn(), del: vi.fn() })
    authGet = vi.fn(async () => {
      throw Object.assign(new Error('Nggak bisa nyambung ke server.'), { status: 0 })
    })
    setAuthApi({ get: authGet, post: vi.fn() })
    const pinia = createPinia()
    setActivePinia(pinia)
    useAuthStore().status = 'offline'
    const stub = { render: () => null }
    const router = createRouter({
      history: createMemoryHistory(),
      routes: ['/tabs/home', '/tabs/menu/gym', '/tabs/menu/gym/sesi', '/login'].map((p) => ({ path: p, component: stub })),
    })
    router.push(path)
    await router.isReady()
    const w = mount(App, { global: { plugins: [pinia, router], stubs: { IonRouterOutlet: true, GymForgotDialog: true } } })
    mounted.push(w)
    return { w, router }
  }
  const mounted = []
  afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

  it('di rute sesi live → app tetep dirender (bukan layar offline)', async () => {
    const { w } = await mountOffline('/tabs/menu/gym/sesi')
    expect(w.find('.splash').exists()).toBe(false)
    expect(w.find('ion-split-pane').exists()).toBe(true)
  })

  it('rute lain → layar offline + tombol "Lanjut sesi Push" yang buka sesi live', async () => {
    const { w, router } = await mountOffline('/tabs/menu/gym')
    expect(w.find('.splash').exists()).toBe(true)
    const btn = w.find('[data-test="offline-gym"]')
    expect(btn.text()).toContain('Lanjut sesi Push')
    expect(w.text()).toContain('Sesi Push lo aman di HP ini.')
    await btn.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/tabs/menu/gym/sesi')
    expect(w.find('.splash').exists()).toBe(false)
  })

  it('tanpa draf → layar offline biasa, sesi live juga nggak dirender', async () => {
    const { w } = await mountOffline('/tabs/menu/gym/sesi', { withDraft: false })
    expect(w.find('.splash').exists()).toBe(true)
    expect(w.find('[data-test="offline-gym"]').exists()).toBe(false)
  })

  it('sinyal balik (online) → status login dicek lagi; 401 → ke login, draf tetep di HP', async () => {
    const { router } = await mountOffline('/tabs/menu/gym/sesi')
    authGet.mockRejectedValue(Object.assign(new Error('x'), { status: 401 }))
    window.dispatchEvent(new Event('online'))
    await flushPromises()
    expect(authGet).toHaveBeenCalledWith('/auth/me')
    expect(useAuthStore().status).toBe('guest')
    expect(router.currentRoute.value.path).toBe('/login')
    expect(mem.has(LIVE_KEY)).toBe(true)
  })
})
