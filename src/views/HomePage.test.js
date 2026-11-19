import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { setHomeApi } from '@/stores/home.js'
import { useAuthStore } from '@/stores/auth.js'
import HomePage from './HomePage.vue'

const enter = vi.hoisted(() => ({ fn: null }))
const view = vi.hoisted(() => ({ didEnter: null, didLeave: null }))
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ({ push: vi.fn() }),
  onIonViewWillEnter: (fn) => {
    enter.fn = fn
    fn()
  },
  onIonViewDidEnter: (fn) => {
    view.didEnter = fn
    fn()
  },
  onIonViewDidLeave: (fn) => (view.didLeave = fn),
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

  it('semua bagian tampil dari GET /home', async () => {
    vi.setSystemTime(new Date('2026-11-16T01:12:00Z'))
    const w = await mountPage(async () => ({
      today: '2026-11-16',
      attention: [{ kind: 'todo', group: 'late', todoId: 1, title: 'Bayar pajak', occurrence: '2026-11-15', recurring: false, lateDays: 1 }],
      agenda: { events: [{ id: 5, title: 'Rapat tim', allDay: true, startDate: '2026-11-16', endDate: '2026-11-16', startTime: null, endTime: null, location: null, occurrence: '2026-11-16', dayIndex: 1, dayCount: 1 }], todos: [] },
      money: { month: '2026-11', total: 2_140_000, todaySpent: 35_000, budget: { total: 4_000_000, left: 1_860_000 }, todayBudget: { jatah: 177_500, spent: 35_000, left: 142_500, monthLeft: 1_860_000, daysLeft: 15 } },
      owed: { invoices: { total: 31_692_000, count: 2, lateCount: 1, nearestDue: '2026-11-18' }, split: { total: 185_000, people: 3 } },
    }))
    expect(w.find('h1').text()).toContain('Pagi, David 👋')
    expect(w.find('[data-test="attention"]').text()).toContain('Bayar pajak')
    expect(w.find('[data-test="attn-count"]').text()).toBe('1')
    expect(w.find('[data-test="today"]').text()).toContain('Rapat tim')
    expect(w.find('[data-test="hero-value"]').text()).toBe('Rp142.500')
    expect(w.find('[data-test="owed-invoice"]').text()).toContain('Rp31,7jt')
    expect(w.find('[data-test="owed-split"]').text()).toContain('Rp185rb')
    expect(w.findAll('.h-qb')).toHaveLength(4)
  })

  it('kartu Badan: tampil kalau ada body, hilang kalau null', async () => {
    const body = { lastOn: '2026-11-16', lastAt: '06:42', from: '2026-11-10', to: '2026-11-16', arah: null, fat: 21, muscle: 33, weight: 74, deltas: { fat: null, muscle: null, weight: null }, tones: { fat: 'neutral', muscle: 'neutral', weight: 'neutral' }, weightGoal: null, spark: [] }
    const w = await mountPage(async () => ({ ...data(), body }))
    expect(w.find('[data-test="slot-side"] [data-test="home-body"]').exists()).toBe(true)
    const w2 = await mountPage(async () => ({ ...data(), body: null }))
    expect(w2.find('[data-test="home-body"]').exists()).toBe(false)
  })

  it('PC ≥1100: kartu Badan pas di bawah "Duit hari ini" (sebelum Duit yang belum balik)', async () => {
    const orig = window.matchMedia
    window.matchMedia = (q) => ({ matches: /min-width:\s*(1100|768)px/.test(q), addEventListener: () => {}, removeEventListener: () => {} })
    try {
      const body = { lastOn: '2026-11-16', lastAt: '06:42', from: '2026-11-10', to: '2026-11-16', count: 3, arah: null, fat: 21, muscle: 33, weight: 74, deltas: { fat: null, muscle: null, weight: null }, tones: { fat: 'neutral', muscle: 'neutral', weight: 'neutral' }, weightGoal: null, spark: [] }
      const money = { month: '2026-11', total: 2_140_000, todaySpent: 35_000, budget: { total: 4_000_000, left: 1_860_000 }, todayBudget: { jatah: 177_500, spent: 35_000, left: 142_500, monthLeft: 1_860_000, daysLeft: 15 } }
      const owed = { invoices: { total: 0, count: 0, lateCount: 0, nearestDue: null }, split: { total: 0, people: 0 } }
      const w = await mountPage(async () => ({ ...data(), money, owed, body }))
      const html = w.find('[data-test="money"]').html()
      expect(w.findAll('[data-test="home-body"]')).toHaveLength(1)
      const hero = html.indexOf('data-test="hero"')
      const card = html.indexOf('data-test="home-body"')
      const owedAt = html.indexOf('data-test="owed-invoice"')
      expect(hero).toBeGreaterThan(-1)
      expect(card).toBeGreaterThan(hero)
      expect(owedAt).toBeGreaterThan(card)
    } finally {
      window.matchMedia = orig
    }
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

  it('balik dari background pas lagi di tab lain → Beranda nggak dimuat ulang (nanti pas dibuka aja)', async () => {
    vi.setSystemTime(new Date('2026-11-16T01:12:00Z'))
    await mountPage(async () => data())
    view.didLeave()
    api.get.mockClear()
    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()
    expect(api.get).not.toHaveBeenCalled()
    view.didEnter()
    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()
    expect(api.get).toHaveBeenCalledTimes(1)
  })
})

function wibNowDate() {
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10)
}
