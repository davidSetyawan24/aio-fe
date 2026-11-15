import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { setCategoriesApi, useCategoriesStore } from '@/stores/categories.js'
import CategoryFormPage from './CategoryFormPage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
const toast = vi.hoisted(() => ({ present: vi.fn() }))
const toastCreate = vi.hoisted(() => vi.fn())
const sheet = vi.hoisted(() => ({ present: vi.fn(), onDidDismiss: vi.fn() }))
const sheetCreate = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  onIonViewWillEnter: (fn) => fn(),
  toastController: { create: toastCreate },
  actionSheetController: { create: sheetCreate },
}))

const makan = { id: 1, name: 'Makan', emoji: '🍜', tint: '#FFE9D6' }
const ngopi = { id: 2, name: 'Ngopi', emoji: '☕', tint: '#FFF3B8' }

let api
let pinia
async function mountForm(path) {
  api = {
    get: vi.fn(async () => ({ categories: [makan, ngopi] })),
    post: vi.fn(async (url, body) => ({ category: { id: 9, ...body } })),
    patch: vi.fn(async (url, body) => ({ category: { ...makan, ...body } })),
    del: vi.fn(async () => null),
  }
  setCategoriesApi(api)
  pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/tabs/menu/kategori/tambah', component: CategoryFormPage },
      { path: '/tabs/menu/kategori/:id', component: CategoryFormPage },
      { path: '/tabs/menu/kartu/:id', component: { render: () => null } },
    ],
  })
  router.push(path)
  await router.isReady()
  const w = mount(CategoryFormPage, { global: { plugins: [pinia, router] } })
  await flushPromises()
  w.router = router
  return w
}
function typeName(w, value) {
  const el = w.find('[data-test="name"]').element
  el.value = value
  el.dispatchEvent(new Event('ionInput'))
}
const save = async (w) => {
  await w.find('form').trigger('submit')
  await flushPromises()
}

beforeEach(() => {
  ionRouter.back.mockClear()
  ionRouter.navigate.mockClear()
  toastCreate.mockReset().mockResolvedValue(toast)
  sheet.onDidDismiss.mockReset().mockResolvedValue({ data: 'delete' })
  sheetCreate.mockReset().mockResolvedValue(sheet)
})

describe('CategoryFormPage — tambah', () => {
  it('keeps Simpan off until there is a name', async () => {
    const w = await mountForm('/tabs/menu/kategori/tambah')
    expect(w.find('button[type="submit"]').attributes('disabled')).toBeDefined()
    typeName(w, '   ')
    await flushPromises()
    expect(w.find('button[type="submit"]').attributes('disabled')).toBeDefined()
    typeName(w, 'Hiburan')
    await flushPromises()
    expect(w.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('adds a category with the picked emoji and color', async () => {
    const w = await mountForm('/tabs/menu/kategori/tambah')
    typeName(w, '  Hiburan ')
    await w.find('[data-emoji="🎮"]').trigger('click')
    await w.find('[data-tint="#D8F3EE"]').trigger('click')
    expect(w.find('[data-test="preview"]').text()).toContain('🎮')
    await save(w)
    expect(api.post).toHaveBeenCalledWith('/expense-categories', { name: 'Hiburan', emoji: '🎮', tint: '#D8F3EE' })
    expect(ionRouter.back).toHaveBeenCalled()
    expect(toastCreate).toHaveBeenCalledWith(expect.objectContaining({ message: 'Kategori baru · 🎮 Hiburan' }))
    expect(useCategoriesStore().takeJustCreated()).toBeNull()
  })

  it('hands the new category to the Catat screen only when opened from there', async () => {
    const w = await mountForm('/tabs/menu/kategori/tambah?from=catat')
    typeName(w, 'Hiburan')
    await save(w)
    expect(useCategoriesStore().takeJustCreated()).toBe(9)
  })

  it('sends only one request when Simpan is tapped twice', async () => {
    const w = await mountForm('/tabs/menu/kategori/tambah')
    typeName(w, 'Hiburan')
    await flushPromises()
    w.find('form').trigger('submit')
    w.find('form').trigger('submit')
    await flushPromises()
    expect(api.post).toHaveBeenCalledTimes(1)
  })

  it('shows the server message when the name is taken', async () => {
    const w = await mountForm('/tabs/menu/kategori/tambah')
    const { ApiError } = await import('@/lib/api.js')
    api.post.mockRejectedValueOnce(new ApiError('Data tidak valid.', 422, { name: ['Kategori "Ngopi" udah ada.'] }))
    typeName(w, 'Ngopi')
    await save(w)
    expect(w.find('[role="alert"]').text()).toBe('Kategori "Ngopi" udah ada.')
    expect(ionRouter.back).not.toHaveBeenCalled()
  })

  it('labels the back button "Catat" when opened from the Catat screen', async () => {
    const w = await mountForm('/tabs/menu/kategori/tambah?from=catat')
    expect(w.find('.back').text()).toContain('Catat')
  })
})

describe('CategoryFormPage — ubah', () => {
  it('fills the form and saves changes', async () => {
    const w = await mountForm('/tabs/menu/kategori/1')
    expect(w.find('[data-test="name"]').element.value).toBe('Makan')
    expect(w.find('[data-emoji="🍜"]').classes()).toContain('on')
    typeName(w, 'Makan siang')
    await save(w)
    expect(api.patch).toHaveBeenCalledWith('/expense-categories/1', { name: 'Makan siang', emoji: '🍜', tint: '#FFE9D6' })
    expect(toastCreate).toHaveBeenCalledWith(expect.objectContaining({ message: 'Disimpen.' }))
  })

  it('hides the category after confirming', async () => {
    const w = await mountForm('/tabs/menu/kategori/2')
    await w.find('[data-test="delete"]').trigger('click')
    await flushPromises()
    expect(sheetCreate).toHaveBeenCalledWith(expect.objectContaining({ header: 'Hapus kategori Ngopi?' }))
    expect(api.del).toHaveBeenCalledWith('/expense-categories/2')
    expect(ionRouter.back).toHaveBeenCalled()
  })

  it('keeps its own category when another page with an id opens', async () => {
    const w = await mountForm('/tabs/menu/kategori/1')
    await w.router.push('/tabs/menu/kartu/2')
    await flushPromises()
    expect(w.find('[data-test="name"]').element.value).toBe('Makan')
  })
})

describe('CategoryFormPage — layar lebar', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  })
  afterEach(() => {
    delete window.matchMedia
  })

  it('goes back to Kategori when opened directly (the form lives in a panel there)', async () => {
    await mountForm('/tabs/menu/kategori/tambah')
    expect(ionRouter.navigate).toHaveBeenCalledWith('/tabs/menu/kategori', 'back', 'replace')
  })

  it('stays on the page when opened from Catat', async () => {
    const w = await mountForm('/tabs/menu/kategori/tambah?from=catat')
    expect(ionRouter.navigate).not.toHaveBeenCalled()
    expect(w.find('[data-test="name"]').exists()).toBe(true)
  })
})
