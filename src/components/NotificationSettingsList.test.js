import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/lib/api.js'
import { setNotificationsApi } from '@/stores/notifications.js'
import NotificationSettingsList from './NotificationSettingsList.vue'

const toast = vi.hoisted(() => ({ present: vi.fn() }))
const toastCreate = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  toastController: { create: toastCreate },
}))

const ALL_ON = { tagihan: true, dokumen: true, todo: true, agenda: true, evaluasi: true, keamanan: true }
let api
async function mountList({ get, patch } = {}) {
  api = {
    get: get ?? vi.fn(async () => ({ settings: { ...ALL_ON } })),
    patch: patch ?? vi.fn(async (url, body) => ({ settings: { ...ALL_ON, ...body } })),
  }
  setNotificationsApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  const w = mount(NotificationSettingsList, { global: { plugins: [pinia] } })
  await flushPromises()
  return w
}
const toggle = (w, key) => w.find(`[data-test="toggle-${key}"]`)

beforeEach(() => toastCreate.mockReset().mockResolvedValue(toast))

describe('NotificationSettingsList', () => {
  it('loads the settings and shows the four kinds as switches, all on', async () => {
    const w = await mountList()
    expect(api.get).toHaveBeenCalledWith('/notifications/settings')
    for (const key of ['tagihan', 'todo', 'agenda', 'keamanan']) expect(toggle(w, key).attributes('aria-checked'), key).toBe('true')
    expect(w.text()).toContain('Bayar Rutin')
    expect(w.text()).toContain('Sesuai pengingat tiap bayar rutin')
    expect(w.text()).not.toContain('Tagihan')
  })

  it('shows the Evaluasi AI switch and saves it', async () => {
    const w = await mountList()
    expect(w.text()).toContain('Evaluasi AI')
    expect(w.text()).toContain('Pas evaluasi sesi gym udah jadi')
    await toggle(w, 'evaluasi').trigger('click')
    await flushPromises()
    expect(api.patch).toHaveBeenCalledWith('/notifications/settings', { evaluasi: false })
  })

  it('shows the Dokumen switch and saves it', async () => {
    const w = await mountList()
    expect(w.text()).toContain('Dokumen')
    expect(w.text()).toContain('Sesuai pengingat tiap dokumen')
    await toggle(w, 'dokumen').trigger('click')
    await flushPromises()
    expect(api.patch).toHaveBeenCalledWith('/notifications/settings', { dokumen: false })
  })

  it('saves a switch right away', async () => {
    const w = await mountList()
    await toggle(w, 'keamanan').trigger('click')
    await flushPromises()
    expect(api.patch).toHaveBeenCalledWith('/notifications/settings', { keamanan: false })
    expect(toggle(w, 'keamanan').attributes('aria-checked')).toBe('false')
  })

  it('flips back and says why when saving fails', async () => {
    const w = await mountList({ patch: vi.fn(async () => { throw new ApiError('Nggak bisa nyambung ke server.', 0) }) })
    await toggle(w, 'todo').trigger('click')
    await flushPromises()
    expect(toggle(w, 'todo').attributes('aria-checked')).toBe('true')
    expect(toastCreate).toHaveBeenCalledWith(expect.objectContaining({ message: 'Nggak bisa nyambung ke server.' }))
  })

  it('says why when the settings cannot be loaded', async () => {
    const w = await mountList({ get: vi.fn(async () => { throw new ApiError('Nggak bisa nyambung ke server.', 0) }) })
    expect(w.text()).toContain('Nggak bisa nyambung ke server.')
  })
})
