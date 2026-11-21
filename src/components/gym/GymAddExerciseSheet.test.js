import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/lib/api.js'
import { setGymApi, setGymStorage, useGymStore } from '@/stores/gym.js'
import GymAddExerciseSheet from './GymAddExerciseSheet.vue'

const toastCreate = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({ ...(await importOriginal()), toastController: { create: toastCreate } }))

const ex = (id, name, last = null) => ({ id, name, restSec: 120, step: 2.5, dumbbell: false, last, record: null })
const exercises = [
  ex(1, 'Incline Dumbbell Press', { on: '2026-11-16', sets: [[22.5, 8]] }),
  ex(2, 'Pec Deck', { on: '2026-11-16', sets: [[50, 10]] }),
  ex(3, 'Barbell Squat', { on: '2026-11-18', sets: [[60, 5], [62.5, 5]] }),
  ex(4, 'Lat Pull Down', null),
  ex(5, 'Hip Thrust', { on: '2026-11-10', sets: [[40, 12]] }),
  ex(6, 'Cable Fly', null),
]
const programs = [
  { key: 'push', exerciseIds: [1, 2], lastOn: null },
  { key: 'pull', exerciseIds: [4], lastOn: null },
  { key: 'leg', exerciseIds: [3], lastOn: null },
  { key: 'upper', exerciseIds: [], lastOn: null },
  { key: 'lower', exerciseIds: [3], lastOn: null },
]

let api, memory
const mounted = []
function memStorage() {
  const m = new Map()
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }
}
async function mountSheet(props = {}) {
  memory = memStorage()
  setGymStorage(memory)
  api = { get: vi.fn(async () => ({ programs, exercises, active: null })), post: vi.fn(), patch: vi.fn(), put: vi.fn(), del: vi.fn() }
  setGymApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  const w = mount(GymAddExerciseSheet, {
    props: { open: true, wide: false, program: 'push', programs, exercises, exclude: [1, 2], ...props },
    global: { plugins: [pinia] },
    attachTo: document.body,
  })
  mounted.push(w)
  await flushPromises()
  return w
}
const sheet = () => document.querySelector('[data-test="add-sheet"]')
const rows = () => [...sheet().querySelectorAll('[data-addex]')].map((b) => b.querySelector('b').textContent)
async function search(w, q) {
  const inp = sheet().querySelector('[data-test="add-q"]')
  inp.value = q
  inp.dispatchEvent(new Event('input'))
  await flushPromises()
}

beforeEach(() => {
  toastCreate.mockReset().mockResolvedValue({ present: vi.fn() })
  document.body.appendChild(document.createElement('ion-app'))
})
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  document.querySelectorAll('ion-app').forEach((e) => e.remove())
})

describe('GymAddExerciseSheet', () => {
  it('judul + "Pernah lo pake" (non-program yang punya riwayat) + "Dari program lain"', async () => {
    await mountSheet()
    expect(sheet().textContent).toContain('Tambah gerakan')
    expect(sheet().textContent).toContain('Cuma buat sesi ini — program Push nggak berubah. Gerakannya punya riwayat sendiri.')
    const groups = [...sheet().querySelectorAll('.gy-fgroup')].map((g) => g.textContent)
    expect(groups).toEqual(['Pernah lo pake', 'Dari program lain'])
    expect(rows()).toEqual(['Hip Thrust', 'Barbell Squat', 'Lat Pull Down'])
    expect(sheet().textContent).toContain('terakhir 18 Nov · 62,5 × 5')
    expect(sheet().textContent).toContain('belum ada riwayat')
  })

  it('cari nyaring daftar + nongol "Bikin “…”" kalau nggak ada yang namanya persis', async () => {
    const w = await mountSheet()
    await search(w, 'squ')
    expect(rows()).toEqual(['Barbell Squat'])
    expect(sheet().querySelector('[data-test="new-ex"]').textContent).toContain('Bikin “squ”')
    await search(w, '  barbell   squat ')
    expect(sheet().querySelector('[data-test="new-ex"]')).toBeNull()
  })

  it('gerakan non-program tanpa riwayat cuma nongol pas dicari', async () => {
    const w = await mountSheet()
    expect(rows()).not.toContain('Cable Fly')
    await search(w, 'cable')
    expect(rows()).toEqual(['Cable Fly'])
  })

  it('tap gerakan → emit add', async () => {
    const w = await mountSheet()
    sheet().querySelector('[data-addex="5"]').click()
    expect(w.emitted('add')[0][0]).toMatchObject({ id: 5, name: 'Hip Thrust' })
  })

  it('Bikin → POST nama, emit gerakan baru', async () => {
    const w = await mountSheet()
    api.post.mockResolvedValue(ex(30, 'Dips'))
    await search(w, 'Dips')
    sheet().querySelector('[data-test="new-ex"]').click()
    await flushPromises()
    expect(api.post).toHaveBeenCalledWith('/gym/exercises', { name: 'Dips' })
    expect(w.emitted('add')[0][0]).toMatchObject({ id: 30, name: 'Dips' })
  })

  it('Bikin 409 → pake gerakan yang udah ada', async () => {
    const w = await mountSheet()
    api.post.mockRejectedValue(new ApiError('Udah ada gerakan dengan nama itu.', 409, { existing: ex(9, 'Dips') }))
    await search(w, 'dips')
    sheet().querySelector('[data-test="new-ex"]').click()
    await flushPromises()
    expect(w.emitted('add')[0][0]).toMatchObject({ id: 9 })
  })

  it('Bikin gagal karena nggak ada sinyal → toast khusus, nggak emit', async () => {
    const w = await mountSheet()
    api.post.mockRejectedValue(new ApiError('Nggak bisa nyambung ke server.', 0))
    await search(w, 'Dips')
    sheet().querySelector('[data-test="new-ex"]').click()
    await flushPromises()
    expect(w.emitted('add')).toBeUndefined()
    expect(toastCreate).toHaveBeenCalledWith(expect.objectContaining({ message: 'Gerakan baru butuh sinyal. Pilih gerakan yang udah ada dulu ya.' }))
  })

  it('Bikin ditolak server (422) → toast pesan servernya', async () => {
    const w = await mountSheet()
    api.post.mockRejectedValue(new ApiError('Maksimal 60 karakter.', 422))
    await search(w, 'Dips')
    sheet().querySelector('[data-test="new-ex"]').click()
    await flushPromises()
    expect(toastCreate).toHaveBeenCalledWith(expect.objectContaining({ message: 'Maksimal 60 karakter.' }))
  })

  it('Bikin → emit langsung abis POST (nggak nunggu GET /gym), gerakan baru masuk daftar store + cache', async () => {
    const w = await mountSheet()
    const store = useGymStore()
    store.data = { programs, exercises: [...exercises], active: null }
    api.get.mockImplementation(() => new Promise(() => {}))
    api.post.mockResolvedValue(ex(30, 'Dips'))
    await search(w, 'Dips')
    sheet().querySelector('[data-test="new-ex"]').click()
    await flushPromises()
    expect(w.emitted('add')[0][0]).toMatchObject({ id: 30 })
    expect(store.exercises.map((x) => x.id)).toContain(30)
    expect(JSON.parse(memory.getItem('aio-gym-exercises')).map((x) => x.id)).toContain(30)
    expect(api.get).toHaveBeenCalledWith('/gym')
  })

  it('nama persis sama dengan gerakan yang udah di sesi → baris "Udah ada di sesi ini", tap = emit add gerakan itu', async () => {
    const w = await mountSheet()
    await search(w, 'incline dumbbell press')
    const row = sheet().querySelector('[data-test="in-session"]')
    expect(row.textContent).toContain('Udah ada di sesi ini')
    expect(row.textContent).toContain('Incline Dumbbell Press')
    expect(sheet().querySelector('[data-test="new-ex"]')).toBeNull()
    row.click()
    expect(w.emitted('add')[0][0]).toMatchObject({ id: 1 })
    await search(w, 'dumbbell')
    expect(sheet().querySelector('[data-test="in-session"]')).toBeNull()
  })

  it('✕ / scrim → close', async () => {
    const w = await mountSheet()
    sheet().querySelector('[data-test="add-close"]').click()
    document.querySelector('.gy-scrim').click()
    expect(w.emitted('close')).toHaveLength(2)
  })

  it('ditutup → kolom cari dikosongin', async () => {
    const w = await mountSheet()
    await search(w, 'squ')
    await w.setProps({ open: false })
    await w.setProps({ open: true })
    expect(sheet().querySelector('[data-test="add-q"]').value).toBe('')
  })
})
