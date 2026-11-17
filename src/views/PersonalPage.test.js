import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { setPersonalApi, usePersonalStore } from '@/stores/personal.js'
import PersonalPage from './PersonalPage.vue'

const toastCreate = vi.hoisted(() => vi.fn())
const copyMock = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }),
  toastController: { create: toastCreate },
}))
vi.mock('@/components/NotifBell.vue', () => ({ default: { template: '<span />' } }))
vi.mock('@/lib/clipboard.js', () => ({ copyToClipboard: copyMock }))

const date = (over) => ({ key: 'expiry', on: '2027-07-24', reminders: [], state: 'ok', daysLeft: 250, lateDays: 0, ...over })
const full = {
  today: '2026-11-18',
  bio: { fields: { name: 'David Setyawan', birthDate: '24-07-1997' }, extra: [{ label: 'Tinggi badan', value: '172 cm' }] },
  documents: [
    { id: 1, type: 'ktp', label: null, values: ['3275012407970001'], dates: [] },
    { id: 6, type: 'simc', label: null, values: ['970787654321'], dates: [date({ on: '2026-12-05', state: 'soon', daysLeft: 17 })] },
  ],
  addresses: [{ id: 1, name: 'Rumah Bekasi', ktp: true, domicile: false, street: 'Jl. Melati Raya No. 5', rtRw: '003 / 007', village: 'Jatiwaringin', district: 'Pondok Gede', city: 'Kota Bekasi', province: 'Jawa Barat', postalCode: '17411' }],
}

const mounted = []
let api
function stubMedia(width) {
  window.matchMedia = (query) => {
    const min = Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0)
    return { matches: width >= min, addEventListener: () => {}, removeEventListener: () => {} }
  }
}
async function mountPage({ width = 390, unlocked = true } = {}) {
  stubMedia(width)
  api = {
    get: vi.fn(async (url) => (url === '/personal/status' ? { configured: true, hasPin: true, unlocked } : full)),
    post: vi.fn(async (url) => (url === '/personal/lock' ? { status: { configured: true, hasPin: true, unlocked: false } } : {})),
    put: vi.fn(), del: vi.fn(),
  }
  setPersonalApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = usePersonalStore()
  // Sudah kebuka (boot-nya udah lewat): isi dimuat gerbang begitu kepasang.
  store.booted = true
  store.status = { configured: true, hasPin: true, unlocked }
  const w = mount(PersonalPage, { global: { plugins: [pinia] }, attachTo: document.body })
  mounted.push(w)
  await flushPromises()
  return w
}

beforeEach(() => {
  toastCreate.mockReset().mockResolvedValue({ present: vi.fn() })
  copyMock.mockReset().mockResolvedValue(true)
})
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

describe('PersonalPage', () => {
  it('opens on Dokumen with a yellow dot because something needs attention', async () => {
    const w = await mountPage()
    expect(w.find('[data-test="tab-dokumen"]').classes()).toContain('on')
    expect(w.find('[data-test="due-dot"]').exists()).toBe(true)
    expect(w.find('[data-test="due"]').text()).toContain('SIM C')
    expect(w.find('[data-test="due"]').text()).toContain('Habis 17 hari lagi · 5 Des 2026')
    expect(w.find('[data-test="docs"]').text()).toContain('3275 0124 0797 0001')
  })

  it('copies a number without spaces and says so', async () => {
    const w = await mountPage()
    await w.find('[data-test="doc-copy"]').trigger('click')
    await flushPromises()
    expect(copyMock).toHaveBeenCalledWith('970787654321')
    await w.find('[data-test="tab-bio"]').trigger('click')
    await w.findAll('[data-test="copy-row"]')[0].trigger('click')
    await flushPromises()
    expect(copyMock).toHaveBeenLastCalledWith('David Setyawan')
    expect(toastCreate.mock.calls.at(-1)[0].message).toBe('Nama lengkap kesalin ✓')
  })

  it('copies the NIK from the document row and toasts the field name', async () => {
    const w = await mountPage()
    const ktp = w.findAll('[data-test="doc-row"]').find((r) => r.text().includes('KTP'))
    await ktp.find('[data-test="doc-copy"]').trigger('click')
    await flushPromises()
    expect(copyMock).toHaveBeenCalledWith('3275012407970001')
    expect(toastCreate.mock.calls.at(-1)[0].message).toBe('NIK kesalin ✓')
  })

  it('keeps the birth date as shown but strips plain numbers', async () => {
    const w = await mountPage()
    await w.find('[data-test="tab-bio"]').trigger('click')
    const rows = w.findAll('[data-test="copy-row"]')
    const birth = rows.find((r) => r.text().includes('Tanggal lahir'))
    await birth.trigger('click')
    await flushPromises()
    expect(copyMock).toHaveBeenLastCalledWith('24-07-1997')
  })

  it('copies a whole address as one line', async () => {
    const w = await mountPage()
    await w.find('[data-test="tab-alamat"]').trigger('click')
    expect(w.text()).toContain('Sesuai KTP')
    await w.find('[data-test="copy-all"]').trigger('click')
    await flushPromises()
    expect(copyMock).toHaveBeenCalledWith('Jl. Melati Raya No. 5, RT 003/RW 007, Kel. Jatiwaringin, Kec. Pondok Gede, Kota Bekasi, Jawa Barat 17411')
    expect(toastCreate.mock.calls.at(-1)[0].message).toBe('Alamat lengkap kesalin ✓')
  })

  it('locks on Kunci: content gone, pin screen back, toast', async () => {
    const w = await mountPage()
    await w.find('[data-test="lock"]').trigger('click')
    await flushPromises()
    expect(api.post).toHaveBeenCalledWith('/personal/lock')
    expect(w.text()).toContain('Data Pribadi kekunci')
    expect(w.text()).not.toContain('3275')
    expect(toastCreate.mock.calls.at(-1)[0].message).toBe('Data Pribadi dikunci 🔒')
  })

  it('shows only the pin screen when locked', async () => {
    const w = await mountPage({ unlocked: false })
    expect(w.find('.p-pad').exists()).toBe(true)
    expect(w.text()).not.toContain('Perlu diurus')
    expect(w.find('[data-test="fab"]').exists()).toBe(false)
  })

  it('has the add button on phone only for Dokumen and Alamat', async () => {
    const w = await mountPage()
    expect(w.find('[data-test="fab"]').text()).toContain('Dokumen')
    await w.find('[data-test="tab-alamat"]').trigger('click')
    expect(w.find('[data-test="fab"]').text()).toContain('Alamat')
    await w.find('[data-test="tab-bio"]').trigger('click')
    expect(w.find('[data-test="fab"]').exists()).toBe(false)
  })

  it('uses two columns from 1100 and three from 1600', async () => {
    const two = await mountPage({ width: 1440 })
    expect(two.find('[data-test="cols-2"]').exists()).toBe(true)
    expect(two.find('[data-test="cols-3"]').exists()).toBe(false)
    expect(two.find('[data-test="seg"]').exists()).toBe(false)
    expect(two.find('[data-test="add-doc"]').exists()).toBe(true)
    const three = await mountPage({ width: 1920 })
    expect(three.find('[data-test="cols-3"]').exists()).toBe(true)
    expect(three.find('[data-test="cols-2"]').exists()).toBe(false)
  })
})
