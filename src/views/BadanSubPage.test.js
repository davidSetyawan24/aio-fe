import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { addDays } from '@/lib/agenda.js'
import { wibNow } from '@/lib/home.js'
import { setBadanApi } from '@/stores/badan.js'
import BadanSubPage from './BadanSubPage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: vi.fn(() => true), back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
const route = vi.hoisted(() => ({ params: {}, query: {}, meta: {} }))
const willEnter = vi.hoisted(() => [])
const toastCreate = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  onIonViewWillEnter: (cb) => willEnter.push(cb),
  toastController: { create: toastCreate },
  actionSheetController: { create: vi.fn() },
}))
vi.mock('vue-router', async (importOriginal) => ({ ...(await importOriginal()), useRoute: () => route }))

const TODAY = wibNow().date
const row = { id: 5, weighedOn: addDays(TODAY, -1), weighedAt: '06:12', weight: 75, fat: 28, muscle: 52, water: 50, visceral: 9, bone: 2.9, protein: 17, bmr: 1650, bmi: 24.6, score: 80, bodyType: 'thick_set', source: 'scan' }
let api
const mounted = []
async function mountSub({ view, params = {}, width = 390 }) {
  Object.assign(route, { params, query: {}, meta: { view } })
  window.matchMedia = (q) => ({ matches: width >= Number(/min-width:\s*(\d+)px/.exec(q)?.[1] ?? 0), addEventListener: () => {}, removeEventListener: () => {} })
  api = { get: vi.fn(async () => ({ weighings: [row], target: null })), post: vi.fn(async () => ({ weighing: { id: 9 } })), patch: vi.fn(async () => ({ weighing: row })), put: vi.fn(), del: vi.fn() }
  setBadanApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  const w = mount(BadanSubPage, { global: { plugins: [pinia] }, attachTo: document.body })
  mounted.push(w)
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
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

describe('BadanSubPage', () => {
  it('manual: shows the form under the Badan heading', async () => {
    const w = await mountSub({ view: 'manual' })
    expect(w.text()).toContain('Isi manual.')
    expect(w.find('[data-test="f-weight"]').exists()).toBe(true)
    expect(w.find('[data-test="back"]').text()).toBe('Badan')
  })

  it('saving goes back and shows the toast', async () => {
    const w = await mountSub({ view: 'manual' })
    await w.find('[data-test="f-weight"]').setValue('74,9')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(ionRouter.back).toHaveBeenCalled()
    expect(toastCreate.mock.calls[0][0].message).toBe('Kesimpen ✓')
  })

  it('detail: shows the weighing; Ubah goes to its edit route', async () => {
    const w = await mountSub({ view: 'detail', params: { id: '5' } })
    expect(w.find('[data-test="title"]').exists()).toBe(true)
    await w.find('[data-test="edit"]').trigger('click')
    expect(ionRouter.navigate).toHaveBeenCalledWith('/tabs/menu/badan/5/ubah', 'forward', 'push')
  })

  it('edit: back label is Detail and the form is filled', async () => {
    const w = await mountSub({ view: 'edit', params: { id: '5' } })
    expect(w.find('[data-test="back"]').text()).toBe('Detail')
    expect(w.find('[data-test="f-weight"]').element.value).toBe('75,00')
  })

  it('upload: registered with a placeholder and a back button', async () => {
    const w = await mountSub({ view: 'upload' })
    expect(w.find('[data-test="upload"]').exists()).toBe(true)
    await w.find('[data-test="back"]').trigger('click')
    expect(ionRouter.back).toHaveBeenCalled()
  })

  it('wide screens: throws the view to the main page as a panel', async () => {
    await mountSub({ view: 'detail', params: { id: '5' }, width: 900 })
    willEnter.forEach((cb) => cb())
    expect(ionRouter.navigate).toHaveBeenCalledWith('/tabs/menu/badan?panel=detail&id=5', 'back', 'replace')
  })
})
