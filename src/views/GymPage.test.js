import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { wibNow } from '@/lib/home.js'
import { addDays } from '@/lib/agenda.js'
import { setGymApi, setGymStorage, useGymStore } from '@/stores/gym.js'
import GymPage from './GymPage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
vi.mock('@ionic/vue', async (importOriginal) => ({ ...(await importOriginal()), useIonRouter: () => ionRouter }))

const TODAY = wibNow().date
const ex = (id, name, restSec, last) => ({ id, name, restSec, step: 2.5, dumbbell: false, last, record: null })
const exercises = [
  ex(1, 'Incline Dumbbell Press', 120, { on: addDays(TODAY, -7), sets: [[22.5, 10], [22.5, 9], [22.5, 8]] }),
  ex(2, 'Pec Deck', 90, null),
  ex(3, 'Squat', 300, null),
]
const programs = [
  { key: 'push', exerciseIds: [1, 2, 1, 2, 1, 2], lastOn: addDays(TODAY, -7) },
  { key: 'pull', exerciseIds: [3], lastOn: addDays(TODAY, -1) },
  { key: 'leg', exerciseIds: [3], lastOn: null },
  { key: 'upper', exerciseIds: [3], lastOn: null },
  { key: 'lower', exerciseIds: [3], lastOn: null },
]
const mon = (() => {
  const d = new Date(`${TODAY}T00:00:00Z`)
  return addDays(TODAY, -((d.getUTCDay() + 6) % 7))
})()
const week = { days: Array.from({ length: 7 }, (_, i) => ({ date: addDays(mon, i), program: i === 0 ? 'push' : null })), count: 1, minutes: 71 }
const at = (day, h) => `${addDays(TODAY, day)}T0${h}:00:00.000Z`
const recent = [
  { id: 9, program: 'pull', startedAt: at(-1, 3), endedAt: at(-1, 4), sets: 18, volume: 9120, prs: 2 },
  { id: 8, program: 'push', startedAt: at(-7, 3), endedAt: at(-7, 4), sets: 20, volume: 9000, prs: 0 },
]
const mini = { exerciseId: 1, points: [{ sessionId: 8, on: addDays(TODAY, -14), sets: [[20, 10]], best: [20, 10], e1rm: 26.5 }, { sessionId: 9, on: addDays(TODAY, -7), sets: [[22.5, 8]], best: [22.5, 8], e1rm: 28.5 }] }
const full = (over = {}) => ({ programs, exercises, active: null, recent, week, totalSessions: 12, firstOn: '2026-10-12', mini, ...over })
const emptyData = () => full({ recent: [], totalSessions: 0, firstOn: null, mini: null, week: { days: week.days.map((d) => ({ ...d, program: null })), count: 0, minutes: 0 }, programs: programs.map((p) => ({ ...p, lastOn: null })) })

const mounted = []
function memStorage() {
  const m = new Map()
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }
}
function stubMedia(width) {
  window.matchMedia = (query) => {
    const min = Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0)
    return { matches: width >= min, addEventListener: () => {}, removeEventListener: () => {} }
  }
}
async function mountPage({ data = full(), width = 390, live = null, fail = false, cached = true } = {}) {
  stubMedia(width)
  setGymStorage(memStorage())
  const get = fail ? vi.fn(async () => { throw new Error('x') }) : vi.fn(async () => data)
  setGymApi({ get, post: vi.fn(() => new Promise(() => {})), patch: vi.fn(), put: vi.fn(), del: vi.fn() })
  const pinia = createPinia()
  setActivePinia(pinia)
  if (live) {
    useGymStore().live = live
    if (cached) useGymStore().data = data
  }
  const w = mount(GymPage, { global: { plugins: [pinia] }, attachTo: document.body })
  mounted.push(w)
  await flushPromises()
  return w
}
const liveDraft = (program = 'push') => ({
  clientId: 'c1', serverId: null, program, startedAt: new Date(Date.now() - 42 * 60000).toISOString(), planned: [1], open: 0, timer: null, queue: [{ op: 'start' }], joined: false, lost: 0,
  items: [{ exerciseId: 1, extra: false, rows: [{ key: 'a', weight: 22.5, reps: 10, done: true, doneAt: 'x', serverId: null, prev: null }, { key: 'b', weight: 22.5, reps: 10, done: true, doneAt: 'x', serverId: null, prev: null }, { key: 'c', weight: 22.5, reps: 10, done: false, doneAt: null, serverId: null, prev: null }] }],
})

beforeEach(() => {
  ionRouter.push.mockReset()
  document.body.appendChild(document.createElement('ion-app'))
})
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  document.querySelectorAll('ion-app').forEach((e) => e.remove())
})
const sheet = () => document.querySelector('[data-test="pick-sheet"]')

describe('GymPage', () => {
  it('5 tombol latihan + keterangan gerakan & terakhir', async () => {
    const w = await mountPage()
    const tiles = w.findAll('[data-pick]')
    expect(tiles.map((t) => t.attributes('data-pick'))).toEqual(['push', 'pull', 'leg', 'upper', 'lower'])
    expect(tiles[0].text()).toContain('6 gerakan · terakhir 7 hari lalu')
    expect(tiles[1].text()).toContain('terakhir kemarin')
    expect(tiles[2].text()).toContain('belum pernah')
    expect(tiles.every((t) => t.attributes('disabled') === undefined)).toBe(true)
    expect(w.find('[data-test="livecard"]').exists()).toBe(false)
  })

  it('minggu ini, riwayat 4 terakhir, grafik mini, link program & semua riwayat', async () => {
    const w = await mountPage()
    expect(w.text()).toContain('Minggu ini')
    expect(w.text()).not.toContain('Minggu lalu')
    expect(w.text()).toContain('1 sesi')
    expect(w.findAll('[data-test="hrow"]')).toHaveLength(2)
    expect(w.text()).toContain('18 set')
    expect(w.text()).toContain('🏆 2 PR')
    expect(w.find('[data-test="mini"]').text()).toContain('Incline Dumbbell Press')
    expect(w.find('[data-test="mini"]').text()).toContain('22,5 × 8')
    expect(w.text()).toContain('Atur program')
    expect(w.text()).toContain('12 sesi sejak 12 Okt')
  })

  it('tanpa data grafik: bagian grafik disembunyiin', async () => {
    const w = await mountPage({ data: full({ mini: null }) })
    expect(w.find('[data-test="mini"]').exists()).toBe(false)
  })

  it('ada sesi jalan (draf di HP): kartu live, tombol mati, label', async () => {
    const w = await mountPage({ live: liveDraft() })
    const card = w.find('[data-test="livecard"]')
    expect(card.text()).toContain('Sesi Push lagi jalan')
    expect(card.text()).toContain('2 set')
    expect(card.text()).toMatch(/00:4[12]:\d\d/)
    expect(w.text()).toContain('selesaiin sesi yang jalan dulu')
    expect(w.findAll('[data-pick]').every((t) => t.attributes('disabled') !== undefined)).toBe(true)
    await card.trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/gym/sesi')
  })

  it('offline & belum ada data: draf sesi di HP tetep nongol sebagai kartu', async () => {
    const w = await mountPage({ live: liveDraft(), cached: false })
    expect(w.find('[data-test="livecard"]').text()).toContain('Sesi Push lagi jalan')
    expect(w.findAll('[data-pick]')).toHaveLength(0)
  })

  it('sesi jalan dari server (device lain) juga nongol', async () => {
    const active = { id: 5, clientId: 'z', program: 'pull', planned: [3], startedAt: new Date(Date.now() - 600000).toISOString(), endedAt: null, sets: [{ id: 1 }, { id: 2 }, { id: 3 }] }
    const w = await mountPage({ data: full({ active }) })
    expect(w.find('[data-test="livecard"]').text()).toContain('Sesi Pull lagi jalan')
    expect(w.find('[data-test="livecard"]').text()).toContain('3 set')
    expect(w.find('[data-pick="push"]').attributes('disabled')).toBeDefined()
  })

  it('belum pernah latihan: kartu "Belum ada sesi", tanpa minggu/riwayat/grafik', async () => {
    const w = await mountPage({ data: emptyData() })
    expect(w.text()).toContain('Belum ada sesi')
    expect(w.find('[data-test="week"]').exists()).toBe(false)
    expect(w.find('[data-test="mini"]').exists()).toBe(false)
    expect(w.text()).toContain('Atur program')
    expect(w.text()).not.toContain('Semua riwayat')
  })

  it('sesi pertama lagi jalan (belum ada riwayat): kartu live aja, tanpa kartu "Belum ada sesi"', async () => {
    const w = await mountPage({ data: emptyData(), live: liveDraft() })
    expect(w.find('[data-test="livecard"]').exists()).toBe(true)
    expect(w.find('[data-test="empty"]').exists()).toBe(false)
    expect(w.text()).not.toContain('Belum ada sesi')
    expect(w.find('[data-test="first-run"]').text()).toContain('Riwayat muncul abis lo Selesai')
  })

  it('tap Push → sheet Pilih latihan: daftar gerakan + sesi lalu + chip istirahat', async () => {
    const w = await mountPage()
    await w.find('[data-pick="push"]').trigger('click')
    const s = sheet()
    expect(s.classList.contains('show')).toBe(true)
    expect(s.textContent).toContain('Push')
    expect(s.textContent).toContain('6 gerakan')
    expect(s.textContent).toContain('Incline Dumbbell Press')
    expect(s.textContent).toContain('sesi lalu 22,5 × 10 · 3 set')
    expect(s.textContent).toContain('belum ada riwayat')
    expect(s.textContent).toContain('2 mnt')
    expect(s.textContent).toContain('1,5 mnt')
  })

  it('Mulai sesi: store.start(program) lalu ke layar sesi, dobel tap cuma sekali', async () => {
    const w = await mountPage()
    const store = useGymStore()
    const spy = vi.spyOn(store, 'start')
    await w.find('[data-pick="push"]').trigger('click')
    const btn = sheet().querySelector('[data-test="start"]')
    btn.click()
    btn.click()
    await flushPromises()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith('push')
    expect(ionRouter.push).toHaveBeenCalledTimes(1)
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/gym/sesi')
    expect(store.live.program).toBe('push')
  })

  it('tutup sheet: Esc / tombol ✕ / scrim', async () => {
    const w = await mountPage()
    await w.find('[data-pick="pull"]').trigger('click')
    sheet().querySelector('[data-test="pick-close"]').click()
    await flushPromises()
    expect(sheet().classList.contains('show')).toBe(false)
  })

  it('gagal muat tanpa cache: pesan + Coba lagi', async () => {
    const w = await mountPage({ fail: true })
    expect(w.find('[data-test="failed"]').exists()).toBe(true)
    expect(w.findAll('[data-pick]')).toHaveLength(0)
  })

  it('PC (1440): tombol tetap 5 dan sheet jadi dialog', async () => {
    const w = await mountPage({ width: 1440 })
    expect(w.findAll('[data-pick]')).toHaveLength(5)
    await w.find('[data-pick="push"]').trigger('click')
    expect(sheet().classList.contains('dialog')).toBe(true)
  })

  it('tap riwayat / grafik / program / semua riwayat pindah halaman', async () => {
    const w = await mountPage()
    await w.find('[data-test="hrow"]').trigger('click')
    expect(ionRouter.push).toHaveBeenLastCalledWith('/tabs/menu/gym/selesai/9'.replace('selesai', 'riwayat'))
    await w.find('[data-test="mini"]').trigger('click')
    expect(ionRouter.push).toHaveBeenLastCalledWith('/tabs/menu/gym/grafik?gerakan=1')
    await w.find('[data-test="go-program"]').trigger('click')
    expect(ionRouter.push).toHaveBeenLastCalledWith('/tabs/menu/gym/program')
    await w.find('[data-test="go-history"]').trigger('click')
    expect(ionRouter.push).toHaveBeenLastCalledWith('/tabs/menu/gym/riwayat')
  })
})
