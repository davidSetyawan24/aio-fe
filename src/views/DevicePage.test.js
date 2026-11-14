import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ApiError } from '@/lib/api.js'
import { setDevicesApi } from '@/stores/devices.js'
import DevicePage from './DevicePage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
const toast = vi.hoisted(() => ({ present: vi.fn() }))
const toastCreate = vi.hoisted(() => vi.fn())
const sheet = vi.hoisted(() => ({ present: vi.fn(), onDidDismiss: vi.fn() }))
const sheetCreate = vi.hoisted(() => vi.fn())

vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  toastController: { create: toastCreate },
  actionSheetController: { create: sheetCreate },
}))

const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
const me = { id: 1, name: null, kind: 'iPhone', browser: 'Safari', createdAt: '2026-11-02T03:00:00.000Z', lastUsedAt: yesterday, current: true }
const ipad = { id: 2, name: 'iPad kerja', kind: 'iPad', browser: 'Safari', createdAt: '2026-11-05T03:00:00.000Z', lastUsedAt: yesterday, current: false }

let api
async function mountDevice(id, overrides = {}) {
  api = {
    get: vi.fn(async () => ({ devices: [me, ipad] })),
    patch: vi.fn(async (url, body) => ({ device: { ...ipad, name: body.name.trim() || null } })),
    del: vi.fn(async () => null),
    ...overrides,
  }
  setDevicesApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/tabs/profil/device/:id', component: DevicePage }, { path: '/tabs/menu/kartu/:id', component: { render: () => null } }],
  })
  router.push(`/tabs/profil/device/${id}`)
  await router.isReady()
  const wrapper = mount(DevicePage, { global: { plugins: [pinia, router] } })
  await flushPromises()
  wrapper.router = router
  return wrapper
}
function type(wrapper, value) {
  const el = wrapper.find('ion-input').element
  el.value = value
  el.dispatchEvent(new Event('ionInput'))
}
const saveButton = (w) => w.find('[data-test="save"]')

beforeEach(() => {
  ionRouter.back.mockClear()
  toast.present.mockClear()
  toastCreate.mockReset().mockResolvedValue(toast)
  sheet.onDidDismiss.mockReset().mockResolvedValue({ data: 'kill' })
  sheetCreate.mockReset().mockResolvedValue(sheet)
})

describe('DevicePage', () => {
  it('shows the device name, activity and info', async () => {
    const w = await mountDevice(2)
    expect(w.find('h1').text()).toBe('iPad kerja.aktif kemarin')
    expect(w.find('ion-input').element.value).toBe('iPad kerja')
    expect(w.findAll('.info-row').map((r) => r.text())).toEqual([
      'JenisiPad', 'BrowserSafari', 'Login sejak5 Nov 2026', 'Terakhir aktifaktif kemarin',
    ])
  })

  it('enables Simpan only when the name changes, then saves', async () => {
    const w = await mountDevice(2)
    expect(saveButton(w).attributes('disabled')).toBeDefined()
    type(w, 'iPad rumah')
    await flushPromises()
    expect(saveButton(w).attributes('disabled')).toBeUndefined()
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(api.patch).toHaveBeenCalledWith('/auth/devices/2', { name: 'iPad rumah' })
    expect(toastCreate).toHaveBeenCalledWith(expect.objectContaining({ message: 'Nama device disimpan.' }))
    expect(w.find('h1').text()).toContain('iPad rumah.')
  })

  it('saves with the keyboard "done" key', async () => {
    const w = await mountDevice(2)
    type(w, 'iPad rumah')
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    w.find('ion-input').element.dispatchEvent(enter)
    await flushPromises()
    expect(enter.defaultPrevented).toBe(true)
    expect(api.patch).toHaveBeenCalledTimes(1)
  })

  it('shows the server message and keeps the typed name when saving fails', async () => {
    const w = await mountDevice(2, { patch: vi.fn(async () => { throw new ApiError('Nggak bisa nyambung ke server.', 0) }) })
    type(w, 'iPad rumah')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.find('.error').text()).toBe('Nggak bisa nyambung ke server.')
    expect(w.find('ion-input').element.value).toBe('iPad rumah')
  })

  it('kills another device after confirming, then goes back with a toast', async () => {
    const w = await mountDevice(2)
    await w.find('[data-test="kill"]').trigger('click')
    await flushPromises()
    expect(sheetCreate).toHaveBeenCalledWith(expect.objectContaining({ header: 'Keluarin iPad kerja?' }))
    expect(api.del).toHaveBeenCalledWith('/auth/devices/2')
    expect(ionRouter.back).toHaveBeenCalled()
    expect(toastCreate).toHaveBeenCalledWith(expect.objectContaining({ message: 'iPad kerja udah ke-logout.' }))
  })

  it('does nothing when the kill is cancelled', async () => {
    sheet.onDidDismiss.mockResolvedValue({ data: undefined })
    const w = await mountDevice(2)
    await w.find('[data-test="kill"]').trigger('click')
    await flushPromises()
    expect(api.del).not.toHaveBeenCalled()
  })

  it('has no kill button for this device, only a hint', async () => {
    const w = await mountDevice(1)
    expect(w.find('h1').text()).toBe('iPhone.aktif sekarang')
    expect(w.find('[data-test="kill"]').exists()).toBe(false)
    expect(w.find('[data-test="self-note"]').text()).toContain('Keluar')
  })

  it('says so when the device is gone', async () => {
    const w = await mountDevice(99)
    expect(w.find('[data-test="missing"]').text()).toContain('Device nggak ketemu')
  })
})

// Review 14/11: Ionic nyimpen halaman ketumpuk tetep hidup; route global bisa pindah ke halaman lain yang punya :id juga.
describe('DevicePage — route lain', () => {
  it('keeps showing its own device when another page with an id opens', async () => {
    const w = await mountDevice(2)
    type(w, 'iPad rumah')
    await w.router.push('/tabs/menu/kartu/1')
    await flushPromises()
    expect(w.find('h1').text()).toContain('iPad kerja.')
    expect(w.find('ion-input').element.value).toBe('iPad rumah')
  })
})
