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
const sleep = { id: 8, sleptOn: addDays(TODAY, -1), bedAt: '23:30', wakeAt: '06:10', totalMin: 400, deepMin: null, lightMin: null, remMin: null, score: 80, awakeCount: null, avgHr: null, avgHrv: null, source: 'manual' }
let api
const mounted = []
async function mountSub({ view, params = {}, width = 390 }) {
  Object.assign(route, { params, query: {}, meta: { view } })
  window.matchMedia = (q) => ({ matches: width >= Number(/min-width:\s*(\d+)px/.exec(q)?.[1] ?? 0), addEventListener: () => {}, removeEventListener: () => {} })
  api = { get: vi.fn(async () => ({ weighings: [row], target: null, activity: null, sleeps: [sleep] })), post: vi.fn(async (url) => (url === '/body/sleeps' ? { sleep: { id: 9 }, message: 'Data tidur kesimpen ✓' } : { weighing: { id: 9 } })), patch: vi.fn(async () => ({ weighing: row })), put: vi.fn(), del: vi.fn() }
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
    expect(w.find('h1').text()).toContain('Upload timbangan.')
    expect(w.find('[data-test="sub"]').text()).toBe('Dari gambar Zepp Life.')
    w.findComponent({ name: 'BadanUpload' }).vm.$emit('stage', 'result')
    await flushPromises()
    expect(w.find('h1').text()).toContain('Hasil bacaan.')
    expect(w.find('[data-test="sub"]').text()).toBe('Cek dulu angkanya, terus Simpen.')
    await w.find('[data-test="back"]').trigger('click')
    expect(ionRouter.back).toHaveBeenCalled()
  })

  it('wide screens: throws the view to the main page as a panel', async () => {
    await mountSub({ view: 'detail', params: { id: '5' }, width: 900 })
    willEnter.forEach((cb) => cb())
    expect(ionRouter.navigate).toHaveBeenCalledWith('/tabs/menu/badan?panel=detail&id=5', 'back', 'replace')
  })

  it('sleepManual: title + sub, saving goes back and toasts the server message', async () => {
    const w = await mountSub({ view: 'sleepManual' })
    expect(w.find('h1').text()).toContain('Isi tidur manual.')
    expect(w.find('[data-test="sub"]').text()).toBe('Ketik angka dari Huawei Health.')
    expect(w.find('[data-test="back"]').text()).toBe('Badan')
    await w.find('[data-test="f-total-h"]').setValue('6')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(api.post.mock.calls[0][0]).toBe('/body/sleeps')
    expect(ionRouter.back).toHaveBeenCalled()
    expect(toastCreate.mock.calls[0][0].message).toBe('Data tidur kesimpen ✓')
  })

  it('sleepDetail: shows the sleep; Ubah goes to its edit route', async () => {
    const w = await mountSub({ view: 'sleepDetail', params: { id: '8' } })
    expect(w.find('h1').exists()).toBe(false)
    expect(w.find('[data-test="title"]').exists()).toBe(true)
    await w.find('[data-test="edit"]').trigger('click')
    expect(ionRouter.navigate).toHaveBeenCalledWith('/tabs/menu/badan/tidur/8/ubah', 'forward', 'push')
  })

  it('sleepEdit: back label Detail, filled form, sub = long date; unknown id → not found', async () => {
    const w = await mountSub({ view: 'sleepEdit', params: { id: '8' } })
    expect(w.find('[data-test="back"]').text()).toBe('Detail')
    expect(w.find('h1').text()).toContain('Ubah tidur.')
    expect(w.find('[data-test="sub"]').text()).toMatch(/^(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu), \d{1,2} \w+$/)
    expect(w.find('[data-test="bedAt"]').element.value).toBe('23:30')
    const gone = await mountSub({ view: 'sleepEdit', params: { id: '99' } })
    expect(gone.find('[data-test="gone"]').text()).toBe('Data tidurnya nggak ketemu. Mungkin udah dihapus.')
  })

  it('sleep form "Liat yang udah ada" opens that sleep detail route', async () => {
    const w = await mountSub({ view: 'sleepManual' })
    w.findComponent({ name: 'BadanSleepForm' }).vm.$emit('open', 3)
    expect(ionRouter.navigate).toHaveBeenCalledWith('/tabs/menu/badan/tidur/3', 'forward', 'push')
  })

  it('wide screens: throws a sleep view to the main page as a panel', async () => {
    await mountSub({ view: 'sleepDetail', params: { id: '8' }, width: 900 })
    willEnter.forEach((cb) => cb())
    expect(ionRouter.navigate).toHaveBeenCalledWith('/tabs/menu/badan?panel=sleepDetail&id=8', 'back', 'replace')
  })

  it('sleepUpload: title/sub per stage, Isi manual replaces with the sleep manual route, open goes to the sleep detail', async () => {
    const w = await mountSub({ view: 'sleepUpload' })
    expect(w.find('h1').text()).toContain('Upload tidur.')
    expect(w.find('[data-test="sub"]').text()).toBe('Dari gambar Huawei Health.')
    expect(w.find('[data-test="back"]').text()).toBe('Badan')
    const up = w.findComponent({ name: 'BadanSleepUpload' })
    up.vm.$emit('stage', 'load')
    await flushPromises()
    expect(w.find('[data-test="sub"]').text()).toBe('Bentar ya.')
    up.vm.$emit('stage', 'fail')
    await flushPromises()
    expect(w.find('[data-test="sub"]').text()).toBe('Gambarnya nggak bisa dibaca.')
    up.vm.$emit('stage', 'result')
    await flushPromises()
    expect(w.find('h1').text()).toContain('Hasil bacaan tidur.')
    expect(w.find('[data-test="sub"]').text()).toBe('Cek dulu angkanya, terus Simpen.')
    up.vm.$emit('manual')
    expect(ionRouter.navigate).toHaveBeenLastCalledWith('/tabs/menu/badan/tidur/catat', 'forward', 'replace')
    up.vm.$emit('open', 3)
    expect(ionRouter.navigate).toHaveBeenLastCalledWith('/tabs/menu/badan/tidur/3', 'forward', 'push')
    up.vm.$emit('done', 'Data tidur kesimpen ✓')
    await flushPromises()
    expect(ionRouter.back).toHaveBeenCalled()
    expect(toastCreate.mock.calls.at(-1)[0].message).toBe('Data tidur kesimpen ✓')
  })

  it('wide screens: throws sleepUpload to the main page as a panel', async () => {
    await mountSub({ view: 'sleepUpload', width: 900 })
    willEnter.forEach((cb) => cb())
    expect(ionRouter.navigate).toHaveBeenCalledWith('/tabs/menu/badan?panel=sleepUpload', 'back', 'replace')
  })
})
