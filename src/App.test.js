import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from './App.vue'
import { useAuthStore } from './stores/auth.js'
import { useGymStore } from './stores/gym.js'

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
