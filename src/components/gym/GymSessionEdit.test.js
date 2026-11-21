import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/lib/api.js'
import { setGymApi, setGymStorage, useGymStore } from '@/stores/gym.js'
import { makeReport } from '@/test/gymReportFixture.js'
import GymSessionEdit from './GymSessionEdit.vue'

const toast = vi.hoisted(() => ({ create: vi.fn() }))
vi.mock('@ionic/vue', async (importOriginal) => ({ ...(await importOriginal()), toastController: { create: toast.create } }))

const mounted = []
let api
function mk(report = makeReport()) {
  setGymStorage({ getItem: () => null, setItem: () => {}, removeItem: () => {} })
  api = { get: vi.fn(async () => ({ programs: [], exercises: [], active: null, recent: [], week: { days: [], count: 0, minutes: 0 }, totalSessions: 0, firstOn: null, mini: null })), post: vi.fn(), patch: vi.fn(), put: vi.fn(async () => makeReport()), del: vi.fn() }
  setGymApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  const w = mount(GymSessionEdit, { props: { report }, global: { plugins: [pinia] }, attachTo: document.body })
  mounted.push(w)
  return w
}
beforeEach(() => {
  toast.create.mockReset().mockResolvedValue({ present: vi.fn() })
})
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

const q = (w, t) => w.find(`[data-test="${t}"]`)
const rows = (w) => w.findAll('[data-test="eset"]')

describe('GymSessionEdit', () => {
  it('jam mulai/selesai (WIB) + kg/reps tiap set keisi dari sesi', () => {
    const w = mk()
    expect(q(w, 'start').element.value).toBe('18:05')
    expect(q(w, 'end').element.value).toBe('19:17')
    expect(q(w, 'start').attributes('type')).toBe('time')
    expect(rows(w)).toHaveLength(6)
    expect(rows(w)[0].find('[data-test="kg"]').element.value).toBe('25')
    expect(rows(w)[0].find('[data-test="reps"]').element.value).toBe('8')
    expect(w.text()).toContain('Incline Dumbbell Press')
    expect(w.text()).toContain('PR, grafik, dan riwayat ikut dihitung ulang.')
  })

  it('simpen: PUT jam (ISO UTC) + set yang diubah + yang dihapus; koma desimal kebaca', async () => {
    const w = mk()
    await q(w, 'start').setValue('18:00')
    await rows(w)[0].find('[data-test="kg"]').setValue('27,5')
    await rows(w)[1].find('[data-test="reps"]').setValue('9')
    await rows(w)[5].find('[data-test="del"]').trigger('click')
    await q(w, 'form').trigger('submit')
    await flushPromises()
    expect(api.put).toHaveBeenCalledTimes(1)
    const [url, body] = api.put.mock.calls[0]
    expect(url).toBe('/gym/sessions/20')
    expect(body.startedAt).toBe('2026-11-23T11:00:00.000Z')
    expect(body.endedAt).toBe('2026-11-23T12:17:00.000Z')
    expect(body.sets).toHaveLength(5)
    expect(body.sets[0]).toEqual({ id: 1, weight: 27.5, reps: 8 })
    expect(body.sets[1]).toEqual({ id: 2, weight: 25, reps: 9 })
    expect(body.deleteSetIds).toEqual([6])
  })

  it('🗑 bisa dibatalin sebelum simpen', async () => {
    const w = mk()
    await rows(w)[2].find('[data-test="del"]').trigger('click')
    expect(rows(w)[2].classes()).toContain('gone')
    await rows(w)[2].find('[data-test="del"]').trigger('click')
    expect(rows(w)[2].classes()).not.toContain('gone')
    await q(w, 'form').trigger('submit')
    await flushPromises()
    expect(api.put.mock.calls[0][1].deleteSetIds).toEqual([])
    expect(api.put.mock.calls[0][1].sets).toHaveLength(6)
  })

  it('sesi lewat tengah malam: tanggal selesai (hari berikutnya) dipertahanin', async () => {
    const w = mk(makeReport({ session: { ...makeReport().session, startedAt: '2026-11-17T16:30:00.000Z', endedAt: '2026-11-17T17:40:00.000Z' } }))
    expect(q(w, 'end').element.value).toBe('00:40')
    await q(w, 'form').trigger('submit')
    await flushPromises()
    expect(api.put.mock.calls[0][1].endedAt).toBe('2026-11-17T17:40:00.000Z')
  })

  it('angka ngaco → pesan di bawah baris, nggak kirim', async () => {
    const w = mk()
    await rows(w)[0].find('[data-test="kg"]').setValue('abc')
    await rows(w)[1].find('[data-test="reps"]').setValue('0')
    await q(w, 'form').trigger('submit')
    await flushPromises()
    expect(api.put).not.toHaveBeenCalled()
    expect(rows(w)[0].text()).toContain('Bebannya harus lebih dari 0.')
    expect(rows(w)[1].text()).toContain('Repsnya harus 1–100.')
  })

  it('jam kosong → pesan di bawah kolom jam', async () => {
    const w = mk()
    await q(w, 'end').setValue('')
    await q(w, 'form').trigger('submit')
    await flushPromises()
    expect(api.put).not.toHaveBeenCalled()
    expect(q(w, 'err-endedAt').exists()).toBe(true)
  })

  it('422 per field dari server tampil di bawah kolom yang pas', async () => {
    const w = mk()
    api.put.mockRejectedValue(new ApiError('x', 422, { startedAt: 'Jam mulai nggak boleh setelah set pertama.', endedAt: 'Jam selesai nggak boleh lewat dari sekarang.', sets: 'Minimal 1 set. Mau buang sesinya? Pake Hapus sesi.' }))
    await q(w, 'form').trigger('submit')
    await flushPromises()
    expect(q(w, 'err-startedAt').text()).toBe('Jam mulai nggak boleh setelah set pertama.')
    expect(q(w, 'err-endedAt').text()).toBe('Jam selesai nggak boleh lewat dari sekarang.')
    expect(q(w, 'err-sets').text()).toBe('Minimal 1 set. Mau buang sesinya? Pake Hapus sesi.')
    expect(w.emitted('saved')).toBeUndefined()
  })

  it('409 (sesi belum selesai) → toast pesan server', async () => {
    const w = mk()
    api.put.mockRejectedValue(new ApiError('Sesi ini belum selesai.', 409))
    await q(w, 'form').trigger('submit')
    await flushPromises()
    expect(toast.create).toHaveBeenCalledWith(expect.objectContaining({ message: 'Sesi ini belum selesai.' }))
  })

  it('sukses: toast "Perubahan kesimpen ✓" + emit saved', async () => {
    const w = mk()
    await q(w, 'form').trigger('submit')
    await flushPromises()
    expect(toast.create).toHaveBeenCalledWith(expect.objectContaining({ message: 'Perubahan kesimpen ✓' }))
    expect(w.emitted('saved')).toHaveLength(1)
    expect(useGymStore().reports[20]).toBeDefined()
  })

  it('lagi nyimpen: tombol mati & nggak kirim dobel', async () => {
    const w = mk()
    api.put.mockImplementation(() => new Promise(() => {}))
    await q(w, 'form').trigger('submit')
    await q(w, 'form').trigger('submit')
    expect(api.put).toHaveBeenCalledTimes(1)
    expect(q(w, 'save').attributes('disabled')).toBeDefined()
  })

  it('jam nggak disentuh dikirim balik persis (detik ikut), cuma kg yang berubah', async () => {
    const base = makeReport()
    const r = makeReport({ session: { ...base.session, startedAt: '2026-11-23T11:05:12.000Z', endedAt: '2026-11-23T12:17:45.000Z' } })
    const w = mk(r)
    await rows(w)[0].find('[data-test="kg"]').setValue('27,5')
    await q(w, 'form').trigger('submit')
    await flushPromises()
    const body = api.put.mock.calls[0][1]
    expect(body.startedAt).toBe('2026-11-23T11:05:12.000Z')
    expect(body.endedAt).toBe('2026-11-23T12:17:45.000Z')
  })

  it('jam selesai diubah lewat tengah malam (23.55 → 00.10) → tanggal ikut maju ke hari berikutnya', async () => {
    const base = makeReport()
    const w = mk(makeReport({ session: { ...base.session, startedAt: '2026-11-17T16:00:00.000Z', endedAt: '2026-11-17T16:55:00.000Z' } }))
    await q(w, 'end').setValue('00:10')
    await q(w, 'form').trigger('submit')
    await flushPromises()
    expect(api.put.mock.calls[0][1].endedAt).toBe('2026-11-17T17:10:00.000Z') // 18 Nov 00.10 WIB
  })

  it('jam yang diubah dihitung dari HH:MM, yang lain tetep asli', async () => {
    const base = makeReport()
    const w = mk(makeReport({ session: { ...base.session, startedAt: '2026-11-23T11:05:12.000Z', endedAt: '2026-11-23T12:17:45.000Z' } }))
    await q(w, 'end').setValue('19:30')
    await q(w, 'form').trigger('submit')
    await flushPromises()
    const body = api.put.mock.calls[0][1]
    expect(body.startedAt).toBe('2026-11-23T11:05:12.000Z')
    expect(body.endedAt).toBe('2026-11-23T12:30:00.000Z')
  })
})
