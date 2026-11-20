import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/lib/api.js'
import { setBadanApi } from '@/stores/badan.js'
import BadanSleepUpload from './BadanSleepUpload.vue'

const toast = vi.hoisted(() => vi.fn())
vi.mock('@/lib/personalForm.js', async (importOriginal) => ({ ...(await importOriginal()), showToast: toast }))
const resize = vi.hoisted(() => vi.fn())
vi.mock('@/lib/imageResize.js', () => ({ resizeToWidth: resize }))

const read = { sleptOn: '2026-11-19', bedAt: '23:30', wakeAt: '06:10', totalMin: 400, deepMin: 120, lightMin: 220, remMin: 60, score: 87, awakeCount: 0, avgHr: 67, avgHrv: 65, check: ['avgHrv', 'score'] }
const blob = new Blob(['jpeg-kecil'], { type: 'image/jpeg' })

let api
let mounted
function make(scan) {
  api = { get: vi.fn(async () => ({ weighings: [], target: null, activity: null, sleeps: [] })), post: vi.fn(scan), patch: vi.fn(), put: vi.fn(), del: vi.fn() }
  setBadanApi(api)
  setActivePinia(createPinia())
  mounted = mount(BadanSleepUpload, { attachTo: document.body })
  return mounted
}
async function pick(w) {
  const input = w.find('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [new File(['gambar-asli-gede'], 'IMG_5102.jpg', { type: 'image/jpeg' })], configurable: true })
  await input.trigger('change')
  await flushPromises()
}

beforeEach(() => {
  resize.mockReset().mockResolvedValue(blob)
  toast.mockReset()
  URL.createObjectURL = vi.fn(() => 'blob:tidur')
  URL.revokeObjectURL = vi.fn()
})
afterEach(() => mounted?.unmount())

describe('BadanSleepUpload', () => {
  it('starts on pick: Huawei Health texts, file input without capture', () => {
    const w = make(async () => read)
    const input = w.find('input[type="file"]')
    expect(input.attributes('accept')).toBe('image/*')
    expect(input.attributes('capture')).toBeUndefined()
    expect(w.text()).toContain('Pilih gambar tidur')
    expect(w.text()).toContain('Gambar panjang hasil Share dari Huawei Health')
    expect(w.text()).toContain('Huawei Health')
    expect(w.text()).toContain('Gambarnya nggak disimpen, cuma angkanya.')
    expect(w.emitted('stage')?.at(-1)).toEqual(['pick'])
    // kartu Caranya dibungkus shell kayak mockup sl-pick
    expect(w.get('[data-test="steps"]').classes()).toContain('shell')
    expect(w.get('[data-test="steps"]').find('.b-core .bu-steps').exists()).toBe(true)
  })

  it('reads the resized (small) blob via /body/sleeps/scan and shows the result form with yellow fields', async () => {
    const w = make(async () => read)
    await pick(w)
    expect(resize).toHaveBeenCalledTimes(1)
    expect(resize.mock.calls[0][1]).toBe(1080)
    expect(api.post.mock.calls[0][0]).toBe('/body/sleeps/scan')
    const sent = api.post.mock.calls[0][1].get('photo')
    expect(sent.size).toBe(blob.size)
    expect(w.find('[data-test="form"]').exists()).toBe(true)
    expect(w.find('[data-test="warnsum"]').text()).toContain('2 angka kurang yakin')
    expect(w.find('[data-k="avgHrv"]').classes()).toContain('warn')
    expect(w.emitted('stage').at(-1)).toEqual(['result'])
    expect(w.find('img').attributes('src')).toBe('blob:tidur')
    expect(w.text()).toContain('Gambar panjang dari Huawei Health')
  })

  it('shows the loading text while reading', async () => {
    let release
    const w = make(() => new Promise((r) => (release = r)))
    await pick(w)
    expect(w.find('[data-test="loading"]').exists()).toBe(true)
    expect(w.text()).toContain('Lagi baca angkanya…')
    expect(w.text()).toContain('Biasanya 3–5 detik')
    expect(w.emitted('stage').at(-1)).toEqual(['load'])
    release(read)
    await flushPromises()
  })

  it('502 → Nggak kebaca; Baca ulang resends the same blob', async () => {
    const scan = vi.fn().mockRejectedValueOnce(new ApiError('Gambar tidurnya nggak kebaca. Coba Baca ulang atau isi manual ya.', 502)).mockResolvedValueOnce(read)
    const w = make(async (_u, body) => scan(body.get('photo')))
    await pick(w)
    expect(w.find('[data-test="fail"]').text()).toContain('Nggak kebaca')
    expect(w.find('[data-test="fail"]').text()).toContain('Pastiin gambarnya hasil Share dari Huawei Health')
    expect(w.emitted('stage').at(-1)).toEqual(['fail'])
    expect(w.find('[data-test="another"]').exists()).toBe(true)
    expect(w.find('[data-test="manual"]').exists()).toBe(true)
    await w.find('[data-test="reread"]').trigger('click')
    await flushPromises()
    expect(scan).toHaveBeenCalledTimes(2)
    expect(resize).toHaveBeenCalledTimes(1)
    expect(scan.mock.calls[1][0].size).toBe(scan.mock.calls[0][0].size)
    expect(w.find('[data-test="form"]').exists()).toBe(true)
  })

  it('429 → server message about the quota, Baca ulang & Gambar lain hidden, Isi manual asks for manual', async () => {
    const msg = 'Jatah baca gambar hari ini udah abis (30×). Isi manual dulu ya.'
    const w = make(async () => { throw new ApiError(msg, 429) })
    await pick(w)
    expect(w.text()).toContain('Belum bisa baca gambar')
    expect(w.text()).toContain(msg)
    expect(w.find('[data-test="reread"]').exists()).toBe(false)
    expect(w.find('[data-test="another"]').exists()).toBe(false)
    await w.find('[data-test="manual"]').trigger('click')
    expect(w.emitted('manual')).toHaveLength(1)
  })

  it('503 → server message, no Baca ulang', async () => {
    const w = make(async () => { throw new ApiError('Baca gambar belum disetel.', 503) })
    await pick(w)
    expect(w.text()).toContain('Baca gambar belum disetel.')
    expect(w.find('[data-test="reread"]').exists()).toBe(false)
  })

  it('network error → shows the connection message and still allows Baca ulang', async () => {
    const w = make(async () => { throw new ApiError('Nggak bisa nyambung ke server.', 0) })
    await pick(w)
    expect(w.text()).toContain('Nggak bisa nyambung ke server.')
    expect(w.find('[data-test="reread"]').exists()).toBe(true)
  })

  it('422 → server message, Gambar lain goes back to pick (no Baca ulang)', async () => {
    const w = make(async () => { throw new ApiError('Gambarnya nggak valid.', 422) })
    await pick(w)
    expect(w.find('[data-test="reread"]').exists()).toBe(false)
    expect(w.text()).toContain('Gambarnya nggak valid.')
    await w.find('[data-test="another"]').trigger('click')
    expect(w.text()).toContain('Pilih gambar tidur')
    expect(w.emitted('stage').at(-1)).toEqual(['pick'])
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:tidur')
  })

  it('Baca ulang from the result: toast counts what is left, or says all clear', async () => {
    const w = make(vi.fn().mockResolvedValueOnce(read).mockResolvedValueOnce({ ...read, check: ['avgHrv'] }).mockResolvedValueOnce({ ...read, check: [] }))
    await pick(w)
    await w.find('[data-test="reread"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-test="warnsum"]').text()).toContain('1 angka kurang yakin')
    expect(toast).toHaveBeenLastCalledWith('Dibaca ulang · tinggal 1 angka yang perlu dicek')
    await w.find('[data-test="reread"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-test="oksum"]').exists()).toBe(true)
    expect(toast).toHaveBeenLastCalledWith('Dibaca ulang · semua angka udah jelas')
  })

  it('shows reading number on the second read while loading', async () => {
    let release
    const w = make(vi.fn().mockResolvedValueOnce(read).mockImplementationOnce(() => new Promise((r) => (release = r))))
    await pick(w)
    await w.find('[data-test="reread"]').trigger('click')
    expect(w.text()).toContain('bacaan ke-2')
    release(read)
    await flushPromises()
  })

  it('saving the result form passes the server message up as done', async () => {
    const w = make(async (url) => (url === '/body/sleeps/scan' ? read : { sleep: { id: 9 }, message: 'Data tidur kesimpen ✓' }))
    await pick(w)
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(api.post.mock.calls[1][0]).toBe('/body/sleeps')
    expect(api.post.mock.calls[1][1]).toMatchObject({ sleptOn: '2026-11-19', totalMin: 400, source: 'scan' })
    expect(w.emitted('done')).toEqual([['Data tidur kesimpen ✓']])
  })

  it('toggles the image strip', async () => {
    const w = make(async () => read)
    await pick(w)
    expect(w.find('[data-test="imgfull"]').classes()).not.toContain('show')
    await w.find('[data-test="toggle-img"]').trigger('click')
    expect(w.find('[data-test="imgfull"]').classes()).toContain('show')
    expect(w.find('[data-test="toggle-img"]').text()).toBe('Tutup')
  })

  it('revokes the object url on unmount; a stale scan after unmount does not throw', async () => {
    let release
    const w = make(() => new Promise((r) => (release = r)))
    await pick(w)
    w.unmount()
    mounted = null
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:tidur')
    release(read)
    await expect(flushPromises()).resolves.not.toThrow()
  })

  it('a stale scan response does not overwrite a newer pick', async () => {
    const releases = []
    const w = make(() => new Promise((r) => releases.push(r)))
    await pick(w)
    await pick(w)
    releases[0]({ ...read, totalMin: 61, check: [] })
    await flushPromises()
    expect(w.find('[data-test="form"]').exists()).toBe(false)
    releases[1](read)
    await flushPromises()
    expect(w.find('[data-test="f-total-h"]').element.value).toBe('6')
    expect(w.find('[data-test="f-total-m"]').element.value).toBe('40')
  })
})
