import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { addDays } from '@/lib/agenda.js'
import { ApiError } from '@/lib/api.js'
import { wibNow } from '@/lib/home.js'
import { setBadanApi, useBadanStore } from '@/stores/badan.js'
import BadanSleepDetail from './BadanSleepDetail.vue'

const sheet = vi.hoisted(() => ({ present: vi.fn(), onDidDismiss: vi.fn() }))
const sheetCreate = vi.hoisted(() => vi.fn())
const toastCreate = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({ ...(await importOriginal()), actionSheetController: { create: sheetCreate }, toastController: { create: toastCreate } }))

const TODAY = wibNow().date
const sleeps = [
  { id: 8, sleptOn: TODAY, bedAt: '04:54', wakeAt: '11:37', totalMin: 403, deepMin: 169, lightMin: 179, remMin: 55, score: 87, awakeCount: 0, avgHr: 67, avgHrv: 65, source: 'scan' },
  { id: 7, sleptOn: addDays(TODAY, -1), bedAt: null, wakeAt: null, totalMin: 337, deepMin: null, lightMin: null, remMin: null, score: null, awakeCount: null, avgHr: null, avgHrv: null, source: 'manual' },
]
let api
const mounted = []
async function mountDetail(id) {
  api = { get: vi.fn(async () => ({ weighings: [], target: null, activity: null, sleeps: [...sleeps] })), post: vi.fn(), patch: vi.fn(), put: vi.fn(), del: vi.fn(async () => ({})) }
  setBadanApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  await useBadanStore().load()
  const w = mount(BadanSleepDetail, { props: { sleepId: id }, global: { plugins: [pinia] }, attachTo: document.body })
  mounted.push(w)
  await flushPromises()
  return w
}

beforeEach(() => {
  sheet.onDidDismiss.mockReset().mockResolvedValue({ data: 'delete' })
  sheet.present.mockReset()
  sheetCreate.mockReset().mockResolvedValue(sheet)
  toastCreate.mockReset().mockResolvedValue({ present: vi.fn() })
})
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

describe('BadanSleepDetail', () => {
  it('shows the long date, clocks, source chip and the whole sleep card', async () => {
    const w = await mountDetail(8)
    expect(w.find('[data-test="title"]').text()).toMatch(/^(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu), \d{1,2} \w+$/)
    expect(w.find('[data-test="clock"]').text()).toBe('04.54 → 11.37')
    expect(w.find('[data-test="source"]').text()).toBe('dari gambar')
    expect(w.find('[data-test="total"]').text()).toBe('6j43m')
    expect(w.find('[data-test="score"]').text()).toContain('87')
    const legend = w.find('[data-test="legend"]').text()
    expect(legend).toContain('Dalam2 j 49 m42%')
    expect(legend).toContain('Ringan2 j 59 m44%')
    expect(legend).toContain('REM55 m14%')
    const s3 = w.find('[data-test="s3"]').text()
    expect(s3).toContain('Kebangun0×')
    expect(s3).toContain('HR rata-rata67bpm')
    expect(s3).toContain('HRV rata-rata65ms')
    expect(w.find('[data-test="avg"]').text()).toBe('Rata-rata 7 hari 6 j 10 m (dari 2 malam)')
  })

  it('a manual sleep with only a total: "–" without units, no clocks, no stage bar', async () => {
    const w = await mountDetail(7)
    expect(w.find('[data-test="source"]').text()).toBe('isi manual')
    expect(w.find('[data-test="clock"]').exists()).toBe(false)
    expect(w.find('[data-test="stack"]').exists()).toBe(false)
    expect(w.find('[data-test="score"]').text()).toContain('–')
    expect(w.find('[data-test="s3"]').text()).not.toMatch(/×|bpm|ms/)
    expect(w.find('[data-test="avg"]').text()).toBe('Rata-rata 7 hari 5 j 37 m (dari 1 malam)')
  })

  it('unknown id → not-found text', async () => {
    const w = await mountDetail(99)
    expect(w.find('[data-test="gone"]').text()).toBe('Data tidurnya nggak ketemu. Mungkin udah dihapus.')
  })

  it('Ubah emits edit', async () => {
    const w = await mountDetail(8)
    await w.find('[data-test="edit"]').trigger('click')
    expect(w.emitted('edit')).toHaveLength(1)
  })

  it('Hapus: confirms, emits done BEFORE the store changes, then toasts', async () => {
    const w = await mountDetail(8)
    let delCallsAtDone = null
    const origEmit = w.vm.$.emit
    w.vm.$.emit = (...a) => {
      if (a[0] === 'done') delCallsAtDone = api.del.mock.calls.length
      return origEmit(...a)
    }
    await w.find('[data-test="delete"]').trigger('click')
    await flushPromises()
    expect(sheetCreate.mock.calls[0][0].header).toBe(`Hapus data tidur ${Number(TODAY.slice(8))} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][Number(TODAY.slice(5, 7)) - 1]}?`)
    expect(delCallsAtDone).toBe(0)
    expect(w.emitted('done')).toHaveLength(1)
    expect(api.del).toHaveBeenCalledWith('/body/sleeps/8')
    expect(toastCreate.mock.calls[0][0].message).toBe('Data tidur dihapus')
  })

  it('Hapus → Batal does nothing', async () => {
    sheet.onDidDismiss.mockResolvedValue({ role: 'cancel' })
    const w = await mountDetail(8)
    await w.find('[data-test="delete"]').trigger('click')
    await flushPromises()
    expect(api.del).not.toHaveBeenCalled()
    expect(w.emitted('done')).toBeUndefined()
  })

  it('Hapus fails → toast with the error', async () => {
    const w = await mountDetail(8)
    api.del.mockRejectedValueOnce(new ApiError('Data tidurnya nggak ketemu.', 404))
    await w.find('[data-test="delete"]').trigger('click')
    await flushPromises()
    expect(toastCreate.mock.calls[0][0].message).toBe('Data tidurnya nggak ketemu.')
  })
})
