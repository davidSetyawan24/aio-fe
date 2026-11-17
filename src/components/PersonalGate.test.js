import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/lib/api.js'
import { setPersonalApi, usePersonalStore } from '@/stores/personal.js'
import { useAuthStore } from '@/stores/auth.js'
import PersonalGate from './PersonalGate.vue'

const toastCreate = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }),
  toastController: { create: toastCreate },
}))
vi.mock('@/components/NotifBell.vue', () => ({ default: { template: '<span />' } }))

const status = (over) => ({ configured: true, hasPin: true, unlocked: false, ...over })
const mounted = []
let api
let store

async function mountGate(handlers = {}, statusOver = {}) {
  const calls = {
    'GET /personal/status': { status: status(statusOver) },
    'GET /personal': { today: '2026-11-18', bio: { fields: {}, extra: [] }, documents: [], addresses: [] },
    ...handlers,
  }
  const make = (method) => vi.fn(async (url, body) => {
    const h = calls[`${method} ${url}`]
    if (h instanceof Error) throw h
    return typeof h === 'function' ? h(body) : h ?? {}
  })
  api = { get: make('GET'), post: make('POST'), put: make('PUT'), del: make('DELETE') }
  setPersonalApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  store = usePersonalStore()
  const w = mount(PersonalGate, { slots: { default: '<div data-test="inside">isi rahasia</div>' }, global: { plugins: [pinia] }, attachTo: document.body })
  mounted.push(w)
  await flushPromises()
  return w
}
const type = async (w, digits) => {
  for (const d of digits) await w.find(`[data-k="${d}"]`).trigger('click')
  await new Promise((r) => setTimeout(r, 200))
  await flushPromises()
}

beforeEach(() => toastCreate.mockReset().mockResolvedValue({ present: vi.fn() }))
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.useRealTimers()
})

describe('PersonalGate', () => {
  it('boots once (lock first) and shows the pin screen, no content', async () => {
    const w = await mountGate()
    expect(api.post).toHaveBeenCalledWith('/personal/lock')
    expect(w.text()).toContain('Data Pribadi kekunci')
    expect(w.find('[data-test="inside"]').exists()).toBe(false)
  })

  it('says so when the server has no key', async () => {
    const w = await mountGate({}, { configured: false, hasPin: false })
    expect(w.text()).toContain('Data Pribadi belum disetel di server.')
    expect(w.find('.p-pad').exists()).toBe(false)
  })

  it('unlocks with the right pin and loads the content', async () => {
    const w = await mountGate({ 'POST /personal/unlock': { status: status({ unlocked: true }) } })
    await type(w, '123456')
    expect(api.post).toHaveBeenCalledWith('/personal/unlock', { pin: '123456' })
    expect(api.get).toHaveBeenCalledWith('/personal')
    expect(w.find('[data-test="inside"]').exists()).toBe(true)
    expect(w.find('.p-pad').exists()).toBe(false)
  })

  it('shows the remaining tries after a wrong pin', async () => {
    const w = await mountGate({ 'POST /personal/unlock': new ApiError('PIN salah.', 422, { left: 4 }) })
    await type(w, '000000')
    expect(w.text()).toContain('PIN salah. Sisa 4× lagi.')
    expect(w.find('[data-test="inside"]').exists()).toBe(false)
  })

  it('after a sign-out the old content never shows: a fresh gate asks the server, then shows the pin', async () => {
    const w = await mountGate({ 'POST /personal/unlock': { status: status({ unlocked: true }) } })
    await type(w, '123456')
    expect(w.find('[data-test="inside"]').exists()).toBe(true)
    w.unmount()
    mounted.splice(mounted.indexOf(w), 1)
    useAuthStore().markGuest()
    let answer
    api.get.mockImplementation(async (url) => (url === '/personal/status' ? new Promise((r) => { answer = r }) : null))
    const w2 = mount(PersonalGate, { slots: { default: '<div data-test="inside">isi rahasia</div>' }, attachTo: document.body })
    mounted.push(w2)
    await flushPromises()
    expect(w2.find('[data-test="inside"]').exists()).toBe(false)
    expect(w2.text()).toContain('Lagi ngecek')
    answer({ status: status() })
    await flushPromises()
    expect(w2.find('[data-test="inside"]').exists()).toBe(false)
    expect(w2.find('.p-pad').exists()).toBe(true)
  })

  it('a gate that stays mounted through a sign-out asks the server again after the next login', async () => {
    const w = await mountGate({ 'POST /personal/unlock': { status: status({ unlocked: true }) } })
    await type(w, '123456')
    const auth = useAuthStore()
    auth.status = 'authed'
    auth.markGuest()
    await flushPromises()
    expect(w.find('[data-test="inside"]').exists()).toBe(false)
    api.get.mockClear()
    auth.status = 'authed'
    await flushPromises()
    expect(api.get).toHaveBeenCalledWith('/personal/status')
    expect(w.find('.p-pad').exists()).toBe(true)
    expect(w.find('[data-test="inside"]').exists()).toBe(false)
  })

  it('counts down after too many tries', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const w = await mountGate({ 'POST /personal/unlock': new ApiError('Kebanyakan salah.', 429, { retryAfterSec: 3 }) })
    await type(w, '000000')
    expect(w.text()).toContain('Kebanyakan salah. Coba lagi 3 detik lagi.')
    expect(w.find('[data-k="1"]').attributes('disabled')).toBeDefined()
    vi.advanceTimersByTime(1000)
    await flushPromises()
    expect(w.text()).toContain('Coba lagi 2 detik lagi.')
    vi.advanceTimersByTime(2000)
    await flushPromises()
    expect(w.text()).not.toContain('Kebanyakan salah')
    expect(w.find('[data-k="1"]').attributes('disabled')).toBeUndefined()
  })

  it('creates a pin: mismatch restarts, match saves', async () => {
    const w = await mountGate({ 'PUT /personal/pin': { status: status({ unlocked: true }) } }, { hasPin: false })
    expect(w.text()).toContain('Bikin PIN dulu')
    expect(w.find('[data-test="forgot"]').exists()).toBe(false)
    await type(w, '123456')
    expect(w.text()).toContain('Ulangi PIN-nya')
    await type(w, '654321')
    expect(w.text()).toContain('PIN-nya nggak sama. Ulang dari awal ya.')
    expect(w.text()).toContain('Bikin PIN dulu')
    expect(api.put).not.toHaveBeenCalled()
    await type(w, '123456')
    await type(w, '123456')
    expect(api.put).toHaveBeenCalledWith('/personal/pin', { pin: '123456' })
    expect(w.find('[data-test="inside"]').exists()).toBe(true)
    expect(toastCreate.mock.calls[0][0].message).toBe('PIN udah dipasang ✓')
  })

  it('forgot pin: password, then a new pin resets and opens', async () => {
    const w = await mountGate({ 'POST /personal/pin/reset': { status: status({ unlocked: true }) } })
    await w.find('[data-test="forgot"]').trigger('click')
    expect(w.text()).toContain('Lupa PIN?')
    expect(w.text()).toContain('Masukin password akun AIO lo dulu.')
    await w.find('input[type="password"]').setValue('rahasia')
    await w.find('[data-test="forgot-next"]').trigger('click')
    expect(w.text()).toContain('Bikin PIN dulu')
    await type(w, '246810'.slice(0, 6))
    await type(w, '246810'.slice(0, 6))
    expect(api.post).toHaveBeenCalledWith('/personal/pin/reset', { password: 'rahasia', pin: '246810' })
    expect(w.find('[data-test="inside"]').exists()).toBe(true)
  })

  it('goes back to the password step when the password is wrong', async () => {
    const w = await mountGate({ 'POST /personal/pin/reset': new ApiError('Password-nya salah.', 422) })
    await w.find('[data-test="forgot"]').trigger('click')
    await w.find('input[type="password"]').setValue('salah')
    await w.find('[data-test="forgot-next"]').trigger('click')
    await type(w, '123456')
    await type(w, '123456')
    expect(w.text()).toContain('Password-nya salah.')
    expect(w.find('input[type="password"]').exists()).toBe(true)
  })

  it('goes back to the pin screen when the server locks us again (423)', async () => {
    const w = await mountGate({ 'POST /personal/unlock': { status: status({ unlocked: true }) } })
    await type(w, '123456')
    expect(w.find('[data-test="inside"]').exists()).toBe(true)
    await store.saveBio({}).catch(() => {})
    api.put.mockRejectedValueOnce(new ApiError('Data Pribadi kekunci.', 423))
    await store.saveBio({}).catch(() => {})
    await flushPromises()
    expect(w.find('[data-test="inside"]').exists()).toBe(false)
    expect(w.text()).toContain('Data Pribadi kekunci')
  })
})
