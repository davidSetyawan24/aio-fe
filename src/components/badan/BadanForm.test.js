import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/lib/api.js'
import { wibNow } from '@/lib/home.js'
import { setBadanApi } from '@/stores/badan.js'
import BadanForm from './BadanForm.vue'

const sheet = vi.hoisted(() => ({ present: vi.fn(), onDidDismiss: vi.fn() }))
const sheetCreate = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({ ...(await importOriginal()), actionSheetController: { create: sheetCreate } }))

const existing = { id: 3, weighedOn: wibNow().date, weighedAt: '06:12', weight: 75.1 }
const weighing = { id: 7, weighedOn: '2026-11-17', weighedAt: '06:12', weight: 75.1, fat: 25.6, muscle: 52.85, water: 51, visceral: 10, bone: 2.83, protein: 19.5, bmr: 1650, bmi: 27.2, score: 56, bodyType: 'thick_set', source: 'scan' }
let api
function mountForm(props = {}, apiOver = {}) {
  api = { get: vi.fn(async () => ({ weighings: [], target: null })), post: vi.fn(async () => ({ weighing: { id: 9 } })), patch: vi.fn(async () => ({ weighing: { id: 7 } })), put: vi.fn(), del: vi.fn(), ...apiOver }
  setBadanApi(api)
  setActivePinia(createPinia())
  return mount(BadanForm, { props: { mode: 'manual', ...props }, attachTo: document.body })
}
const mounted = []
const make = (...a) => {
  const w = mountForm(...a)
  mounted.push(w)
  return w
}
const submit = async (w) => {
  await w.find('form').trigger('submit')
  await flushPromises()
}
const conflict = (reason) => new ApiError('Udah ada.', 409, { reason, existing })

beforeEach(() => {
  sheet.onDidDismiss.mockReset().mockResolvedValue({ data: 'replace' })
  sheet.present.mockReset()
  sheetCreate.mockReset().mockResolvedValue(sheet)
})
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

describe('BadanForm manual', () => {
  it('starts with today and the current time, and the year hint follows the year', () => {
    const w = make()
    expect(w.find('[data-test="date"]').attributes('type')).toBe('date')
    expect(w.find('[data-test="date"]').attributes('max')).toBe(wibNow().date)
    expect(w.find('[data-test="time"]').attributes('type')).toBe('time')
    expect(w.find('[data-test="date"]').element.value).toBe(wibNow().date)
    expect(w.find('[data-test="date-text"]').text()).toMatch(/^\d{1,2} \w+$/)
    expect(w.find('[data-test="time-text"]').text()).toMatch(/^\d{2}\.\d{2}$/)
    expect(w.text()).toContain(`Tahun ngikut tahun sekarang (${wibNow().date.slice(0, 4)}).`)
    expect(w.text()).toContain('wajib cuma Berat')
    expect(w.text()).toContain('boleh kosong')
  })

  it('without weight: shows the error and does not call the API', async () => {
    const w = make()
    await submit(w)
    expect(w.text()).toContain('Beratnya wajib diisi.')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('saves with weight only and emits done("Kesimpen ✓")', async () => {
    const w = make()
    await w.find('[data-test="f-weight"]').setValue('74,9')
    await submit(w)
    expect(api.post).toHaveBeenCalledTimes(1)
    const [url, body] = api.post.mock.calls[0]
    expect(url).toBe('/body/weighings')
    expect(body).toMatchObject({ weight: 74.9, fat: null, source: 'manual', weighedOn: wibNow().date })
    expect(body.replace).toBeUndefined()
    expect(w.emitted('done')[0]).toEqual(['Kesimpen ✓'])
  })

  it('Enter in a field moves focus instead of submitting', async () => {
    const w = make()
    const next = w.find('[data-test="f-fat"]').element
    await w.find('[data-test="f-weight"]').trigger('keydown.enter')
    expect(document.activeElement).toBe(next)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('409 sameDay: asks in an action sheet, and Ganti resends with replace:true', async () => {
    const w = make({}, {})
    api.post.mockRejectedValueOnce(conflict('sameDay'))
    await w.find('[data-test="f-weight"]').setValue('74,9')
    await submit(w)
    expect(sheetCreate).toHaveBeenCalledTimes(1)
    const cfg = sheetCreate.mock.calls[0][0]
    expect(cfg.header).toBe('Udah ada timbangan tanggal ini')
    expect(cfg.subHeader).toMatch(/jam 06\.12 · 75,10 kg\. Ganti sama yang baru \(\d{2}\.\d{2} · 74,90 kg\)\?/)
    expect(api.post).toHaveBeenCalledTimes(2)
    expect(api.post.mock.calls[1][1].replace).toBe(true)
    expect(w.emitted('done')[0]).toEqual(['Kesimpen ✓ Timbangan 06.12 diganti'])
  })

  it('keeps busy (Simpen disabled) until the replace request resolves', async () => {
    const w = make()
    let release
    api.post.mockRejectedValueOnce(conflict('sameDay'))
    api.post.mockImplementationOnce(() => new Promise((res) => (release = () => res({ weighing: { id: 9 } }))))
    await w.find('[data-test="f-weight"]').setValue('74,9')
    await submit(w)
    expect(api.post).toHaveBeenCalledTimes(2)
    expect(w.vm.busy).toBe(true)
    expect(w.find('[data-test="save"]').attributes('disabled')).toBeDefined()
    await w.find('form').trigger('submit')
    expect(api.post).toHaveBeenCalledTimes(2)
    release()
    await flushPromises()
    expect(w.vm.busy).toBe(false)
    expect(w.emitted('done')).toHaveLength(1)
  })

  it('409 with an unknown reason, or a repeat 409 after Ganti, shows an error instead of staying silent', async () => {
    const w = make()
    api.post.mockRejectedValueOnce(new ApiError('Aneh.', 409, { reason: 'aneh', existing }))
    await w.find('[data-test="f-weight"]').setValue('74,9')
    await submit(w)
    expect(w.find('[data-test="error"]').text()).toBe('Aneh.')
    api.post.mockReset()
    api.post.mockRejectedValueOnce(conflict('sameDay')).mockRejectedValueOnce(conflict('sameDay'))
    await submit(w)
    expect(api.post).toHaveBeenCalledTimes(2)
    expect(w.find('[data-test="error"]').exists()).toBe(true)
  })

  it('409 sameDay: Batal sends nothing more', async () => {
    sheet.onDidDismiss.mockResolvedValue({ role: 'cancel' })
    const w = make()
    api.post.mockRejectedValueOnce(conflict('sameDay'))
    await w.find('[data-test="f-weight"]').setValue('74,9')
    await submit(w)
    expect(api.post).toHaveBeenCalledTimes(1)
    expect(w.emitted('done')).toBeUndefined()
  })

  it('409 exact: shows the block, disables Simpen, and "Liat yang udah ada" emits open', async () => {
    const w = make()
    api.post.mockRejectedValueOnce(conflict('exact'))
    await w.find('[data-test="f-weight"]').setValue('75,1')
    await submit(w)
    expect(w.find('[data-test="block"]').text()).toContain('Timbangan ini udah pernah disimpen')
    expect(w.find('[data-test="save"]').attributes('disabled')).toBeDefined()
    await w.find('[data-test="view-existing"]').trigger('click')
    expect(w.emitted('open')[0]).toEqual([3])
    // ganti jam → blok ilang
    await w.find('[data-test="time"]').setValue('06:30')
    expect(w.find('[data-test="block"]').exists()).toBe(false)
    expect(w.find('[data-test="save"]').attributes('disabled')).toBeUndefined()
  })
})

describe('BadanForm edit', () => {
  it('fills the form from the weighing and PATCHes with a "Perubahan kesimpen" toast', async () => {
    const w = make({ mode: 'edit', initial: weighing })
    expect(w.find('[data-test="f-weight"]').element.value).toBe('75,10')
    expect(w.find('[data-test="date"]').element.value).toBe('2026-11-17')
    expect(w.find('[data-test="date-text"]').text()).toBe('17 November')
    expect(w.find('[data-test="time-text"]').text()).toBe('06.12')
    expect(w.find('[data-test="bodyType"]').element.value).toBe('thick_set')
    expect(w.text()).not.toContain('Tahun ngikut')
    await w.find('[data-test="f-weight"]').setValue('74,9')
    await submit(w)
    expect(api.patch).toHaveBeenCalledTimes(1)
    expect(api.patch.mock.calls[0][0]).toBe('/body/weighings/7')
    expect(api.patch.mock.calls[0][1]).toMatchObject({ weight: 74.9, source: 'scan' })
    expect(w.emitted('done')[0]).toEqual(['Perubahan kesimpen ✓'])
  })
})

describe('BadanForm result', () => {
  const read = { weight: 74.9, fat: 25.6, muscle: 52.85, bone: 2.83, visceral: 10, bodyType: 'thick_set' }

  it('marks the "check" fields yellow and counts them; typing in one clears it; all clear → ok summary', async () => {
    const w = make({ mode: 'result', initial: read, check: ['bone', 'visceral'] })
    expect(w.findAll('.bf-nf.warn')).toHaveLength(2)
    expect(w.find('[data-test="warnsum"]').text()).toContain('2 angka kurang yakin kebacanya. Cocokin sama gambar ya, yang kuning.')
    expect(w.text()).toContain('cek lagi')
    expect(w.text()).toContain('Di gambar cuma ada tanggal & jam.')
    expect(w.text()).toContain('Gambarnya nggak disimpen, cuma angkanya.')
    await w.find('[data-test="f-bone"]').setValue('2,84')
    expect(w.findAll('.bf-nf.warn')).toHaveLength(1)
    expect(w.find('[data-test="warnsum"]').text()).toContain('1 angka')
    await w.find('[data-test="f-visceral"]').setValue('11')
    expect(w.find('[data-test="warnsum"]').exists()).toBe(false)
    expect(w.find('[data-test="oksum"]').text()).toContain('Semua angka kebaca jelas. Tinggal Simpen.')
  })

  it('saves with source "scan"', async () => {
    const w = make({ mode: 'result', initial: read, check: [] })
    expect(w.find('[data-test="oksum"]').exists()).toBe(true)
    await submit(w)
    expect(api.post.mock.calls[0][1]).toMatchObject({ weight: 74.9, source: 'scan', bodyType: 'thick_set' })
  })
})
