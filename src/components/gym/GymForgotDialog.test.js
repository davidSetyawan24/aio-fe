import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ApiError } from '@/lib/api.js'
import { LIVE_KEY } from '@/lib/gymLive.js'
import { useAuthStore } from '@/stores/auth.js'
import { useHomeStore } from '@/stores/home.js'
import { setGymApi, setGymStorage, useGymStore } from '@/stores/gym.js'
import GymForgotDialog from './GymForgotDialog.vue'

const toastCreate = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({ ...(await importOriginal()), toastController: { create: toastCreate } }))

const T0 = '2026-11-23T11:05:00.000Z' // 18.05 WIB
const LAST = '2026-11-23T12:17:00.000Z' // 19.17 WIB
const NOW = '2026-11-23T14:00:00.000Z'
const toasts = () => toastCreate.mock.calls.map((c) => c[0].message)

const row = (key, doneAt) => ({ key, weight: 20, reps: 10, done: !!doneAt, doneAt, serverId: doneAt ? 1 : null, prev: null })
const draft = (rows) => ({ clientId: 'c1', serverId: 100, program: 'push', startedAt: T0, planned: [1], open: 0, timer: null, queue: [], joined: false, lost: 0, items: [{ exerciseId: 1, extra: false, rows }] })
const report = (endedAt = '2026-11-23T12:22:00.000Z') => ({ session: { id: 100, endedAt }, exercises: [], skipped: [], summary: {} })

function memStorage() {
  const map = new Map()
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k), map }
}
function stubMedia(width) {
  window.matchMedia = (query) => {
    const min = Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0)
    return { matches: width >= min, addEventListener: () => {}, removeEventListener: () => {} }
  }
}

const mounted = []
let api, store, router
async function mountDialog({ rows = [row('a', LAST)], authed = true, width = 390, activeNow = true } = {}) {
  stubMedia(width)
  const storage = memStorage()
  storage.setItem(LIVE_KEY, JSON.stringify(draft(rows)))
  setGymStorage(storage)
  api = {
    get: vi.fn(async (url) => (url === '/gym/active' ? (activeNow ? { id: 100, program: 'push', startedAt: T0, lastSetAt: LAST, sets: rows.filter((r) => r.done).length } : null) : { programs: [], exercises: [], active: null })),
    post: vi.fn(async () => report()),
    patch: vi.fn(), put: vi.fn(), del: vi.fn(async () => null),
  }
  setGymApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  if (authed) useAuthStore().status = 'authed'
  store = useGymStore()
  router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { render: () => null } }] })
  router.push = vi.fn(async () => {})
  const w = mount(GymForgotDialog, { global: { plugins: [pinia, router] }, attachTo: document.body })
  mounted.push(w)
  await flushPromises()
  return w
}
const dlg = () => document.querySelector('[data-test="forgot-dialog"]')
const q = (s) => dlg().querySelector(s)
const isOpen = () => dlg().classList.contains('show')

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(NOW))
  toastCreate.mockReset()
  toastCreate.mockResolvedValue({ present: vi.fn() })
  document.body.appendChild(document.createElement('ion-app'))
})
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  document.querySelectorAll('ion-app').forEach((e) => e.remove())
  vi.useRealTimers()
})

describe('GymForgotDialog', () => {
  it('dipasang sebagai anak <ion-app> (target teleport ada abis dipasang) → tetap jalan tanpa warning', async () => {
    document.querySelectorAll('ion-app').forEach((e) => e.remove())
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const Host = { components: { GymForgotDialog }, template: '<ion-app><GymForgotDialog /></ion-app>' }
    stubMedia(390)
    const storage = memStorage()
    storage.setItem(LIVE_KEY, JSON.stringify(draft([row('a', LAST)])))
    setGymStorage(storage)
    setGymApi({ get: vi.fn(async (u) => (u === '/gym/active' ? { id: 100, program: 'push', startedAt: T0, lastSetAt: LAST, sets: 1 } : { programs: [], exercises: [], active: null })), post: vi.fn(), patch: vi.fn(), put: vi.fn(), del: vi.fn() })
    const pinia = createPinia()
    setActivePinia(pinia)
    useAuthStore().status = 'authed'
    const r = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { render: () => null } }] })
    const w = mount(Host, { global: { plugins: [pinia, r], config: { compilerOptions: { isCustomElement: (t) => t === 'ion-app' } } }, attachTo: document.body })
    mounted.push(w)
    await flushPromises()
    expect(dlg().classList.contains('show')).toBe(true)
    expect(warn.mock.calls.some((c) => String(c[0]).includes('Teleport'))).toBe(false)
    warn.mockRestore()
  })

  it('sesi habis / logout pas dialog kebuka (auth jadi guest) → dialog hilang & forgot dibersihin', async () => {
    await mountDialog()
    expect(isOpen()).toBe(true)
    useAuthStore().status = 'guest'
    await flushPromises()
    expect(isOpen()).toBe(false)
    expect(store.forgot).toBeNull()
  })

  it('lintas tengah malam: usulan 00.15 (D+1), sekarang 01.20 → pilih 23.50 = hari D (bukan masa depan)', async () => {
    vi.setSystemTime(new Date('2026-11-23T18:20:00.000Z')) // 24 Nov 01.20 WIB
    await mountDialog({ rows: [row('a', '2026-11-23T17:10:00.000Z')] }) // set terakhir 00.10, usulan 00.15
    const input = q('input[type="time"]')
    expect(input.value).toBe('00:15')
    input.value = '23:50'
    input.dispatchEvent(new Event('input'))
    await flushPromises()
    q('[data-test="forgot-done"]').click()
    await flushPromises()
    expect(api.post).toHaveBeenCalledWith('/gym/sessions/100/finish', { endedAt: '2026-11-23T16:50:00.000Z' }) // 23 Nov 23.50 WIB
  })

  it('lintas tengah malam: usulan 23.50 (D), sekarang 01.20 (D+1), pilih 00.10 → D+1 00.10 (bukan D 00.10)', async () => {
    vi.setSystemTime(new Date('2026-11-23T18:20:00.000Z')) // 24 Nov 01.20 WIB
    await mountDialog({ rows: [row('a', '2026-11-23T16:45:00.000Z')] }) // set terakhir 23.45, usulan 23.50
    const input = q('input[type="time"]')
    expect(input.value).toBe('23:50')
    input.value = '00:10'
    input.dispatchEvent(new Event('input'))
    await flushPromises()
    q('[data-test="forgot-done"]').click()
    await flushPromises()
    expect(api.post).toHaveBeenCalledWith('/gym/sessions/100/finish', { endedAt: '2026-11-23T17:10:00.000Z' }) // 24 Nov 00.10 WIB
  })

  it('lintas tengah malam: pilih 00.20 (belum lewat sekarang) → tetap hari D+1', async () => {
    vi.setSystemTime(new Date('2026-11-23T18:20:00.000Z'))
    await mountDialog({ rows: [row('a', '2026-11-23T17:10:00.000Z')] })
    const input = q('input[type="time"]')
    input.value = '00:20'
    input.dispatchEvent(new Event('input'))
    await flushPromises()
    q('[data-test="forgot-done"]').click()
    await flushPromises()
    expect(api.post).toHaveBeenCalledWith('/gym/sessions/100/finish', { endedAt: '2026-11-23T17:20:00.000Z' })
  })

  it('belum login → nggak ngecek apa-apa & dialog tutup', async () => {
    await mountDialog({ authed: false })
    expect(api.get).not.toHaveBeenCalled()
    expect(isOpen()).toBe(false)
  })

  it('sesi kelamaan diem → dialog buka: judul, jam set terakhir, picker jam isi usulan, label', async () => {
    await mountDialog()
    expect(isOpen()).toBe(true)
    expect(q('h2').textContent).toBe('Sesi Push masih jalan dari 18.05 — udah selesai?')
    expect(q('[data-test="last"]').textContent).toBe('Set terakhir dicentang jam 19.17.')
    expect(q('input[type="time"]').value).toBe('19:22')
    expect(dlg().textContent).toContain('Jam selesai · usulan: set terakhir + 5 menit')
    expect(q('[data-test="forgot-done"]').textContent).toContain('Selesai')
    expect(q('[data-test="forgot-keep"]').textContent).toBe('Lanjut sesi')
  })

  it('set terakhir baru (< 60 menit) → nggak buka', async () => {
    vi.setSystemTime(new Date('2026-11-23T12:50:00.000Z'))
    await mountDialog()
    expect(isOpen()).toBe(false)
  })

  it('HP: sheet; ≥768px: dialog', async () => {
    await mountDialog({ width: 390 })
    expect(dlg().classList.contains('dialog')).toBe(false)
    mounted.splice(0).forEach((w) => w.unmount())
    await mountDialog({ width: 1440 })
    expect(dlg().classList.contains('dialog')).toBe(true)
  })

  it('Selesai (jam usulan) → finish(ISO usulan) → toast → buka ringkasan', async () => {
    await mountDialog()
    useHomeStore().data = { today: '2026-11-23', gym: { active: { id: 100 } } }
    q('[data-test="forgot-done"]').click()
    await flushPromises()
    expect(api.post).toHaveBeenCalledWith('/gym/sessions/100/finish', { endedAt: '2026-11-23T12:22:00.000Z' })
    expect(toasts()).toContain('Sesi Push kesimpen · selesai 19.22')
    expect(router.push).toHaveBeenCalledWith('/tabs/menu/gym/selesai/100')
    expect(isOpen()).toBe(false)
    expect(store.live).toBeNull()
    expect(useHomeStore().data.gym).toBeNull()
  })

  it('jam diganti → tanggal WIB usulan + jam pilihan', async () => {
    await mountDialog()
    const input = q('input[type="time"]')
    input.value = '19:40'
    input.dispatchEvent(new Event('input'))
    await flushPromises()
    q('[data-test="forgot-done"]').click()
    await flushPromises()
    expect(api.post).toHaveBeenCalledWith('/gym/sessions/100/finish', { endedAt: '2026-11-23T12:40:00.000Z' })
  })

  it('lewat tengah malam WIB: usulan 00.05 (23 Nov UTC 17.05 → 24 Nov WIB) pakai tanggal WIB 24', async () => {
    const late = '2026-11-23T16:58:00.000Z' // 23.58 WIB
    vi.setSystemTime(new Date('2026-11-23T20:00:00.000Z'))
    await mountDialog({ rows: [row('a', late)] })
    api.get.mockImplementation(async (u) => (u === '/gym/active' ? { id: 100, program: 'push', startedAt: T0, lastSetAt: late, sets: 1 } : { programs: [], exercises: [], active: null }))
    expect(q('input[type="time"]').value).toBe('00:03')
    q('[data-test="forgot-done"]').click()
    await flushPromises()
    expect(api.post).toHaveBeenCalledWith('/gym/sessions/100/finish', { endedAt: '2026-11-23T17:03:00.000Z' })
  })

  it('422 → pesan di bawah kolom jam, dialog tetap kebuka', async () => {
    await mountDialog()
    api.post.mockRejectedValue(new ApiError('x', 422, { endedAt: ['Jam selesai nggak boleh sebelum set terakhir.'] }))
    q('[data-test="forgot-done"]').click()
    await flushPromises()
    expect(q('[data-test="forgot-err"]').textContent).toBe('Jam selesai nggak boleh sebelum set terakhir.')
    expect(isOpen()).toBe(true)
    expect(router.push).not.toHaveBeenCalled()
  })

  it('nggak ada sinyal → toast teksnya, dialog tetap kebuka', async () => {
    await mountDialog()
    api.post.mockRejectedValue(new ApiError('Nggak bisa nyambung ke server.', 0))
    q('[data-test="forgot-done"]').click()
    await flushPromises()
    expect(toasts().some((t) => t.includes('Belum ada sinyal'))).toBe(true)
    expect(isOpen()).toBe(true)
  })

  it('jam dikosongin → pesan, nggak kirim', async () => {
    await mountDialog()
    const input = q('input[type="time"]')
    input.value = ''
    input.dispatchEvent(new Event('input'))
    await flushPromises()
    q('[data-test="forgot-done"]').click()
    await flushPromises()
    expect(q('[data-test="forgot-err"]').textContent).toBe('Jam selesainya diisi dulu.')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('Lanjut sesi → ke halaman sesi, tutup, nggak muncul lagi pas dicek ulang', async () => {
    await mountDialog()
    q('[data-test="forgot-keep"]').click()
    await flushPromises()
    expect(router.push).toHaveBeenCalledWith('/tabs/menu/gym/sesi')
    expect(isOpen()).toBe(false)
    await store.checkForgot(new Date(Date.now() + 60000))
    expect(isOpen()).toBe(false)
  })

  it('0 set → teks buang sesi; Buang sesi → discard', async () => {
    await mountDialog({ rows: [row('a', null)] })
    api.get.mockImplementation(async (u) => (u === '/gym/active' ? { id: 100, program: 'push', startedAt: T0, lastSetAt: null, sets: 0 } : { programs: [], exercises: [], active: null }))
    expect(q('h2').textContent).toBe('Sesi Push dari 18.05 belum ada set yang dicentang — buang aja?')
    expect(q('input[type="time"]')).toBeNull()
    expect(q('[data-test="forgot-done"]')).toBeNull()
    q('[data-test="forgot-discard"]').click()
    await flushPromises()
    expect(api.del).toHaveBeenCalledWith('/gym/sessions/100?running=1')
    expect(store.live).toBeNull()
    expect(isOpen()).toBe(false)
  })

  it('app balik kelihatan (visibilitychange) → dicek lagi', async () => {
    vi.setSystemTime(new Date('2026-11-23T12:50:00.000Z'))
    await mountDialog()
    expect(isOpen()).toBe(false)
    vi.setSystemTime(new Date(NOW))
    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()
    expect(isOpen()).toBe(true)
  })
})
