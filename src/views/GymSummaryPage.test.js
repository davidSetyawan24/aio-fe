import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { makeReport } from '@/test/gymReportFixture.js'
import { setGymApi, setGymStorage, useGymStore } from '@/stores/gym.js'
import GymSummaryPage from './GymSummaryPage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn(), replace: vi.fn() }))
vi.mock('@ionic/vue', async (importOriginal) => ({ ...(await importOriginal()), useIonRouter: () => ionRouter }))

const mounted = []
let api
let router
function stubMedia(width) {
  window.matchMedia = (query) => {
    const min = Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0)
    return { matches: width >= min, addEventListener: () => {}, removeEventListener: () => {} }
  }
}
async function mountPage({ report = makeReport(), cached = true, width = 390, fail = false } = {}) {
  stubMedia(width)
  setGymStorage({ getItem: () => null, setItem: () => {}, removeItem: () => {} })
  api = { get: vi.fn(async (url) => { if (fail) throw new Error('x'); return url === '/gym' ? { programs: [], exercises: [], active: null, recent: [], week: { days: [], count: 0, minutes: 0 }, totalSessions: 0, firstOn: null, mini: null } : report }), post: vi.fn(), patch: vi.fn(), put: vi.fn(), del: vi.fn() }
  setGymApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  if (cached) useGymStore().reports[report.session.id] = report
  router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/tabs/menu/gym/selesai/:id', component: GymSummaryPage }] })
  router.push(`/tabs/menu/gym/selesai/${report.session.id}`)
  await router.isReady()
  const w = mount(GymSummaryPage, { global: { plugins: [pinia, router] }, attachTo: document.body })
  mounted.push(w)
  await flushPromises()
  return w
}
beforeEach(() => {
  Object.values(ionRouter).forEach((f) => f.mockReset?.())
  ionRouter.canGoBack = () => true
  document.body.appendChild(document.createElement('ion-app'))
})
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  document.querySelectorAll('ion-app').forEach((e) => e.remove())
})

describe('GymSummaryPage', () => {
  it('hero: judul, tanggal & jam WIB, Durasi, Volume + chip, Set, PR baru', async () => {
    const w = await mountPage()
    const hero = w.find('[data-test="hero"]').text()
    expect(hero).toContain('Push beres 💪')
    expect(hero).toContain('Sen, 23 Nov · 18.05–19.17')
    expect(hero).toContain('1 j 12 m')
    expect(hero).toContain('9.120')
    expect(w.find('[data-test="vol-chip"]').text()).toBe('-9% vs Push 16 Nov')
    expect(w.find('[data-test="vol-chip"]').classes()).toContain('n')
    expect(w.find('[data-test="stat-sets"]').text()).toBe('6')
    expect(w.find('[data-test="stat-prs"]').text()).toContain('2')
  })

  it('volume naik → chip lime; nggak ada pembanding → chip hilang', async () => {
    const up = await mountPage({ report: makeReport({ summary: { ...makeReport().summary, volumeDeltaPct: 6 } }) })
    expect(up.find('[data-test="vol-chip"]').text()).toBe('+6% vs Push 16 Nov')
    expect(up.find('[data-test="vol-chip"]').classes()).not.toContain('n')
    const none = await mountPage({ report: makeReport({ summary: { ...makeReport().summary, volumeDeltaPct: null, volumeVs: null } }) })
    expect(none.find('[data-test="vol-chip"]').exists()).toBe(false)
  })

  it('daftar PR baru pake teks dari mockup', async () => {
    const w = await mountPage()
    const rows = w.findAll('[data-test="pr-row"]').map((r) => r.text())
    expect(rows).toHaveLength(2)
    expect(rows[0]).toContain('Incline Dumbbell Press')
    expect(rows[0]).toContain('beban terberat baru (sebelumnya 22,5 kg)')
    expect(rows[0]).toContain('25 × 8')
    expect(rows[1]).toContain('reps terbanyak di 30 kg')
  })

  it('tanpa PR: bagian PR baru nggak dibikin', async () => {
    const r = makeReport()
    r.exercises = r.exercises.map((x) => ({ ...x, pr: null }))
    const w = await mountPage({ report: r })
    expect(w.find('[data-test="pr-row"]').exists()).toBe(false)
  })

  it('per gerakan: ↑ hijau, = abu, ↓ kuning, baru tanpa panah, dilewatin abu', async () => {
    const w = await mountPage()
    const rows = w.findAll('[data-test="cmp-row"]')
    expect(rows).toHaveLength(6)
    expect(rows[0].find('.arw.up').text()).toBe('↑')
    expect(rows[0].text()).toContain('2 set · 25 × 8, 25 × 7')
    expect(rows[0].text()).toContain('vs 22,5 × 10')
    expect(rows[2].find('.arw.dn').text()).toBe('↓')
    expect(rows[3].find('.arw.eq').text()).toBe('=')
    expect(rows[4].text()).toContain('baru')
    expect(rows[4].text()).not.toMatch(/[↑↓=]/)
    expect(rows[5].classes()).toContain('skip')
    expect(rows[5].text()).toContain('Triceps Pushdown')
    expect(rows[5].text()).toContain('dilewatin')
  })

  it('pake Report dari store (nggak fetch); nggak ada → fetch', async () => {
    await mountPage()
    expect(api.get).not.toHaveBeenCalledWith('/gym/sessions/20')
    const w = await mountPage({ cached: false })
    expect(api.get).toHaveBeenCalledWith('/gym/sessions/20')
    expect(w.find('[data-test="hero"]').exists()).toBe(true)
  })

  it('gagal muat → pesan + Coba lagi', async () => {
    const w = await mountPage({ cached: false, fail: true })
    expect(w.find('[data-test="failed"]').exists()).toBe(true)
  })

  it('Balik ke Gym → replace ke halaman Gym', async () => {
    const w = await mountPage()
    await w.find('[data-test="back-gym"]').trigger('click')
    expect(ionRouter.replace).toHaveBeenCalledWith('/tabs/menu/gym')
  })

  it('tombol ? Volume & PR buka penjelasan istilah', async () => {
    const w = await mountPage()
    await w.find('[data-test="info-volume"]').trigger('click')
    expect(document.querySelector('[data-test="info-sheet"]').classList.contains('show')).toBe(true)
    expect(document.querySelector('[data-test="info-sheet"] h2').textContent).toBe('Volume')
    await w.findAll('[data-test="info-pr"]')[0].trigger('click')
    expect(document.querySelector('[data-test="info-sheet"] h2').textContent).toBe('PR (rekor pribadi)')
  })

  it('sesi udah dihapus (404) → pesan ramah + Balik ke Gym', async () => {
    const w = await mountPage({ cached: false })
    expect(api.get).toHaveBeenCalled()
    w.unmount()
    stubMedia(390)
    const pinia = createPinia()
    setActivePinia(pinia)
    api.get.mockRejectedValue(Object.assign(new Error('Sesinya nggak ketemu.'), { status: 404 }))
    router.push('/tabs/menu/gym/selesai/20')
    const w2 = mount(GymSummaryPage, { global: { plugins: [pinia, router] }, attachTo: document.body })
    mounted.push(w2)
    await flushPromises()
    expect(w2.find('[data-test="missing"]').text()).toContain('Sesinya udah nggak ada.')
    await w2.find('[data-test="missing"] button').trigger('click')
    expect(ionRouter.replace).toHaveBeenCalledWith('/tabs/menu/gym')
  })

  it('simpenan dibuang pas halaman kebuka → diambil lagi', async () => {
    const w = await mountPage()
    const calls = api.get.mock.calls.length
    useGymStore().reports = {}
    await flushPromises()
    expect(api.get.mock.calls.length).toBe(calls + 1)
    expect(w.find('[data-test="hero"]').exists()).toBe(true)
  })
})
