import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { addDays } from '@/lib/agenda.js'
import { ApiError } from '@/lib/api.js'
import { wibNow } from '@/lib/home.js'
import { setBadanApi } from '@/stores/badan.js'
import BadanSleepForm from './BadanSleepForm.vue'

const sheet = vi.hoisted(() => ({ present: vi.fn(), onDidDismiss: vi.fn() }))
const sheetCreate = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({ ...(await importOriginal()), actionSheetController: { create: sheetCreate } }))

const TODAY = wibNow().date
const existing = { id: 3, sleptOn: '2026-09-26', bedAt: '05:10', wakeAt: '10:20', totalMin: 310, deepMin: null, lightMin: null, remMin: null, score: 71, awakeCount: null, avgHr: null, avgHrv: null, source: 'scan' }
const sleep = { id: 7, sleptOn: addDays(TODAY, -1), bedAt: '23:30', wakeAt: '06:10', totalMin: 400, deepMin: 120, lightMin: 220, remMin: 60, score: 82, awakeCount: 1, avgHr: 61, avgHrv: 55, source: 'manual' }
const read = { sleptOn: '2026-09-26', bedAt: '04:54', wakeAt: '11:37', totalMin: 403, deepMin: 169, lightMin: 179, remMin: 55, score: 87, awakeCount: 0, avgHr: 67, avgHrv: 65 }

let api
const mounted = []
function make(props = {}) {
  api = { get: vi.fn(async () => ({ weighings: [], target: null, activity: null, sleeps: [] })), post: vi.fn(async () => ({ sleep: { id: 9 }, message: 'Data tidur kesimpen ✓' })), patch: vi.fn(async () => ({ sleep: { id: 7 }, message: 'Perubahan kesimpen ✓' })), put: vi.fn(), del: vi.fn() }
  setBadanApi(api)
  setActivePinia(createPinia())
  const w = mount(BadanSleepForm, { props: { mode: 'manual', ...props }, attachTo: document.body })
  mounted.push(w)
  return w
}
const submit = async (w) => {
  await w.find('form').trigger('submit')
  await flushPromises()
}
const setDur = async (w, k, h, m) => {
  await w.find(`[data-test="f-${k}-h"]`).setValue(h)
  await w.find(`[data-test="f-${k}-m"]`).setValue(m)
}
const conflict = (reason) => new ApiError('Udah ada.', 409, { reason, existing })

beforeEach(() => {
  sheet.onDidDismiss.mockReset().mockResolvedValue({ data: 'replace' })
  sheet.present.mockReset()
  sheetCreate.mockReset().mockResolvedValue(sheet)
})
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

describe('BadanSleepForm manual', () => {
  it('starts with today, native date/time pickers, empty clocks and no top summary', () => {
    const w = make()
    expect(w.find('[data-test="date"]').attributes('type')).toBe('date')
    expect(w.find('[data-test="date"]').attributes('max')).toBe(TODAY)
    expect(w.find('[data-test="date"]').element.value).toBe(TODAY)
    expect(w.find('[data-test="bedAt"]').attributes('type')).toBe('time')
    expect(w.find('[data-test="wakeAt"]').element.value).toBe('')
    expect(w.text()).toContain('Tanggal (tanggal bangun)')
    expect(w.find('[data-test="warnsum"]').exists()).toBe(false)
    expect(w.find('[data-test="oksum"]').exists()).toBe(false)
    expect(w.find('[data-test="save"]').text()).toBe('Simpen')
  })

  it('date + total only → right payload, emits done with the server message', async () => {
    const w = make()
    await setDur(w, 'total', '6', '43')
    await submit(w)
    expect(api.post).toHaveBeenCalledTimes(1)
    const [url, body] = api.post.mock.calls[0]
    expect(url).toBe('/body/sleeps')
    expect(body).toEqual({ sleptOn: TODAY, bedAt: null, wakeAt: null, totalMin: 403, deepMin: null, lightMin: null, remMin: null, score: null, awakeCount: null, avgHr: null, avgHrv: null, source: 'manual' })
    expect(w.emitted('done')[0]).toEqual(['Data tidur kesimpen ✓'])
  })

  it('total empty + both clocks past midnight → hint, and the total is counted from the clocks', async () => {
    const w = make()
    await w.find('[data-test="bedAt"]').setValue('23:30')
    await w.find('[data-test="wakeAt"]').setValue('06:10')
    expect(w.find('[data-test="total-hint"]').text()).toBe('Total diitung dari jam tidur–bangun: 6 j 40 m')
    await submit(w)
    expect(api.post.mock.calls[0][1]).toMatchObject({ bedAt: '23:30', wakeAt: '06:10', totalMin: 400 })
  })

  it('total from the clocks out of range → error on Total, nothing sent', async () => {
    const w = make()
    await w.find('[data-test="bedAt"]').setValue('23:30')
    await w.find('[data-test="wakeAt"]').setValue('23:10')
    await submit(w)
    expect(w.find('[data-test="err-total"]').text()).toBe('Lama tidurnya di luar rentang wajar (1–16 jam).')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('"wajib diisi" on Total goes away once both clocks are filled, or once the total is typed', async () => {
    const w = make()
    await submit(w)
    expect(w.find('[data-test="err-total"]').text()).toBe('Lama tidurnya wajib diisi.')
    await w.find('[data-test="bedAt"]').setValue('23:30')
    expect(w.find('[data-test="err-total"]').exists()).toBe(true)
    await w.find('[data-test="wakeAt"]').setValue('06:10')
    expect(w.find('[data-test="err-total"]').exists()).toBe(false)

    const w2 = make()
    await submit(w2)
    expect(w2.find('[data-test="err-total"]').exists()).toBe(true)
    await w2.find('[data-test="f-total-h"]').setValue('6')
    expect(w2.find('[data-test="err-total"]').exists()).toBe(false)
  })

  it('a clock can be cleared with its own button', async () => {
    const w = make()
    await w.find('[data-test="bedAt"]').setValue('23:30')
    expect(w.find('[data-test="bedAt-text"]').text()).toBe('23.30')
    await w.find('[data-test="clear-bedAt"]').trigger('click')
    expect(w.find('[data-test="bedAt"]').element.value).toBe('')
    expect(w.find('[data-test="clear-bedAt"]').exists()).toBe(false)
  })

  it('errors per field, nothing sent', async () => {
    const w = make()
    await submit(w)
    expect(w.find('[data-test="err-total"]').text()).toBe('Lama tidurnya wajib diisi.')
    await setDur(w, 'total', '6', '75')
    await w.find('[data-test="f-score"]').setValue('120')
    await submit(w)
    expect(w.find('[data-test="err-total"]').text()).toBe('Isi angka aja ya.')
    expect(w.find('[data-test="err-score"]').text()).toBe('Di luar rentang wajar (0–100).')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('stage line: green when the stages add up to the total, yellow when off by more than 5 minutes', async () => {
    const w = make()
    expect(w.find('[data-test="sum-line"]').text()).toBe('')
    await setDur(w, 'total', '6', '43')
    await setDur(w, 'deepMin', '2', '49')
    await setDur(w, 'lightMin', '2', '59')
    await setDur(w, 'remMin', '0', '55')
    const line = w.find('[data-test="sum-line"]')
    expect(line.text()).toBe('Dalam + ringan + REM = 6 j 43 m, cocok sama total')
    expect(line.classes()).toContain('ok')
    expect(w.find('[data-test="pct-deepMin"]').text()).toBe('42%')
    await setDur(w, 'remMin', '0', '22')
    expect(w.find('[data-test="sum-line"]').text()).toBe('Dalam + ringan + REM = 6 j 10 m, beda sama total')
    expect(w.find('[data-test="sum-line"]').classes()).toContain('off')
  })

  it('Enter moves to the next box (hours → minutes) instead of submitting', async () => {
    const w = make()
    await w.find('[data-test="f-total-h"]').trigger('keydown.enter')
    expect(document.activeElement).toBe(w.find('[data-test="f-total-m"]').element)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('409 sameDay: asks with the old & new summary, Ganti resends with replace:true', async () => {
    const w = make()
    api.post.mockRejectedValueOnce(conflict('sameDay')).mockResolvedValueOnce({ sleep: { id: 9 }, message: 'Kesimpen ✓ Data tidur 26 Sep diganti' })
    await w.find('[data-test="date"]').setValue('2026-09-26')
    await setDur(w, 'total', '6', '43')
    await w.find('[data-test="f-score"]').setValue('87')
    await submit(w)
    const cfg = sheetCreate.mock.calls[0][0]
    expect(cfg.header).toBe('Udah ada data tidur tanggal ini — ganti?')
    expect(cfg.subHeader).toBe('Sab, 26 Sep · 5 j 10 m · skor 71. Ganti sama yang baru (6 j 43 m · skor 87)?')
    expect(api.post).toHaveBeenCalledTimes(2)
    expect(api.post.mock.calls[1][1].replace).toBe(true)
    expect(w.emitted('done')[0]).toEqual(['Kesimpen ✓ Data tidur 26 Sep diganti'])
  })

  it('409 sameDay: Batal sends nothing more', async () => {
    sheet.onDidDismiss.mockResolvedValue({ role: 'cancel' })
    const w = make()
    api.post.mockRejectedValueOnce(conflict('sameDay'))
    await setDur(w, 'total', '6', '43')
    await submit(w)
    expect(api.post).toHaveBeenCalledTimes(1)
    expect(w.emitted('done')).toBeUndefined()
  })

  it('409 exact: block + Simpen disabled, "Liat yang udah ada" emits open, changing the date clears it', async () => {
    const w = make()
    api.post.mockRejectedValueOnce(conflict('exact'))
    await setDur(w, 'total', '5', '10')
    await submit(w)
    expect(w.find('[data-test="block"]').text()).toContain('Data tidur ini udah pernah disimpen')
    expect(w.find('[data-test="block"]').text()).toContain('Sab, 26 Sep · 5 j 10 m')
    expect(w.find('[data-test="save"]').attributes('disabled')).toBeDefined()
    await w.find('[data-test="view-existing"]').trigger('click')
    expect(w.emitted('open')[0]).toEqual([3])
    await w.find('[data-test="date"]').setValue(addDays(TODAY, -2))
    expect(w.find('[data-test="block"]').exists()).toBe(false)
  })

  it('409 exact: submitting again (Enter in a field) while blocked sends nothing', async () => {
    const w = make()
    api.post.mockRejectedValueOnce(conflict('exact'))
    await setDur(w, 'total', '5', '10')
    await submit(w)
    expect(w.find('[data-test="block"]').exists()).toBe(true)
    await submit(w)
    expect(api.post).toHaveBeenCalledTimes(1)
    expect(w.find('[data-test="block"]').exists()).toBe(true)
  })

  it('409 sameDay: the replace sheet failing to open → message in the form, nothing more sent', async () => {
    sheetCreate.mockRejectedValueOnce(new Error('overlay gagal'))
    const w = make()
    api.post.mockRejectedValueOnce(conflict('sameDay'))
    await setDur(w, 'total', '6', '43')
    await submit(w)
    expect(api.post).toHaveBeenCalledTimes(1)
    expect(w.find('[data-test="error"]').text()).toBe('Pilihan gantinya gagal kebuka. Coba Simpen lagi ya.')
    expect(w.emitted('done')).toBeUndefined()
    expect(w.find('[data-test="save"]').attributes('disabled')).toBeUndefined()
  })
})

describe('BadanSleepForm result', () => {
  it('fills from the read, shows the summary, marks "check" fields yellow until typed in', async () => {
    const w = make({ mode: 'result', initial: read, check: ['totalMin', 'avgHrv'] })
    expect(w.find('[data-test="warnsum"]').text()).toBe('2 angka kurang yakin kebacanya. Cocokin sama gambar ya, yang kuning.')
    expect(w.find('[data-test="f-total-h"]').element.value).toBe('6')
    expect(w.find('[data-test="f-total-m"]').element.value).toBe('43')
    expect(w.find('[data-k="totalMin"]').classes()).toContain('warn')
    expect(w.find('[data-k="avgHrv"]').classes()).toContain('warn')
    expect(w.find('[data-k="score"]').classes()).not.toContain('warn')
    await w.find('[data-test="f-avgHrv"]').setValue('66')
    expect(w.find('[data-k="avgHrv"]').classes()).not.toContain('warn')
    await w.find('[data-test="f-total-m"]').setValue('44')
    expect(w.find('[data-k="totalMin"]').classes()).not.toContain('warn')
    expect(w.text()).toContain('Gambarnya nggak disimpen, cuma angkanya.')
  })

  it('no check → ok summary; saves as source scan', async () => {
    const w = make({ mode: 'result', initial: read, check: [] })
    expect(w.find('[data-test="oksum"]').text()).toBe('Semua angka kebaca jelas. Tinggal Simpen.')
    await submit(w)
    expect(api.post.mock.calls[0][1]).toMatchObject({ sleptOn: '2026-09-26', totalMin: 403, deepMin: 169, score: 87, awakeCount: 0, source: 'scan' })
  })
})

describe('BadanSleepForm edit', () => {
  it('fills from the sleep, PATCHes with the same source, says "Simpen perubahan"', async () => {
    const w = make({ mode: 'edit', initial: sleep })
    expect(w.find('[data-test="save"]').text()).toBe('Simpen perubahan')
    expect(w.find('[data-test="bedAt"]').element.value).toBe('23:30')
    expect(w.find('[data-test="f-avgHr"]').element.value).toBe('61')
    await w.find('[data-test="f-score"]').setValue('85')
    await submit(w)
    expect(api.patch).toHaveBeenCalledTimes(1)
    const [url, body] = api.patch.mock.calls[0]
    expect(url).toBe('/body/sleeps/7')
    expect(body).toMatchObject({ score: 85, totalMin: 400, source: 'manual' })
    expect(w.emitted('done')[0]).toEqual(['Perubahan kesimpen ✓'])
  })

  it('falls back to its own text when the server sends no message', async () => {
    const w = make({ mode: 'edit', initial: sleep })
    api.patch.mockResolvedValueOnce({ id: 7 })
    await submit(w)
    expect(w.emitted('done')[0]).toEqual(['Perubahan kesimpen ✓'])
  })
})
