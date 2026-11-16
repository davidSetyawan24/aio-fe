import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { setHomeApi } from '@/stores/home.js'
import { useAuthStore } from '@/stores/auth.js'
import HomePage from './HomePage.vue'

const enter = vi.hoisted(() => ({ fn: null }))
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ({ push: vi.fn() }),
  onIonViewWillEnter: (fn) => {
    enter.fn = fn
    fn()
  },
}))
vi.mock('@/components/NotifBell.vue', () => ({ default: { template: '<span class="bell-stub" data-test="bell" />' } }))

const data = (today = '2026-11-16') => ({ today, attention: [], agenda: { events: [], todos: [] }, money: null, owed: null })
const mounted = []
let api
async function mountPage(get) {
  api = { get: vi.fn(get), put: vi.fn(), del: vi.fn(), patch: vi.fn() }
  setHomeApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().user = { name: 'David Setyawan' }
  const w = mount(HomePage, { global: { plugins: [pinia] }, attachTo: document.body })
  mounted.push(w)
  await flushPromises()
  return w
}
beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] }))
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.useRealTimers()
})

describe('HomePage', () => {
  it('sapaan & tanggal langsung tampil sebelum data dateng', async () => {
    vi.setSystemTime(new Date('2026-11-16T01:12:00Z'))
    const w = await mountPage(() => new Promise(() => {}))
    expect(w.find('h1').text()).toContain('Pagi, David 👋')
    expect(w.find('h1 span').text()).toBe('Senin, 16 November')
    expect(w.find('[data-test="bell"]').exists()).toBe(true)
    expect(w.find('.h-grid').exists()).toBe(false)
    expect(w.find('.h-error').exists()).toBe(false)
  })

  it('gagal muat pertama → pesan + Coba lagi', async () => {
    vi.setSystemTime(new Date('2026-11-16T01:12:00Z'))
    let fail = true
    const w = await mountPage(async () => {
      if (fail) throw new Error('Server lagi down.')
      return data()
    })
    expect(w.find('.h-error').text()).toContain('Server lagi down.')
    fail = false
    await w.find('[data-test="retry"]').trigger('click')
    await flushPromises()
    expect(api.get).toHaveBeenCalledTimes(2)
    expect(w.find('.h-error').exists()).toBe(false)
    expect(w.find('.h-grid').exists()).toBe(true)
  })

  it('lewat tengah malam WIB → muat ulang penuh', async () => {
    vi.setSystemTime(new Date('2026-11-16T16:59:30Z'))
    const w = await mountPage(async () => data(wibNowDate()))
    expect(w.find('h1').text()).toContain('Senin, 16 November')
    api.get.mockClear()
    vi.setSystemTime(new Date('2026-11-16T17:00:30Z'))
    vi.advanceTimersByTime(60_000)
    await flushPromises()
    expect(api.get).toHaveBeenCalledTimes(1)
    expect(w.find('h1').text()).toContain('Malem, David 👋')
    expect(w.find('h1').text()).toContain('Selasa, 17 November')
  })

  it('balik dari background → muat ulang', async () => {
    vi.setSystemTime(new Date('2026-11-16T01:12:00Z'))
    const w = await mountPage(async () => data())
    api.get.mockClear()
    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()
    expect(api.get).toHaveBeenCalledTimes(1)
    expect(w.exists()).toBe(true)
  })
})

function wibNowDate() {
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10)
}
