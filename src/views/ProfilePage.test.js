import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { flushPromises } from '@vue/test-utils'
import { useAuthStore } from '@/stores/auth.js'
import { setDevicesApi } from '@/stores/devices.js'
import { useThemeStore } from '@/stores/theme.js'
import ProfilePage from './ProfilePage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  // Di app beneran ini jalan tiap halaman kebuka (ion-router-outlet). Di test langsung jalan.
  onIonViewWillEnter: (fn) => fn(),
}))

const memoryStorage = () => {
  const data = {}
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => (data[k] = v) }
}

const now = new Date().toISOString()
const devicesApi = {
  get: vi.fn(async () => ({
    devices: [
      { id: 1, name: null, kind: 'iPhone', browser: 'Safari', createdAt: now, lastUsedAt: now, current: true },
      { id: 2, name: 'iPad kerja', kind: 'iPad', browser: 'Safari', createdAt: now, lastUsedAt: now, current: false },
    ],
  })),
}

async function mountProfile() {
  setDevicesApi(devicesApi)
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  auth.user = { id: 1, username: 'david', name: 'David Setyawan' }
  auth.status = 'authed'
  const theme = useThemeStore()
  theme.init({ storage: memoryStorage(), media: { matches: false, addEventListener: () => {} }, doc: document })
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/tabs/profil', component: ProfilePage }] })
  router.push('/tabs/profil')
  await router.isReady()
  const wrapper = mount(ProfilePage, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return { wrapper, theme }
}

describe('ProfilePage — Tampilan', () => {
  it('lists the three theme choices top to bottom, system checked by default', async () => {
    const { wrapper } = await mountProfile()
    const radios = wrapper.findAll('[role="radiogroup"] [role="radio"]')
    expect(radios.map((r) => r.find('.title').text())).toEqual(['Ikut sistem', 'Terang', 'Gelap'])
    expect(radios.map((r) => r.attributes('aria-checked'))).toEqual(['true', 'false', 'false'])
    expect(radios[0].find('.sub').text()).toBe('Ngikutin device (lagi terang)')
  })

  it('switches the theme when a choice is tapped', async () => {
    const { wrapper, theme } = await mountProfile()
    await wrapper.findAll('[role="radio"]')[2].trigger('click')
    expect(theme.pref).toBe('dark')
    expect(document.documentElement.classList.contains('theme-dark')).toBe(true)
    expect(wrapper.findAll('[role="radio"]')[2].attributes('aria-checked')).toBe('true')
  })

  it('groups the rows under Tampilan and Keamanan, keeping Ganti password', async () => {
    const { wrapper } = await mountProfile()
    expect(wrapper.findAll('.group-label').map((l) => l.text())).toEqual(['Tampilan', 'Keamanan', 'Device yang lagi login 2'])
    await wrapper.find('[data-test="ganti-password"]').trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/profil/password')
  })
})

describe('ProfilePage — Device yang lagi login', () => {
  it('lists devices with this one marked', async () => {
    const { wrapper } = await mountProfile()
    const rows = wrapper.findAll('[data-test="device"]')
    expect(rows.map((r) => r.find('.title').text())).toEqual(['iPhonedevice ini', 'iPad kerja'])
    expect(rows[0].find('.chip-me').text()).toBe('device ini')
    expect(rows[1].find('.chip-me').exists()).toBe(false)
    expect(rows[0].find('.sub').text()).toBe('iPhone · aktif sekarang')
    expect(rows[1].find('.sub').text()).toBe('iPad · aktif hari ini')
  })

  it('opens the device page on tap', async () => {
    const { wrapper } = await mountProfile()
    await wrapper.findAll('[data-test="device"]')[1].trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/profil/device/2')
  })
})
