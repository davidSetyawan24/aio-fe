import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from './App.vue'
import { useAuthStore } from './stores/auth.js'

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
  return mount(App, { global: { plugins: [pinia, router], stubs: { IonRouterOutlet: true } } })
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
