import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { addDays, weekStart } from '@/lib/agenda.js'
import { wibNow } from '@/lib/home.js'
import { makeReport, makeWeek } from '@/test/gymReportFixture.js'
import { setGymApi, setGymStorage, useGymStore } from '@/stores/gym.js'
import GymReport from '@/components/gym/GymReport.vue'
import { setAiApi, setAiToast } from '@/stores/ai.js'
import GymHistoryPage from './GymHistoryPage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn(), replace: vi.fn() }))
const sheet = vi.hoisted(() => ({ create: vi.fn(), pick: undefined }))
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  actionSheetController: { create: sheet.create },
  toastController: { create: vi.fn().mockResolvedValue({ present: vi.fn() }) },
}))

const TODAY = wibNow().date
const THIS = weekStart(TODAY)
const W1 = THIS
const W2 = addDays(THIS, -7)
const W3 = addDays(THIS, -21)
const W4 = addDays(THIS, -28)
const mounted = []
let api
let router
function stubMedia(width) {
  window.matchMedia = (query) => {
    const min = Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0)
    return { matches: width >= min, addEventListener: () => {}, removeEventListener: () => {} }
  }
}
const gymData = { programs: [], exercises: [], active: null, recent: [], week: { days: [], count: 0, minutes: 0 }, totalSessions: 14, firstOn: '2026-10-12', mini: null }
async function mountPage({ width = 390, url = '/tabs/menu/gym/riwayat', first, more, report = makeReport(), fail = false } = {}) {
  stubMedia(width)
  setGymStorage({ getItem: () => null, setItem: () => {}, removeItem: () => {} })
  api = {
    get: vi.fn(async (u) => {
      if (u === '/gym') return gymData
      if (fail && u === '/gym/sessions') throw new Error('x')
      if (u === '/gym/sessions') return first ?? { weeks: [makeWeek(W1, [30, 29]), makeWeek(W2, [28]), makeWeek(W3, [27])], next: W3 }
      if (u.startsWith('/gym/sessions?beforeWeek=')) return more ?? { weeks: [makeWeek(W4, [26])], next: null }
      const sid = Number(u.split('/').pop())
      return { ...report, session: { ...report.session, id: sid } }
    }),
    post: vi.fn(), patch: vi.fn(), put: vi.fn(async (u) => ({ ...report, session: { ...report.session, id: Number(u.split('/').pop()) } })), del: vi.fn(async () => null),
  }
  setGymApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/tabs/menu/gym/riwayat', component: GymHistoryPage }] })
  router.push(url)
  await router.isReady()
  const w = mount(GymHistoryPage, { global: { plugins: [pinia, router] }, attachTo: document.body })
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
const q = (w, t) => w.find(`[data-test="${t}"]`)

describe('GymHistoryPage', () => {
  it('judul minggu + "N sesi · volume kg"', async () => {
    const w = await mountPage()
    const heads = w.findAll('[data-test="week-label"]').map((x) => x.text())
    expect(heads).toHaveLength(3)
    expect(heads[0]).toContain('Minggu ini')
    expect(heads[0]).toContain('2 sesi · 5.642 kg')
    expect(heads[1]).toContain('Minggu lalu')
    expect(heads[1]).toContain('1 sesi · 5.642 kg')
    expect(heads[2]).not.toMatch(/Minggu (ini|lalu)/)
    expect(heads[2]).toMatch(/\d+(\s\w+)?–\d+ \w+/)
  })

  it('baris sesi: durasi, set, volume, chip PR; tap → detail (HP)', async () => {
    const w = await mountPage()
    const rows = w.findAll('[data-test="hrow"]')
    expect(rows).toHaveLength(4)
    expect(rows[0].text()).toContain('🏆 2 PR')
    expect(rows[0].text()).toContain('1 j 10 m · 18 set · 2.821 kg')
    await rows[1].trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/gym/riwayat/29')
  })

  it('subjudul: total sesi sejak tanggal pertama', async () => {
    const w = await mountPage()
    expect(w.find('h1').text()).toContain('14 sesi sejak 12 Okt')
  })

  it('infinite scroll nyambung pake next sampe habis', async () => {
    const w = await mountPage()
    const inf = w.find('ion-infinite-scroll')
    expect(inf.exists()).toBe(true)
    const complete = vi.fn()
    inf.element.complete = complete
    inf.element.dispatchEvent(new CustomEvent('ionInfinite'))
    await flushPromises()
    expect(api.get).toHaveBeenCalledWith(`/gym/sessions?beforeWeek=${W3}`)
    expect(w.findAll('[data-test="week-label"]')).toHaveLength(4)
    expect(complete).toHaveBeenCalled()
    expect(useGymStore().hist.next).toBeNull()
  })

  it('kosong: pesan ramah', async () => {
    const w = await mountPage({ first: { weeks: [], next: null } })
    expect(q(w, 'empty').text()).toContain('Belum ada sesi')
    expect(w.findAll('[data-test="hrow"]')).toHaveLength(0)
  })

  it('gagal muat → Coba lagi, abis itu isinya muncul', async () => {
    const w = await mountPage({ fail: true })
    expect(q(w, 'failed').exists()).toBe(true)
    api.get.mockImplementation(async (u) => (u === '/gym/sessions' ? { weeks: [makeWeek(W1, [30])], next: null } : gymData))
    await q(w, 'failed').find('button').trigger('click')
    await flushPromises()
    expect(w.findAll('[data-test="hrow"]')).toHaveLength(1)
  })

  it('riwayat basi (abis ubah/hapus) → dimuat ulang', async () => {
    const w = await mountPage()
    const before = api.get.mock.calls.filter((c) => c[0] === '/gym/sessions').length
    useGymStore().hist.stale = true
    await flushPromises()
    expect(api.get.mock.calls.filter((c) => c[0] === '/gym/sessions').length).toBe(before + 1)
    expect(w.exists()).toBe(true)
  })
})

describe('GymHistoryPage (PC)', () => {
  it('tap baris → panel kanan lewat ?sesi=; panel nampilin detail', async () => {
    const w = await mountPage({ width: 1440 })
    await w.findAll('[data-test="hrow"]')[0].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.sesi).toBe('30')
    expect(ionRouter.push).not.toHaveBeenCalled()
    const panel = document.querySelector('[data-test="panel"]')
    expect(panel.classList.contains('show')).toBe(true)
    expect(panel.textContent).toContain('Incline Dumbbell Press')
    expect(panel.textContent).toContain('Hapus sesi')
  })

  it('?sesi=…&ubah=1 langsung buka form ubah; ✕ nutup panel', async () => {
    const w = await mountPage({ width: 1440, url: '/tabs/menu/gym/riwayat?sesi=30&ubah=1' })
    const panel = document.querySelector('[data-test="panel"]')
    expect(panel.querySelector('[data-test="form"]')).not.toBeNull()
    expect(panel.textContent).toContain('Ubah sesi')
    panel.querySelector('[data-test="panel-x"]').click()
    await flushPromises()
    expect(router.currentRoute.value.query.sesi).toBeUndefined()
    expect(w.exists()).toBe(true)
  })

  it('di panel: Ubah → ?ubah=1, simpen → balik ke detail (tetep ?sesi)', async () => {
    await mountPage({ width: 1440, url: '/tabs/menu/gym/riwayat?sesi=30' })
    const panel = () => document.querySelector('[data-test="panel"]')
    panel().querySelector('[data-test="edit"]').click()
    await flushPromises()
    expect(router.currentRoute.value.query).toMatchObject({ sesi: '30', ubah: '1' })
    panel().querySelector('[data-test="form"]').dispatchEvent(new Event('submit', { cancelable: true }))
    await flushPromises()
    expect(api.put).toHaveBeenCalled()
    expect(router.currentRoute.value.query.ubah).toBeUndefined()
    expect(router.currentRoute.value.query.sesi).toBe('30')
  })

  it('panel sesi: Bahas di chat buka panel chat evaluasi sesi itu', async () => {
    const ai = { get: vi.fn(async (url) => (url === '/ai/settings' ? { autoEval: false, enabled: true } : { sessionId: 30, status: 'none', content: null, error: null, stale: false })), post: vi.fn(async () => ({ id: 1, context: 'gym', kind: 'eval', messages: [], quote: null })), put: vi.fn(), patch: vi.fn(), del: vi.fn() }
    setAiApi(ai)
    setAiToast(vi.fn())
    const w = await mountPage({ width: 1440, url: '/tabs/menu/gym/riwayat?sesi=30' })
    w.findComponent(GymReport).vm.$emit('talk')
    await flushPromises()
    expect(ai.post).toHaveBeenCalledWith('/ai/conversations', { context: 'gym', sessionId: 30 })
    expect(document.querySelectorAll('[data-test="panel"].show').length).toBe(2)
  })
})
