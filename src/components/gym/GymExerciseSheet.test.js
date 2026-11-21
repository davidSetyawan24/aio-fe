import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/lib/api.js'
import { setGymApi, setGymStorage, useGymStore } from '@/stores/gym.js'
import GymExerciseSheet from './GymExerciseSheet.vue'

const toastCreate = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({ ...(await importOriginal()), toastController: { create: toastCreate } }))

const exercise = { id: 3, name: 'Barbell Squat', restSec: 120, step: 2.5, dumbbell: false, last: null, record: null }
const mounted = []
let api
function mountSheet(props = {}) {
  setGymStorage({ getItem: () => null, setItem: () => {}, removeItem: () => {} })
  api = { get: vi.fn(async () => ({ programs: [], exercises: [], active: null, recent: [], week: { days: [], count: 0, minutes: 0 }, totalSessions: 0, firstOn: null, mini: null })), patch: vi.fn(async (u, b) => ({ exercise: { ...exercise, ...b } })), post: vi.fn(), put: vi.fn(), del: vi.fn() }
  setGymApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  useGymStore()
  const w = mount(GymExerciseSheet, { props: { open: true, exercise, program: 'leg', ...props }, global: { plugins: [pinia] }, attachTo: document.body })
  mounted.push(w)
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

describe('GymExerciseSheet', () => {
  it('nampilin setelan sekarang: nama, istirahat & langkah kepilih, saklar', () => {
    mountSheet({ exercise: { ...exercise, restSec: 150, step: 5, dumbbell: true } })
    expect(q('[data-test="name"]').value).toBe('Barbell Squat')
    expect(q('[data-rest="150"]').classList.contains('on')).toBe(true)
    expect([...document.body.querySelectorAll('[data-rest]')].map((b) => b.textContent.trim())).toEqual(['1 mnt', '1,5 mnt', '2 mnt', '2,5 mnt', '3 mnt', '4 mnt', '5 mnt'])
    expect(q('[data-step="5"]').classList.contains('on')).toBe(true)
    expect([...document.body.querySelectorAll('[data-step]')].map((b) => b.textContent.trim())).toEqual(['1 kg', '2 kg', '2,5 kg', '5 kg', '10 kg'])
    expect(q('[data-test="dumbbell"] .gy-sw').classList.contains('on')).toBe(true)
    expect(q('[data-test="remove"]').textContent).toContain('Hapus dari Leg')
  })

  it('Simpen → PATCH isi form, toast "Kesimpen ✓", sheet nutup', async () => {
    const w = mountSheet()
    const input = q('[data-test="name"]')
    input.value = '  Back Squat '
    input.dispatchEvent(new Event('input'))
    q('[data-rest="180"]').click()
    q('[data-step="5"]').click()
    q('[data-test="dumbbell"]').click()
    await w.vm.$nextTick()
    q('[data-test="save"]').click()
    await flushPromises()
    expect(api.patch).toHaveBeenCalledWith('/gym/exercises/3', { name: 'Back Squat', restSec: 180, step: 5, dumbbell: true })
    expect(toastCreate.mock.calls[0][0].message).toBe('Kesimpen ✓')
    expect(w.emitted('close')).toHaveLength(1)
  })

  it('nama kosong → pesan di bawah kolom, nggak ngirim', async () => {
    const w = mountSheet()
    const input = q('[data-test="name"]')
    input.value = '   '
    input.dispatchEvent(new Event('input'))
    q('[data-test="save"]').click()
    await flushPromises()
    expect(api.patch).not.toHaveBeenCalled()
    expect(q('[data-test="name-err"]').textContent).toBe('Nama gerakannya wajib diisi.')
    expect(w.emitted('close')).toBeUndefined()
  })

  it('422 nama bentrok → pesan BE nongol di bawah kolom, sheet tetep kebuka', async () => {
    const w = mountSheet()
    api.patch.mockRejectedValueOnce(new ApiError('x', 422, { name: ['Udah ada gerakan dengan nama itu.'] }))
    q('[data-test="save"]').click()
    await flushPromises()
    expect(q('[data-test="name-err"]').textContent).toBe('Udah ada gerakan dengan nama itu.')
    expect(w.emitted('close')).toBeUndefined()
  })

  it('"Hapus dari Leg" → emit remove', async () => {
    const w = mountSheet()
    q('[data-test="remove"]').click()
    expect(w.emitted('remove')).toHaveLength(1)
  })
})
