import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { LIVE_KEY } from '@/lib/gymLive.js'
import { setGymApi, setGymStorage } from '@/stores/gym.js'
import HomeGym from './HomeGym.vue'

const ionRouter = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('@ionic/vue', async (importOriginal) => ({ ...(await importOriginal()), useIonRouter: () => ionRouter }))

const started = (min) => new Date(Date.now() - min * 60000).toISOString()
const mounted = []
function mountCard(props = {}, draft = null) {
  const storage = new Map()
  if (draft) storage.set(LIVE_KEY, JSON.stringify(draft))
  setGymStorage({ getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k) })
  setGymApi({ get: vi.fn(() => new Promise(() => {})), post: vi.fn(() => new Promise(() => {})), patch: vi.fn(), put: vi.fn(), del: vi.fn() })
  const pinia = createPinia()
  setActivePinia(pinia)
  const w = mount(HomeGym, { props, global: { plugins: [pinia] }, attachTo: document.body })
  mounted.push(w)
  return w
}
const draft = (program = 'pull', minutes = 42, doneRows = 3) => ({
  clientId: 'c', serverId: null, program, startedAt: started(minutes), planned: [1], open: 0, timer: null, queue: [{ op: 'start' }], joined: false, lost: 0,
  items: [{ exerciseId: 1, extra: false, rows: Array.from({ length: doneRows + 1 }, (_, i) => ({ key: `r${i}`, weight: 20, reps: 10, done: i < doneRows, doneAt: i < doneRows ? started(1) : null, serverId: null, prev: null })) }],
})

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
  ionRouter.push.mockReset()
})
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.useRealTimers()
})

describe('HomeGym', () => {
  it('nggak ada sesi (gym null, nggak ada draf) → nggak dirender', () => {
    const w = mountCard({ active: null })
    expect(w.find('[data-test="home-gym"]').exists()).toBe(false)
    expect(w.find('[data-test="livecard"]').exists()).toBe(false)
  })

  it('ada sesi di server → kartu hitam: nama, durasi jalan, N set, Lanjut ›', async () => {
    const w = mountCard({ active: { id: 5, program: 'push', startedAt: started(42), sets: 7 } })
    const card = w.find('[data-test="livecard"]')
    expect(card.text()).toContain('Sesi Push lagi jalan')
    expect(card.text()).toContain('7 set')
    expect(card.text()).toContain('Lanjut')
    expect(w.find('[data-test="clock"]').text()).toBe('00:42:00')
    vi.advanceTimersByTime(1000)
    await w.vm.$nextTick()
    expect(w.find('[data-test="clock"]').text()).toBe('00:42:01')
  })

  it('Lanjut → halaman sesi', async () => {
    const w = mountCard({ active: { id: 5, program: 'push', startedAt: started(5), sets: 0 } })
    await w.find('[data-test="livecard"]').trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/gym/sesi')
  })

  it('offline: nggak ada data server tapi ada draf di HP → kartu dari draf (set dihitung dari yang dicentang)', () => {
    const w = mountCard({ active: null }, draft('pull', 20, 3))
    const card = w.find('[data-test="livecard"]')
    expect(card.text()).toContain('Sesi Pull lagi jalan')
    expect(card.text()).toContain('3 set')
  })

  it('draf HP menang atas data server (lebih baru)', () => {
    const w = mountCard({ active: { id: 5, program: 'push', startedAt: started(60), sets: 1 } }, draft('pull', 20, 3))
    expect(w.find('[data-test="livecard"]').text()).toContain('Sesi Pull')
  })
})
