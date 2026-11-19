import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/lib/api.js'
import { setBadanApi } from '@/stores/badan.js'
import BadanUpload from './BadanUpload.vue'

const toast = vi.hoisted(() => vi.fn())
vi.mock('@/lib/personalForm.js', async (importOriginal) => ({ ...(await importOriginal()), showToast: toast }))
const resize = vi.hoisted(() => vi.fn())
vi.mock('@/lib/imageResize.js', () => ({ resizeToWidth: resize }))

const read = { weighedOn: '2026-11-19', weighedAt: '06:42', weight: 74.9, fat: 25.6, muscle: 52.85, water: 51, visceral: 10, bone: 2.83, protein: 19.5, bmr: 1650, bmi: 27.2, score: 56, bodyType: 'thick_set', check: ['bone', 'visceral'] }
const blob = new Blob(['jpeg'], { type: 'image/jpeg' })

let api
let mounted
function make(scan) {
  api = { get: vi.fn(async () => ({ weighings: [], target: null })), post: vi.fn(scan), patch: vi.fn(), put: vi.fn(), del: vi.fn() }
  setBadanApi(api)
  setActivePinia(createPinia())
  mounted = mount(BadanUpload, { attachTo: document.body })
  return mounted
}
async function pick(w) {
  const input = w.find('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [new File(['x'], 'IMG_1.jpg', { type: 'image/jpeg' })], configurable: true })
  await input.trigger('change')
  await flushPromises()
}

beforeEach(() => {
  resize.mockReset().mockResolvedValue(blob)
  toast.mockReset()
  URL.createObjectURL = vi.fn(() => 'blob:abc')
  URL.revokeObjectURL = vi.fn()
})
afterEach(() => mounted?.unmount())

describe('BadanUpload', () => {
  it('starts on pick with a file input without capture', () => {
    const w = make(async () => read)
    const input = w.find('input[type="file"]')
    expect(input.attributes('accept')).toBe('image/*')
    expect(input.attributes('capture')).toBeUndefined()
    expect(w.text()).toContain('Pilih gambar timbangan')
    expect(w.emitted('stage')?.at(-1)).toEqual(['pick'])
  })

  it('reads the resized blob and shows the result form with yellow fields', async () => {
    const w = make(async () => read)
    await pick(w)
    expect(resize).toHaveBeenCalledTimes(1)
    expect(api.post.mock.calls[0][0]).toBe('/body/scan')
    expect(w.find('[data-test="form"]').exists()).toBe(true)
    expect(w.find('[data-test="warnsum"]').text()).toContain('2 angka kurang yakin')
    expect(w.emitted('stage').at(-1)).toEqual(['result'])
    expect(w.find('img').attributes('src')).toBe('blob:abc')
  })

  it('shows the loading text while reading', async () => {
    let release
    const w = make(() => new Promise((r) => (release = r)))
    await pick(w)
    expect(w.text()).toContain('Lagi baca angkanya…')
    expect(w.text()).toContain('Biasanya 3–5 detik')
    release(read)
    await flushPromises()
  })

  it('502 shows Nggak kebaca', async () => {
    const w = make(async () => { throw new ApiError('x', 502) })
    await pick(w)
    expect(w.text()).toContain('Nggak kebaca')
    expect(w.emitted('stage').at(-1)).toEqual(['fail'])
  })

  it('429/503 shows the BE message with Isi manual', async () => {
    const w = make(async () => { throw new ApiError('Hari ini udah 20 kali baca gambar.', 429) })
    await pick(w)
    expect(w.text()).toContain('Hari ini udah 20 kali baca gambar.')
    await w.find('[data-test="manual"]').trigger('click')
    expect(w.emitted('manual')).toHaveLength(1)
  })

  it('Baca ulang resends the same blob and counts the reading', async () => {
    const scan = vi.fn().mockResolvedValueOnce(read).mockResolvedValueOnce({ ...read, check: ['visceral'] })
    const w = make(async (_u, body) => scan(body.get('photo')))
    await pick(w)
    await w.find('[data-test="reread"]').trigger('click')
    await flushPromises()
    expect(resize).toHaveBeenCalledTimes(1)
    expect(scan).toHaveBeenCalledTimes(2)
    expect(scan.mock.calls[0][0]).toBeInstanceOf(Blob)
    expect(scan.mock.calls[1][0].size).toBe(scan.mock.calls[0][0].size)
    expect(w.find('[data-test="warnsum"]').text()).toContain('1 angka kurang yakin')
    expect(toast).toHaveBeenCalledWith('Dibaca ulang · tinggal 1 angka yang perlu dicek')
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

  it('toggles the image strip', async () => {
    const w = make(async () => read)
    await pick(w)
    expect(w.find('[data-test="imgfull"]').classes()).not.toContain('show')
    await w.find('[data-test="toggle-img"]').trigger('click')
    expect(w.find('[data-test="imgfull"]').classes()).toContain('show')
    expect(w.find('[data-test="toggle-img"]').text()).toBe('Tutup')
  })

  it('revokes the object url on unmount', async () => {
    const w = make(async () => read)
    await pick(w)
    w.unmount()
    mounted = null
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:abc')
  })

  it('422 offers another image (back to pick) instead of Baca ulang', async () => {
    const w = make(async () => { throw new ApiError('Gambarnya nggak valid.', 422) })
    await pick(w)
    expect(w.find('[data-test="reread"]').exists()).toBe(false)
    expect(w.text()).toContain('Gambarnya nggak valid.')
    await w.find('[data-test="another"]').trigger('click')
    expect(w.text()).toContain('Pilih gambar timbangan')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:abc')
  })

  it('picking twice revokes the first object url', async () => {
    URL.createObjectURL = vi.fn().mockReturnValueOnce('blob:1').mockReturnValueOnce('blob:2')
    const w = make(async () => read)
    await pick(w)
    await pick(w)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:1')
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith('blob:2')
  })

  it('a stale scan response does not overwrite a newer pick', async () => {
    const releases = []
    const w = make(() => new Promise((r) => releases.push(r)))
    await pick(w)
    await pick(w)
    releases[0]({ ...read, weight: 11, check: [] })
    await flushPromises()
    expect(w.find('[data-test="form"]').exists()).toBe(false)
    releases[1](read)
    await flushPromises()
    expect(w.find('[data-test="f-weight"]').element.value).toBe('74,90')
  })

  it('a scan resolving after unmount does not throw', async () => {
    let release
    const w = make(() => new Promise((r) => (release = r)))
    await pick(w)
    w.unmount()
    mounted = null
    release(read)
    await expect(flushPromises()).resolves.not.toThrow()
  })
})
