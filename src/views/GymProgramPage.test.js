import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ApiError } from '@/lib/api.js'
import { setGymApi, setGymStorage } from '@/stores/gym.js'
import GymProgramPage from './GymProgramPage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
const toastCreate = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({ ...(await importOriginal()), useIonRouter: () => ionRouter, toastController: { create: toastCreate } }))

const ex = (id, name, extra = {}) => ({ id, name, restSec: 120, step: 2.5, dumbbell: false, last: null, record: null, ...extra })
const exercises = [
  ex(1, 'Incline Dumbbell Press', { dumbbell: true }),
  ex(2, 'Pec Deck', { restSec: 90, step: 5 }),
  ex(3, 'Barbell Squat', { restSec: 300 }),
  ex(4, 'Lat Pull Down'),
  ex(5, 'Cable Fly'),
]
const programs = () => [
  { key: 'push', exerciseIds: [1, 2], lastOn: null },
  { key: 'pull', exerciseIds: [4], lastOn: null },
  { key: 'leg', exerciseIds: [3], lastOn: null },
  { key: 'upper', exerciseIds: [4, 1], lastOn: null },
  { key: 'lower', exerciseIds: [3], lastOn: null },
]
const mounted = []
let api
function stubMedia(width) {
  window.matchMedia = (query) => {
    const min = Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0)
    return { matches: width >= min, addEventListener: () => {}, removeEventListener: () => {} }
  }
}
async function mountPage({ width = 390, putFail = null } = {}) {
  stubMedia(width)
  setGymStorage({ getItem: () => null, setItem: () => {}, removeItem: () => {} })
  api = {
    get: vi.fn(async () => ({ programs: programs(), exercises, active: null, recent: [], week: { days: [], count: 0, minutes: 0 }, totalSessions: 0, firstOn: null, mini: null })),
    put: vi.fn(async (u, b) => {
      if (putFail) throw putFail
      return { program: { key: u.split('/').pop(), exerciseIds: b.exerciseIds } }
    }),
    patch: vi.fn(async (u, b) => ({ exercise: { ...exercises[0], ...b } })),
    post: vi.fn(async (u, b) => ({ exercise: ex(9, b.name) })),
    del: vi.fn(),
  }
  setGymApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/tabs/menu/gym/program', component: GymProgramPage }] })
  router.push('/tabs/menu/gym/program')
  await router.isReady()
  const w = mount(GymProgramPage, { global: { plugins: [pinia, router] }, attachTo: document.body })
  mounted.push(w)
  await flushPromises()
  return w
}
const q = (s) => document.body.querySelector(s)
beforeEach(() => {
  document.body.appendChild(document.createElement('ion-app'))
  toastCreate.mockResolvedValue({ present: vi.fn() })
})
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  document.querySelectorAll('ion-app').forEach((e) => e.remove())
  vi.clearAllMocks()
})
const names = (w, key) => w.findAll(`[data-col="${key}"] [data-test="prow"] b`).map((b) => b.text())

describe('GymProgramPage (HP)', () => {
  it('5 chip latihan, satu daftar (default Push) dengan baris "istirahat 2 mnt · ±2,5 kg · dumbbell"', async () => {
    const w = await mountPage()
    expect(w.findAll('[data-prog]').map((b) => b.text())).toEqual(['💪Push', '🧗Pull', '🦵Leg', '🏋️Upper', '🏃Lower'])
    expect(w.findAll('[data-col]')).toHaveLength(1)
    expect(names(w, 'push')).toEqual(['Incline Dumbbell Press', 'Pec Deck'])
    const subs = w.findAll('[data-test="prow"] small').map((s) => s.text())
    expect(subs).toEqual(['istirahat 2 mnt · ±2,5 kg · dumbbell', 'istirahat 1,5 mnt · ±5 kg'])
  })

  it('ganti chip → daftar latihan itu; Lower nampilin catatan, yang lain nggak', async () => {
    const w = await mountPage()
    expect(w.find('[data-test="lower-note"]').exists()).toBe(false)
    await w.find('[data-prog="lower"]').trigger('click')
    expect(names(w, 'lower')).toEqual(['Barbell Squat'])
    expect(w.find('[data-test="lower-note"]').text()).toContain('Lower awalnya salinan Leg. Tambah/hapus/urutin di sini nggak ngubah Leg.')
  })

  it('chip kepotong di kanan → bayangan "masih ada" nyala; digeser mentok → ilang', async () => {
    const w = await mountPage()
    const el = w.find('.gy-pseg').element
    Object.defineProperty(el, 'scrollWidth', { configurable: true, value: 470 })
    Object.defineProperty(el, 'clientWidth', { configurable: true, value: 354 })
    el.scrollLeft = 0
    await w.find('.gy-pseg').trigger('scroll')
    expect(w.find('[data-test="pseg"]').classes()).toContain('more')
    el.scrollLeft = 116
    await w.find('.gy-pseg').trigger('scroll')
    expect(w.find('[data-test="pseg"]').classes()).not.toContain('more')
  })

  it('urutin (ion-reorder) → PUT urutan baru; urutan langsung berubah (optimistis)', async () => {
    const w = await mountPage()
    const complete = vi.fn()
    w.find('ion-reorder-group').element.dispatchEvent(new CustomEvent('ionReorderEnd', { detail: { from: 0, to: 1, complete } }))
    await w.vm.$nextTick()
    expect(names(w, 'push')).toEqual(['Pec Deck', 'Incline Dumbbell Press'])
    await flushPromises()
    expect(api.put).toHaveBeenCalledWith('/gym/programs/push', { exerciseIds: [2, 1] })
    expect(complete).toHaveBeenCalled()
  })

  it('urutin gagal → urutan balik + toast', async () => {
    const w = await mountPage({ putFail: new ApiError('Ada gerakan yang nggak ketemu.', 422) })
    w.find('ion-reorder-group').element.dispatchEvent(new CustomEvent('ionReorderEnd', { detail: { from: 0, to: 1, complete: () => {} } }))
    await flushPromises()
    expect(names(w, 'push')).toEqual(['Incline Dumbbell Press', 'Pec Deck'])
    expect(toastCreate.mock.calls.at(-1)[0].message).toBe('Ada gerakan yang nggak ketemu.')
  })

  it('tap gerakan → sheet Atur gerakan; Hapus dari Push → PUT tanpa id itu + toast', async () => {
    const w = await mountPage()
    await w.find('[data-test="prow"]').trigger('click')
    expect(q('[data-test="ex-sheet"]').getAttribute('aria-hidden')).toBe('false')
    expect(q('[data-test="name"]').value).toBe('Incline Dumbbell Press')
    q('[data-test="remove"]').click()
    await flushPromises()
    expect(api.put).toHaveBeenCalledWith('/gym/programs/push', { exerciseIds: [2] })
    expect(toastCreate.mock.calls.at(-1)[0].message).toBe('Dihapus dari Push')
    expect(q('[data-test="ex-sheet"]').getAttribute('aria-hidden')).toBe('true')
  })

  it('+ Tambah gerakan → pilih gerakan lain → PUT dengan id di ujung; yang udah ada nggak ditawarin', async () => {
    const w = await mountPage()
    await w.find('[data-test="add-ex"]').trigger('click')
    expect(q('[data-test="add-sheet"]').getAttribute('aria-hidden')).toBe('false')
    expect(q('[data-addex="1"]')).toBeNull()
    q('[data-addex="5"]').click()
    await flushPromises()
    expect(api.put).toHaveBeenCalledWith('/gym/programs/push', { exerciseIds: [1, 2, 5] })
    expect(toastCreate.mock.calls.at(-1)[0].message).toBe('Kesimpen ✓')
  })

  it('Bikin gerakan baru dari sheet → dibikin lalu masuk program', async () => {
    const w = await mountPage()
    await w.find('[data-test="add-ex"]').trigger('click')
    const input = q('[data-test="add-q"]')
    input.value = 'Skull Crusher'
    input.dispatchEvent(new Event('input'))
    await w.vm.$nextTick()
    q('[data-test="new-ex"]').click()
    await flushPromises()
    expect(api.post).toHaveBeenCalledWith('/gym/exercises', { name: 'Skull Crusher' })
    expect(api.put).toHaveBeenCalledWith('/gym/programs/push', { exerciseIds: [1, 2, 9] })
  })

  it('edit setelan gerakan → PATCH + muat ulang (gerakan yang sama di program lain ikut berubah)', async () => {
    const w = await mountPage()
    await w.find('[data-test="prow"]').trigger('click')
    q('[data-rest="180"]').click()
    q('[data-test="save"]').click()
    await flushPromises()
    expect(api.patch).toHaveBeenCalledWith('/gym/exercises/1', { name: 'Incline Dumbbell Press', restSec: 180, step: 2.5, dumbbell: true })
    expect(api.get.mock.calls.length).toBeGreaterThan(1)
  })
})

describe('GymProgramPage (PC)', () => {
  it('semua 5 latihan jadi kolom, tanpa chip', async () => {
    const w = await mountPage({ width: 1440 })
    expect(w.findAll('[data-col]').map((c) => c.attributes('data-col'))).toEqual(['push', 'pull', 'leg', 'upper', 'lower'])
    expect(w.find('[data-prog]').exists()).toBe(false)
    expect(names(w, 'upper')).toEqual(['Lat Pull Down', 'Incline Dumbbell Press'])
    expect(w.findAll('[data-test="lower-note"]')).toHaveLength(1)
  })
})
