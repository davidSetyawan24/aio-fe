import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ApiError } from '@/lib/api.js'
import { setGymApi, setGymStorage } from '@/stores/gym.js'
import GymChartPage from './GymChartPage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
vi.mock('@ionic/vue', async (importOriginal) => ({ ...(await importOriginal()), useIonRouter: () => ionRouter }))

const ex = (id, name, last = null) => ({ id, name, restSec: 120, step: 2.5, dumbbell: false, last, record: null })
const exercises = [
  ex(1, 'Incline Dumbbell Press', { on: '2026-11-16', sets: [[22.5, 8], [22.5, 10]] }),
  ex(2, 'Pec Deck'),
  ex(3, 'Barbell Squat', { on: '2026-11-18', sets: [[60, 5]] }),
  ex(4, 'Lat Pull Down', { on: '2026-11-12', sets: [[45, 10]] }),
  ex(5, 'Cable Fly', { on: '2026-11-10', sets: [[15, 12]] }),
]
const programs = [
  { key: 'push', exerciseIds: [1, 2], lastOn: null },
  { key: 'pull', exerciseIds: [4], lastOn: null },
  { key: 'leg', exerciseIds: [3], lastOn: null },
  { key: 'upper', exerciseIds: [4], lastOn: null },
  { key: 'lower', exerciseIds: [3], lastOn: null },
]
const pt = (on, w, r, e1rm) => ({ sessionId: 1, on, sets: [[w, r]], best: [w, r], e1rm })
const chart1 = {
  exercise: exercises[0],
  points: [pt('2026-11-02', 20, 10, 26.5), pt('2026-11-09', 22.5, 8, 28.5), pt('2026-11-16', 22.5, 10, 30)],
  record: { best: [22.5, 10], bestOn: '2026-11-16', e1rm: 30, e1rmFrom: [22.5, 10] },
  flat: 2,
}
const mounted = []
let api
let router
function stubMedia(width) {
  window.matchMedia = (query) => {
    const min = Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0)
    return { matches: width >= min, addEventListener: () => {}, removeEventListener: () => {} }
  }
}
async function mountPage({ url = '/tabs/menu/gym/grafik?gerakan=1', mini = null, width = 390, charts = {} } = {}) {
  stubMedia(width)
  setGymStorage({ getItem: () => null, setItem: () => {}, removeItem: () => {} })
  api = {
    get: vi.fn(async (u) => {
      if (u === '/gym') return { programs, exercises, active: null, recent: [], week: { days: [], count: 0, minutes: 0 }, totalSessions: 3, firstOn: '2026-11-02', mini }
      const id = Number(u.split('/').pop())
      if (charts[id]) return charts[id]
      if (id === 1) return chart1
      if (id === 3) throw new ApiError('Gerakannya nggak ketemu.', 404)
      return { exercise: exercises.find((x) => x.id === id), points: [], record: null, flat: 0 }
    }),
    post: vi.fn(), patch: vi.fn(), put: vi.fn(), del: vi.fn(),
  }
  setGymApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/tabs/menu/gym/grafik', component: GymChartPage }] })
  router.push(url)
  await router.isReady()
  const w = mount(GymChartPage, { global: { plugins: [pinia, router] }, attachTo: document.body })
  mounted.push(w)
  await flushPromises()
  return w
}
const q = (s) => document.body.querySelector(s)
const qa = (s) => [...document.body.querySelectorAll(s)]
beforeEach(() => document.body.appendChild(document.createElement('ion-app')))
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  document.querySelectorAll('ion-app').forEach((e) => e.remove())
  vi.clearAllMocks()
})

describe('GymChartPage', () => {
  it('?gerakan= → ambil dari /gym/exercises/:id, nama + program di pemilih, label titik', async () => {
    const w = await mountPage({ width: 1440 })
    expect(api.get).toHaveBeenCalledWith('/gym/exercises/1')
    expect(w.find('[data-test="pick-btn"]').text()).toContain('Incline Dumbbell Press')
    expect(w.find('[data-test="pick-btn"]').text()).toContain('Push')
    expect(w.findAll('text.lbl').map((t) => t.text())).toEqual(['20×10', '22,5×8', '22,5×10'])
    expect(w.find('[data-test="flat"]').exists()).toBe(false)
  })

  it('Rekor: beban terberat + tanggal, 1RM tertinggi + dari set apa', async () => {
    const w = await mountPage()
    const rec = w.find('[data-test="record"]').text()
    expect(rec).toContain('22,5 × 10')
    expect(rec).toContain('16 Nov')
    expect(rec).toContain('30')
    expect(rec).toContain('dari 22,5 × 10')
  })

  it('Tiap sesi: baru di atas; mode 1RM ganti grafik & nilai kanan', async () => {
    const w = await mountPage({ width: 1440 })
    let rows = w.findAll('[data-test="sess-row"]')
    expect(rows).toHaveLength(3)
    expect(rows[0].text()).toContain('16 Nov')
    expect(rows[0].text()).toContain('22,5 × 10')
    await w.find('[data-test="mode-orm"]').trigger('click')
    expect(w.findAll('text.lbl').map((t) => t.text())).toEqual(['26,5', '28,5', '30'])
    rows = w.findAll('[data-test="sess-row"]')
    expect(rows[0].text()).toContain('30 kg')
    expect(w.find('[data-test="note"]').text()).toContain('1RM')
  })

  it('catatan + tombol ? buka penjelasan 1RM / progressive overload', async () => {
    const w = await mountPage()
    await w.find('[data-test="note-info"]').trigger('click')
    expect(q('[data-test="info-sheet"]').getAttribute('aria-hidden')).toBe('false')
    expect(q('[data-test="info-sheet"]').textContent).toContain('Progressive overload')
    q('[data-test="info-ok"]').click()
    await w.find('[data-test="mode-orm"]').trigger('click')
    await w.find('[data-test="note-info"]').trigger('click')
    expect(q('[data-test="info-sheet"]').textContent).toContain('1RM')
  })

  it('chip "Datar 6 sesi terakhir" kalau flat >= 4', async () => {
    const w = await mountPage({ charts: { 1: { ...chart1, flat: 6 } } })
    expect(w.find('[data-test="flat"]').text()).toBe('Datar 6 sesi terakhir')
  })

  it('tanpa ?gerakan: pake gerakan mini Gym, lalu gerakan pertama yang punya riwayat', async () => {
    await mountPage({ url: '/tabs/menu/gym/grafik', mini: { exerciseId: 4, points: [] } })
    expect(api.get).toHaveBeenCalledWith('/gym/exercises/4')
    mounted.splice(0).forEach((w) => w.unmount())
    await mountPage({ url: '/tabs/menu/gym/grafik' })
    expect(api.get).toHaveBeenCalledWith('/gym/exercises/1')
  })

  it('belum ada titik → layar kosong ramah, pemilih tetep jalan', async () => {
    const w = await mountPage({ url: '/tabs/menu/gym/grafik?gerakan=2' })
    expect(w.find('[data-test="empty"]').text()).toContain('Belum ada data')
    expect(w.find('[data-test="pick-btn"]').text()).toContain('Pec Deck')
    await w.find('[data-test="pick-btn"]').trigger('click')
    expect(q('[data-test="chart-pick"]').getAttribute('aria-hidden')).toBe('false')
  })

  it('pemilih: grup per program (Leg & Lower satu grup) + Gerakan tambahan, info terakhir, cari', async () => {
    const w = await mountPage()
    await w.find('[data-test="pick-btn"]').trigger('click')
    expect(qa('[data-test="chart-pick"] .gy-fgroup').map((g) => g.textContent)).toEqual(['💪 Push', '🧗 Pull', '🦵 Leg & Lower', '🏋️ Upper', 'Gerakan tambahan'])
    const row = (id) => q(`[data-chex="${id}"]`).textContent
    expect(row(1)).toContain('terakhir 22,5 × 10')
    expect(row(2)).toContain('belum ada data')
    expect(qa('[data-chex="3"]')).toHaveLength(1)
    const input = q('[data-test="pick-q"]')
    input.value = 'cable'
    input.dispatchEvent(new Event('input'))
    await w.vm.$nextTick()
    expect(qa('[data-chex]').map((b) => b.dataset.chex)).toEqual(['5'])
    expect(qa('[data-test="chart-pick"] .gy-fgroup').map((g) => g.textContent)).toEqual(['Gerakan tambahan'])
  })

  it('pilih gerakan lain → grafik ganti, pemilih nutup', async () => {
    const w = await mountPage()
    await w.find('[data-test="pick-btn"]').trigger('click')
    q('[data-chex="4"]').click()
    await flushPromises()
    expect(api.get).toHaveBeenCalledWith('/gym/exercises/4')
    expect(w.find('[data-test="pick-btn"]').text()).toContain('Lat Pull Down')
    expect(w.find('[data-test="pick-btn"]').text()).toContain('Pull · Upper')
    expect(q('[data-test="chart-pick"]').getAttribute('aria-hidden')).toBe('true')
  })

  it('gerakan nggak ketemu (404) → pesan ramah, bukan layar rusak', async () => {
    const w = await mountPage({ url: '/tabs/menu/gym/grafik?gerakan=3' })
    expect(w.find('[data-test="gone"]').exists()).toBe(true)
    expect(w.find('[data-test="pick-btn"]').exists()).toBe(true)
  })

  it('‹ Gym balik', async () => {
    const w = await mountPage()
    await w.find('[data-test="back"]').trigger('click')
    expect(ionRouter.back).toHaveBeenCalled()
  })
})
