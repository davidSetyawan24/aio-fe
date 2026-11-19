import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { addDays } from '@/lib/agenda.js'
import { wibNow } from '@/lib/home.js'
import { setBadanApi } from '@/stores/badan.js'
import BadanPage from './BadanPage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
vi.mock('@ionic/vue', async (importOriginal) => ({ ...(await importOriginal()), useIonRouter: () => ionRouter }))

const TODAY = wibNow().date
/** 12 timbangan, terbaru dulu: 7 hari terakhir 73,9 kg, sebelumnya 80 kg. */
const weighings = Array.from({ length: 12 }, (_, i) => ({
  id: 100 - i, weighedOn: addDays(TODAY, -i), weighedAt: '06:42', weight: i < 7 ? 73.9 : 80, fat: 28, muscle: 52, water: 50, visceral: 9, bone: 2.9, protein: 17, bmr: 1600, bmi: 24.6, score: 80,
  bodyType: 'thick_set', source: i === 3 ? 'manual' : 'scan',
}))
const target = (over) => ({ arah: 'cutting', fat: null, muscle: null, weightMin: 65, weightMax: 69, startedOn: addDays(TODAY, -11), ...over })

const flat = (weight) => weighings.map((r) => ({ ...r, weight }))
/** 35 hari, turun 0,1 kg per hari (terbaru paling ringan). */
const declining = Array.from({ length: 35 }, (_, i) => ({ ...weighings[0], id: 500 - i, weighedOn: addDays(TODAY, -i), weight: 74 + i * 0.1 }))

const mounted = []
function stubMedia(width) {
  window.matchMedia = (query) => {
    const min = Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0)
    return { matches: width >= min, addEventListener: () => {}, removeEventListener: () => {} }
  }
}
async function mountPage({ width = 390, data = { weighings, target: target() } } = {}) {
  stubMedia(width)
  setBadanApi({ get: vi.fn(async () => data), post: vi.fn(), patch: vi.fn(), put: vi.fn(), del: vi.fn() })
  const pinia = createPinia()
  setActivePinia(pinia)
  const w = mount(BadanPage, { global: { plugins: [pinia] }, attachTo: document.body })
  mounted.push(w)
  await flushPromises()
  return w
}

beforeEach(() => ionRouter.push.mockReset())
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

describe('BadanPage', () => {
  it('kosong: kartu "Belum ada timbangan", nggak nyuruh mulai, nggak ada isi lain', async () => {
    const w = await mountPage({ data: { weighings: [], target: null } })
    expect(w.text()).toContain('Belum ada timbangan')
    expect(w.text()).not.toMatch(/ayo mulai|mulai nimbang/i)
    expect(w.find('[data-test="upload"]').exists() || w.find('[data-test="manual-small"]').exists()).toBe(true)
    expect(w.find('[data-test="hero"]').exists()).toBe(false)
    expect(w.find('[data-test="fab"]').exists()).toBe(false)
  })

  it('ada data + target cutting: sub-judul, progres berat, bar kisaran', async () => {
    const w = await mountPage()
    expect(w.find('[data-test="sub"]').text()).toBe('Cutting · timbang terakhir hari ini, 06.42')
    expect(w.find('[data-test="hero"]').text()).toContain('73,9')
    expect(w.find('[data-test="weight-note"]').text()).toBe('kurang 4,9 kg ke 69')
    const row = w.find('[data-test="row-weight"]').text()
    expect(row).toContain('73,9 → 69 kg')
    expect(row).toContain('55% jalan')
    expect(row).toContain('kurang 4,9 kg lagi')
    // masih jalan: nggak ada teks kuning "di luar kisaran"
    expect(w.find('[data-test="target"]').text()).not.toContain('di luar kisaran')
    expect(w.find('[data-test="target"]').find('.b-chip.amber').exists()).toBe(false)
    expect(w.find('[data-test="weight-note"]').classes()).not.toContain('warn')
  })

  it('target di bawah kisaran (cutting kebablasan) → kuning', async () => {
    const w = await mountPage({ data: { weighings, target: target({ weightMin: 75, weightMax: 79 }) } })
    expect(w.find('[data-test="row-weight"]').text()).toContain('di bawah kisaran 75–79')
  })

  it('cutting yang rata-ratanya udah di dalam kisaran → "✓ udah masuk kisaran"', async () => {
    const w = await mountPage({ data: { weighings: flat(67), target: target() } })
    expect(w.find('[data-test="weight-note"]').text()).toBe('✓ udah masuk kisaran')
    expect(w.find('[data-test="row-weight"]').text()).toContain('✓ udah masuk kisaran')
  })

  it('bulking kebablasan di atas kisaran → kuning "di atas kisaran"', async () => {
    const w = await mountPage({ data: { weighings, target: target({ arah: 'bulking', weightMin: 60, weightMax: 64 }) } })
    expect(w.find('[data-test="row-weight"]').text()).toContain('di atas kisaran 60–64')
    expect(w.find('[data-test="row-weight"]').find('.b-chip.amber').exists()).toBe(true)
  })

  it('recomp di luar kisaran → "di luar kisaran"', async () => {
    const w = await mountPage({ data: { weighings, target: target({ arah: 'recomp' }) } })
    expect(w.find('[data-test="weight-note"]').text()).toBe('di luar kisaran 65–69')
    expect(w.find('[data-test="row-weight"]').text()).toContain('di luar kisaran')
  })

  it('perkiraan ⏳ buat cutting: "nyampe 69 kg kira-kira ±<bulan tahun>"', async () => {
    const w = await mountPage({ data: { weighings: declining, target: target({ startedOn: addDays(TODAY, -34) }) } })
    const t = w.find('[data-test="eta"]').text()
    expect(t).toContain('⏳')
    expect(t).toMatch(/nyampe 69 kg kira-kira ±[A-Za-z]+ \d{4}/)
  })

  it('target ditulis tanpa nol di belakang koma', async () => {
    const w = await mountPage({ data: { weighings, target: target({ arah: 'recomp', fat: 20, muscle: 55, weightMin: 73, weightMax: 76 }) } })
    expect(w.find('[data-test="row-fat"]').text()).toContain('→ 20%')
    expect(w.find('[data-test="row-muscle"]').text()).toContain('→ 55 kg')
  })

  it('recomp: bar kisaran "aman di kisaran"', async () => {
    const w = await mountPage({ data: { weighings, target: target({ arah: 'recomp', weightMin: 73, weightMax: 76 }) } })
    expect(w.find('[data-test="weight-note"]').text()).toBe('aman di kisaran 73–76')
    expect(w.find('[data-test="row-weight"]').text()).toContain('aman di kisaran')
  })

  it('lemak 100% → "udah nyampe 🎉"', async () => {
    const w = await mountPage({ data: { weighings, target: target({ arah: 'recomp', weightMin: 73, weightMax: 76, fat: 28 }) } })
    expect(w.find('[data-test="row-fat"]').text()).toContain('udah nyampe 🎉')
  })

  it('tanpa target: ajakan pasang target, sub-judul tanpa arah', async () => {
    const w = await mountPage({ data: { weighings, target: null } })
    expect(w.text()).toContain('Pasang target biar progresnya keliatan')
    expect(w.find('[data-test="sub"]').text()).toBe('timbang terakhir hari ini, 06.42')
  })

  it('timbangan terakhir nampilin 7 angka + tipe badan', async () => {
    const w = await mountPage()
    const t = w.find('[data-test="last"]').text()
    expect(t).toContain('Lemak visceral')
    expect(t).toContain('Kekar berisi')
    expect(t).toContain('Thick-set di Zepp')
  })

  it('HP: riwayat 8 baris + "Liat semua 12 timbangan", tap buka semua', async () => {
    const w = await mountPage()
    expect(w.findAll('[data-test="hrow"]')).toHaveLength(8)
    expect(w.find('[data-test="more"]').text()).toBe('Liat semua 12 timbangan')
    await w.find('[data-test="more"]').trigger('click')
    expect(w.findAll('[data-test="hrow"]')).toHaveLength(12)
  })

  it('PC (>=1100): semua baris, tanpa tombol liat semua', async () => {
    const w = await mountPage({ width: 1440 })
    expect(w.findAll('[data-test="hrow"]')).toHaveLength(12)
    expect(w.find('[data-test="more"]').exists()).toBe(false)
  })

  it('HP: FAB & baris ke halaman anak; PC: buka panel', async () => {
    const w = await mountPage()
    await w.find('[data-test="fab"]').trigger('click')
    expect(ionRouter.push).toHaveBeenLastCalledWith('/tabs/menu/badan/upload')
    await w.find('[data-test="manual-small"]').trigger('click')
    expect(ionRouter.push).toHaveBeenLastCalledWith('/tabs/menu/badan/catat')
    await w.find('[data-test="hrow"]').trigger('click')
    expect(ionRouter.push).toHaveBeenLastCalledWith('/tabs/menu/badan/100')

    const pc = await mountPage({ width: 1440 })
    await pc.find('[data-test="upload"]').trigger('click')
    expect(pc.vm.panel).toMatchObject({ open: true, view: 'upload' })
    await pc.find('[data-test="hrow"]').trigger('click')
    expect(pc.vm.panel).toMatchObject({ open: true, view: 'detail', id: 100 })
    expect(ionRouter.push).toHaveBeenCalledTimes(3)
  })
})
