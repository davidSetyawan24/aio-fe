import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { addDays } from '@/lib/agenda.js'
import { wibNow } from '@/lib/home.js'
import { setBadanApi, useBadanStore } from '@/stores/badan.js'
import BadanDetail from './BadanDetail.vue'

const sheet = vi.hoisted(() => ({ present: vi.fn(), onDidDismiss: vi.fn() }))
const sheetCreate = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({ ...(await importOriginal()), actionSheetController: { create: sheetCreate } }))

const TODAY = wibNow().date
const base = { weighedAt: '06:12', fat: 28, muscle: 52, water: 50, visceral: 9, bone: 2.9, protein: 17, bmr: 1650, bmi: 24.6, score: 80, bodyType: 'thick_set', source: 'scan' }
const weighings = [
  { ...base, id: 3, weighedOn: TODAY, weight: 74, fat: 27, muscle: 53 },
  { ...base, id: 2, weighedOn: addDays(TODAY, -1), weight: 75, source: 'manual' },
  { ...base, id: 1, weighedOn: addDays(TODAY, -2), weight: 76 },
]
let api
const mounted = []
async function mountDetail(id, target = { arah: 'cutting', fat: null, muscle: null, weightMin: 65, weightMax: 69, startedOn: TODAY }) {
  api = { get: vi.fn(async () => ({ weighings, target })), post: vi.fn(), patch: vi.fn(), put: vi.fn(), del: vi.fn(async () => ({})) }
  setBadanApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  await useBadanStore().load()
  const w = mount(BadanDetail, { props: { weighingId: id }, global: { plugins: [pinia] }, attachTo: document.body })
  mounted.push(w)
  await flushPromises()
  return w
}

beforeEach(() => {
  sheet.onDidDismiss.mockReset().mockResolvedValue({ data: 'delete' })
  sheet.present.mockReset()
  sheetCreate.mockReset().mockResolvedValue(sheet)
})
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

describe('BadanDetail', () => {
  it('shows the long date, source chip, 3 main numbers with the 7-day comparison', async () => {
    const w = await mountDetail(3)
    expect(w.find('[data-test="title"]').text()).toMatch(/^(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu), \d{1,2} \w+$/)
    expect(w.text()).toContain('06.12')
    expect(w.find('[data-test="source"]').text()).toBe('dari gambar')
    const main = w.find('[data-test="main"]').text()
    expect(main).toContain('74,00')
    expect(main).toMatch(/−1,0 dari rata-rata 7 hari \(75,0\)/)
    expect(w.find('[data-test="main"] .gl').exists()).toBe(true)
  })

  it('manual rows get the "isi manual" chip; Lainnya lists averages and the body type with its Zepp name', async () => {
    const w = await mountDetail(2)
    expect(w.find('[data-test="source"]').text()).toBe('isi manual')
    const list = w.find('[data-test="list"]').text()
    expect(list).toContain('rata-rata')
    expect(list).toContain('Kekar berisi')
    expect(list).toContain('Thick-set di Zepp')
  })

  it('Ubah emits edit', async () => {
    const w = await mountDetail(3)
    await w.find('[data-test="edit"]').trigger('click')
    expect(w.emitted('edit')).toHaveLength(1)
  })

  it('Hapus: confirm sheet, then emits done BEFORE the store removes it', async () => {
    const w = await mountDetail(3)
    let sawRemoveWhenEmitted = null
    api.del.mockImplementation(async () => ({}))
    const origEmit = w.vm.$.emit
    w.vm.$.emit = (...a) => {
      if (a[0] === 'done') sawRemoveWhenEmitted = api.del.mock.calls.length
      return origEmit(...a)
    }
    await w.find('[data-test="delete"]').trigger('click')
    await flushPromises()
    const cfg = sheetCreate.mock.calls[0][0]
    expect(cfg.header).toMatch(/^Hapus timbangan \d{1,2} \w+, 06\.12\?$/)
    expect(cfg.subHeader).toBe('Angkanya ilang dari riwayat, grafik, dan rata-rata 7 hari.')
    expect(api.del).toHaveBeenCalledWith('/body/weighings/3')
    expect(sawRemoveWhenEmitted).toBe(0)
    expect(w.emitted('done')[0]).toEqual(['Timbangan dihapus'])
  })

  it('Batal on the sheet does not delete', async () => {
    sheet.onDidDismiss.mockResolvedValue({ role: 'cancel' })
    const w = await mountDetail(3)
    await w.find('[data-test="delete"]').trigger('click')
    await flushPromises()
    expect(api.del).not.toHaveBeenCalled()
    expect(w.emitted('done')).toBeUndefined()
  })
})
