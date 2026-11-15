import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { setCategoriesApi } from '@/stores/categories.js'
import CategoryPanel from './CategoryPanel.vue'

vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  toastController: { create: vi.fn(async () => ({ present: vi.fn() })) },
}))

let finishSave
async function mountPanel() {
  setCategoriesApi({
    get: vi.fn(async () => ({ categories: [] })),
    post: vi.fn(() => new Promise((resolve) => (finishSave = () => resolve({ category: { id: 11, name: 'Hiburan', emoji: '🎬', tint: '#FFE0E6' } })))),
  })
  const pinia = createPinia()
  setActivePinia(pinia)
  const w = mount(CategoryPanel, { props: { open: true, forCatat: true }, global: { plugins: [pinia], stubs: { teleport: true } }, attachTo: document.body })
  await flushPromises()
  return w
}
const typeName = (w, value) => {
  const el = w.find('[data-test="name"]').element
  el.value = value
  el.dispatchEvent(new Event('ionInput'))
}

// Review 15/11: nutup panel pas lagi nyimpen bikin kategori baru "nyangkut" & nanti nyelonong kepilih di catatan lain.
describe('CategoryPanel', () => {
  it('cannot be closed while the category is still saving', async () => {
    const w = await mountPanel()
    typeName(w, 'Hiburan')
    await flushPromises()
    await w.find('form').trigger('submit')
    await w.find('.x').trigger('click')
    await w.find('.cat-scrim').trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(w.emitted('close')).toBeUndefined()
    finishSave()
    await flushPromises()
    expect(w.emitted('done')).toHaveLength(1)
    await w.find('.x').trigger('click')
    expect(w.emitted('close')).toHaveLength(1)
    w.unmount()
  })
})
