import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { setPersonalApi, usePersonalStore } from '@/stores/personal.js'
import PersonalSubPage from './PersonalSubPage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: vi.fn(() => true), back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
const route = vi.hoisted(() => ({ params: {}, query: {}, meta: {} }))
const willEnter = vi.hoisted(() => [])
const toastCreate = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  onIonViewWillEnter: (cb) => willEnter.push(cb),
  onIonViewDidEnter: () => {},
  onIonViewDidLeave: () => {},
  toastController: { create: toastCreate },
  actionSheetController: { create: vi.fn() },
}))
vi.mock('vue-router', async (importOriginal) => ({ ...(await importOriginal()), useRoute: () => route }))

const date = { key: 'expiry', on: '2027-07-24', reminders: [], state: 'ok', daysLeft: 250, lateDays: 0 }
const full = {
  today: '2026-11-18',
  bio: { fields: { name: 'David' }, extra: [] },
  documents: [{ id: 6, type: 'simc', label: null, values: ['970787654321'], dates: [date] }],
  addresses: [{ id: 4, name: 'Rumah', ktp: true, domicile: false, street: 'Jl. Melati', rtRw: '', village: '', district: '', city: '', province: '', postalCode: '' }],
}

let api
function stubMedia(width) {
  window.matchMedia = (q) => ({ matches: width >= Number(/min-width:\s*(\d+)px/.exec(q)?.[1] ?? 0), addEventListener: () => {}, removeEventListener: () => {} })
}
async function mountSub({ view, params = {}, width = 390, unlocked = true }) {
  Object.assign(route, { params, query: {}, meta: { view } })
  stubMedia(width)
  api = {
    get: vi.fn(async (u) => (u === '/personal/status' ? { status: { configured: true, hasPin: true, unlocked } } : full)),
    post: vi.fn(async () => ({ document: full.documents[0], address: full.addresses[0] })), put: vi.fn(async () => ({ document: full.documents[0], address: full.addresses[0], bio: full.bio })), del: vi.fn(),
  }
  setPersonalApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = usePersonalStore()
  store.booted = true
  store.status = { configured: true, hasPin: true, unlocked }
  const w = mount(PersonalSubPage, { global: { plugins: [pinia] }, attachTo: document.body })
  await flushPromises()
  return w
}

beforeEach(() => {
  willEnter.length = 0
  ionRouter.back.mockReset()
  ionRouter.navigate.mockReset()
  ionRouter.canGoBack.mockReturnValue(true)
  toastCreate.mockReset().mockResolvedValue({ present: vi.fn() })
})

describe('PersonalSubPage', () => {
  it('shows the PIN screen while locked, not the content', async () => {
    const w = await mountSub({ view: 'doc', params: { id: '6' }, unlocked: false })
    expect(w.find('.p-pad').exists()).toBe(true)
    expect(w.text()).not.toContain('970787654321')
  })

  it.each([
    ['doc', { id: '6' }, 'Ada masa berlakunya'],
    ['doc-new', {}, 'Dokumen apa?'],
    ['doc-edit', { id: '6' }, 'Ubah SIM C'],
    ['addr-new', {}, 'Alamat baru'],
    ['addr-edit', { id: '4' }, 'Ubah alamat'],
    ['bio', {}, 'Ubah biodata'],
  ])('meta.view %s picks its component', async (view, params, text) => {
    const w = await mountSub({ view, params })
    expect(w.text()).toContain(text)
  })

  it('reads :id once at setup', async () => {
    const w = await mountSub({ view: 'doc', params: { id: '6' } })
    route.params.id = '99'
    await flushPromises()
    expect(w.text()).toContain('SIM C')
    expect(w.text()).not.toContain('nggak ketemu')
  })

  it('wide: leaves for the base page, carrying what to open in the query', async () => {
    await mountSub({ view: 'doc', params: { id: '6' }, width: 1440 })
    willEnter.forEach((cb) => cb())
    expect(ionRouter.navigate).toHaveBeenCalledWith('/tabs/menu/data-pribadi?panel=doc&id=6', 'back', 'replace')
  })

  it('wide: a new-address page redirects with panel=addr-new and no id', async () => {
    await mountSub({ view: 'addr-new', width: 1440 })
    willEnter.forEach((cb) => cb())
    expect(ionRouter.navigate).toHaveBeenCalledWith('/tabs/menu/data-pribadi?panel=addr-new', 'back', 'replace')
  })

  it('phone: does not redirect', async () => {
    await mountSub({ view: 'bio' })
    willEnter.forEach((cb) => cb())
    expect(ionRouter.navigate).not.toHaveBeenCalled()
  })

  it('saving goes back and toasts', async () => {
    const w = await mountSub({ view: 'bio' })
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(ionRouter.back).toHaveBeenCalled()
    expect(toastCreate.mock.calls.at(-1)[0].message).toBe('Biodata kesimpen ✓')
  })

  it('a new document lands on its own detail, replacing the form', async () => {
    const w = await mountSub({ view: 'doc-new' })
    await w.find('[data-test="type-ktp"]').trigger('click')
    await w.find('[data-test="val-0"]').setValue('1')
    api.post.mockResolvedValue({ document: { ...full.documents[0], id: 12 } })
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(ionRouter.navigate).toHaveBeenCalledWith('/tabs/menu/data-pribadi/dokumen/12', 'forward', 'replace')
  })

  it('Ubah on a detail pushes the edit page; back button goes back', async () => {
    const w = await mountSub({ view: 'doc', params: { id: '6' } })
    await w.find('[data-test="edit"]').trigger('click')
    expect(ionRouter.navigate).toHaveBeenCalledWith('/tabs/menu/data-pribadi/dokumen/6/ubah', 'forward', 'push')
    await w.find('[data-test="back"]').trigger('click')
    expect(ionRouter.back).toHaveBeenCalled()
  })
})
