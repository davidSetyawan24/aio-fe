import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { addDays } from '@/lib/agenda.js'
import { dDay, dShort } from '@/lib/badanView.js'
import { wibNow } from '@/lib/home.js'
import { setBadanApi } from '@/stores/badan.js'
import BadanPage from './BadanPage.vue'
import { setAiApi, setAiToast } from '@/stores/ai.js'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
/** Action sheet palsu: `sheetPick` = data tombol yang "dipencet" (undefined = Batal). */
const sheet = vi.hoisted(() => ({ create: vi.fn(), pick: undefined }))
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  actionSheetController: { create: sheet.create },
}))

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

beforeEach(() => {
  ionRouter.push.mockReset()
  sheet.pick = undefined
  sheet.create.mockReset().mockImplementation(async () => ({ present: vi.fn(), onDidDismiss: async () => ({ data: sheet.pick }) }))
  document.body.appendChild(document.createElement('ion-app'))
})
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  document.querySelectorAll('ion-app').forEach((e) => e.remove())
})

describe('BadanPage', () => {
  it('kosong: kartu "Belum ada timbangan", nggak nyuruh mulai, nggak ada isi lain', async () => {
    const w = await mountPage({ data: { weighings: [], target: null } })
    expect(w.text()).toContain('Belum ada timbangan')
    expect(w.text()).not.toMatch(/ayo mulai|mulai nimbang/i)
    expect(w.find('[data-test="upload"]').exists() || w.find('[data-test="manual-small"]').exists()).toBe(true)
    expect(w.find('[data-test="hero"]').exists()).toBe(false)
    expect(w.find('[data-test="fab"]').exists()).toBe(false)
  })

  it('baris profil di bawah "Sekarang": lengkap tanpa link', async () => {
    const w = await mountPage({ data: { weighings, target: target(), profile: { height: 166, age: 31, gender: 'male' } } })
    const left = w.find('.b-left')
    expect(left.find('[data-test="profile"]').text()).toBe('Tinggi 166 cm · 31 tahun · Laki-laki')
    expect(left.find('.b-label + [data-test="profile"]').exists()).toBe(true)
    expect(w.find('[data-test="profile-link"]').exists()).toBe(false)
  })

  it('baris profil di layar kosong: belum diisi → link ke tab Biodata', async () => {
    const w = await mountPage({ data: { weighings: [], target: null } })
    expect(w.find('[data-test="profile"]').text()).toBe('Tinggi, umur & jenis kelamin belum diisi · Lengkapin di Data Pribadi ›')
    await w.find('[data-test="profile-link"]').trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/data-pribadi?tab=bio')
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

  it('grafik kepasang dengan chip bawaan Lemak, Otot, Berat', async () => {
    const w = await mountPage()
    expect(w.findAll('.b-mc.on').map((c) => c.text())).toEqual(['Lemak', 'Otot', 'Berat'])
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

  it('perkiraan ⏳ buat cutting: 2 baris dari kecepatan, kartu Makan ikut tampil', async () => {
    const w = await mountPage({ data: { weighings: declining, target: target({ pace: 'normal', startedOn: addDays(TODAY, -34) }) } })
    const t = w.find('[data-test="eta-pace"]').text()
    expect(t).toContain('⏳')
    expect(t).toMatch(/berat 69 kg kira-kira ±[A-Za-z]+ \d{4}/)
    expect(w.find('[data-test="speed-chip"]').exists()).toBe(true)
    expect(w.find('[data-test="food-empty"]').attributes('data-state')).toBe('needActivity')
  })

  it('Isi aktivitas dulu / Aktivitas › → sheet Atur target di bagian Aktivitas; Atur biasa dari atas', async () => {
    const w = await mountPage({ data: { weighings: declining, target: target({ pace: 'normal', startedOn: addDays(TODAY, -34) }), activity: null, sleeps: [] } })
    await w.find('[data-test="food-btn"]').trigger('click')
    expect(w.vm.targetOpen).toBe(true)
    expect(w.vm.targetFocus).toBe('activity')
    w.vm.targetOpen = false
    await w.find('[data-test="edit-target"]').trigger('click')
    expect(w.vm.targetOpen).toBe(true)
    expect(w.vm.targetFocus).toBe('')
    w.vm.targetOpen = false
    await w.find('[data-test="food-activity"]').trigger('click')
    expect(w.vm.targetFocus).toBe('activity')
  })

  it('cutting lama tanpa kecepatan: nggak error, tanpa baris Kecepatan & perkiraan, Makan minta pilih kecepatan', async () => {
    const w = await mountPage({ data: { weighings: declining, target: target({ startedOn: addDays(TODAY, -34) }) } })
    expect(w.find('[data-test="row-speed"]').exists()).toBe(false)
    expect(w.find('[data-test="eta-pace"]').exists()).toBe(false)
    expect(w.find('[data-test="eta"]').exists()).toBe(false)
    expect(w.find('[data-test="food-empty"]').attributes('data-state')).toBe('needPace')
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

  it('HP: riwayat 8 baris + "Liat semua 12 hari", tap buka semua', async () => {
    const w = await mountPage()
    expect(w.findAll('[data-test="hrow"]')).toHaveLength(8)
    expect(w.find('[data-test="more"]').text()).toBe('Liat semua 12 hari')
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
    sheet.pick = 'upload'
    await w.find('[data-test="fab"]').trigger('click')
    await flushPromises()
    expect(ionRouter.push).toHaveBeenLastCalledWith('/tabs/menu/badan/upload')
    sheet.pick = 'manual'
    await w.find('[data-test="manual-small"]').trigger('click')
    await flushPromises()
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

  it('PC: panel nampilin form isi manual; abis simpan panel nutup', async () => {
    const w = await mountPage({ width: 1440 })
    sheet.pick = 'manual'
    await w.find('[data-test="manual"]').trigger('click')
    await flushPromises()
    const panel = document.querySelector('[data-test="panel"]')
    expect(panel.classList.contains('show')).toBe(true)
    expect(panel.querySelector('[data-test="panel-title"]').textContent).toBe('Isi manual')
    expect(panel.querySelector('[data-test="f-weight"]')).not.toBeNull()
    w.findComponent({ name: 'BadanPanel' }).vm.$emit('done', 'Kesimpen ✓')
    await flushPromises()
    expect(w.vm.panel.open).toBe(false)
  })

  it('PC: Ubah di detail pindah ke form ubah, abis simpan balik ke detail', async () => {
    const w = await mountPage({ width: 1440 })
    w.vm.openPanel('detail', 100)
    await flushPromises()
    document.querySelector('[data-test="edit"]').click()
    await flushPromises()
    expect(w.vm.panel).toMatchObject({ open: true, view: 'edit', id: 100 })
    w.findComponent({ name: 'BadanPanel' }).vm.$emit('done', 'Perubahan kesimpen ✓')
    await flushPromises()
    expect(w.vm.panel).toMatchObject({ open: true, view: 'detail', id: 100 })
  })

  it('tidur: HP ke halaman anak tidur; PC panel detail tidur → Ubah → abis simpan balik ke detail tidur', async () => {
    const sleep = { id: 8, sleptOn: TODAY, bedAt: '23:30', wakeAt: '06:10', totalMin: 400, deepMin: null, lightMin: null, remMin: null, score: 80, awakeCount: null, avgHr: null, avgHrv: null, source: 'manual' }
    const data = { weighings, target: target(), activity: null, sleeps: [sleep] }
    const hp = await mountPage({ data })
    hp.vm.openPanel('sleepDetail', 8)
    expect(ionRouter.push).toHaveBeenLastCalledWith('/tabs/menu/badan/tidur/8')
    hp.vm.openPanel('sleepEdit', 8)
    expect(ionRouter.push).toHaveBeenLastCalledWith('/tabs/menu/badan/tidur/8/ubah')
    hp.vm.openPanel('sleepManual')
    expect(ionRouter.push).toHaveBeenLastCalledWith('/tabs/menu/badan/tidur/catat')

    const w = await mountPage({ width: 1440, data })
    w.vm.openPanel('sleepDetail', 8)
    await flushPromises()
    const panel = document.querySelector('[data-test="panel"]')
    expect(panel.querySelector('[data-test="panel-title"]').textContent).toBe('Detail tidur')
    panel.querySelector('[data-test="edit"]').click()
    await flushPromises()
    expect(w.vm.panel).toMatchObject({ open: true, view: 'sleepEdit', id: 8 })
    expect(panel.querySelector('[data-test="panel-title"]').textContent).toBe('Ubah tidur')
    panel.querySelector('[data-test="panel-back"]').click()
    await flushPromises()
    expect(w.vm.panel).toMatchObject({ open: true, view: 'sleepDetail', id: 8 })
    w.vm.openPanel('sleepEdit', 8)
    w.findComponent({ name: 'BadanPanel' }).vm.$emit('done', 'Perubahan kesimpen ✓')
    await flushPromises()
    expect(w.vm.panel).toMatchObject({ open: true, view: 'sleepDetail', id: 8 })
    w.vm.openPanel('sleepManual')
    await flushPromises()
    expect(panel.querySelector('[data-test="panel-title"]').textContent).toBe('Isi tidur manual')
    expect(panel.querySelector('[data-test="panel-sub"]').textContent).toBe('Ketik angka dari Huawei Health.')
    w.findComponent({ name: 'BadanPanel' }).vm.$emit('done', 'Data tidur kesimpen ✓')
    await flushPromises()
    expect(w.vm.panel.open).toBe(false)
  })

  it('hero: 7 hari penuh → "Rata-rata 7 hari" + "vs minggu lalu"', async () => {
    const w = await mountPage()
    expect(w.find('[data-test="hero-label"]').text()).toBe('Rata-rata 7 hari')
    expect(w.find('[data-test="raw-fat"]').text()).toContain('vs minggu lalu')
    expect(w.find('[data-test="lhead"]').text()).toBe('Rata-rata 7 hari · perubahan 30 hari')
  })

  it('timbangan pertama: nggak ngaku rata-rata 7 hari, caption "vs minggu lalu" ilang', async () => {
    const w = await mountPage({ data: { weighings: [weighings[0]], target: null } })
    expect(w.find('[data-test="hero-label"]').text()).toBe('Timbangan terakhir')
    expect(w.find('[data-test="hero"]').text()).not.toContain('vs minggu lalu')
    expect(w.find('[data-test="raw-fat"]').text()).toBe('hari ini 28,0%')
    expect(w.find('[data-test="lhead"]').text()).toBe('Timbangan terakhir · perubahan 30 hari')
    const two = await mountPage({ data: { weighings: weighings.slice(0, 2), target: null } })
    expect(two.find('[data-test="hero-label"]').text()).toBe('Rata-rata 2 timbangan')
  })

  it('isi manual cuma berat: angka kosong "–" tanpa "%"', async () => {
    const only = [{ ...weighings[0], fat: null, muscle: null }]
    const w = await mountPage({ data: { weighings: only, target: null } })
    expect(w.find('[data-test="hero"]').text()).not.toContain('–%')
    expect(w.find('[data-test="raw-fat"]').text()).toBe('hari ini –')
  })

  it('"awal … (tanggal)" = tanggal timbangan yang dipakai, bukan tanggal target dipasang', async () => {
    const older = weighings.slice(1)
    const w = await mountPage({ data: { weighings: older, target: target({ arah: 'recomp', fat: 20, startedOn: TODAY }) } })
    expect(w.find('[data-test="row-fat"]').text()).toContain(`(${dShort(addDays(TODAY, -1))})`)
  })

  it('cutting yang awalnya udah di bawah goal lalu naik lagi: 0% · kurang 2,0 kg, bukan 100% · 0,0', async () => {
    const rows = weighings.map((r, i) => ({ ...r, weight: i < 7 ? 71 : 68 }))
    const w = await mountPage({ data: { weighings: rows, target: target({ startedOn: addDays(TODAY, -8) }) } })
    expect(w.find('[data-test="weight-note"]').text()).toBe('kurang 2,0 kg ke 69')
    const row = w.find('[data-test="row-weight"]').text()
    expect(row).toContain('0% jalan · kurang 2,0 kg lagi')
    expect(row).not.toContain('100%')
  })

  it('link "Semua menu" ada juga di PC/iPad; FAB HP "Upload"', async () => {
    const pc = await mountPage({ width: 1440 })
    expect(pc.find('[data-test="back"]').text()).toBe('Semua menu')
    const ipad = await mountPage({ width: 820 })
    expect(ipad.find('[data-test="back"]').exists()).toBe(true)
    const hp = await mountPage()
    expect(hp.find('[data-test="fab"]').text()).toBe('Upload')
  })

  it('PC/iPad header: Isi manual · Upload tidur · Upload timbangan; Upload tidur buka panel upload tidur', async () => {
    const w = await mountPage({ width: 1440 })
    expect(w.find('.b-hact').findAll('button').map((b) => b.text())).toEqual(['Isi manual', 'Upload tidur', 'Upload timbangan'])
    await w.find('[data-test="sleep-upload"]').trigger('click')
    await flushPromises()
    expect(w.vm.panel).toMatchObject({ open: true, view: 'sleepUpload' })
    const panel = document.querySelector('[data-test="panel"]')
    expect(panel.querySelector('[data-test="panel-title"]').textContent).toBe('Upload tidur')
    expect(panel.querySelector('[data-test="panel-sub"]').textContent).toBe('Dari gambar Huawei Health.')
    expect(sheet.create).not.toHaveBeenCalled()
  })

  it('HP FAB "Upload" → action sheet Upload apa? 2 pilihan; Tidur → halaman upload tidur; Batal → diem', async () => {
    const w = await mountPage()
    sheet.pick = 'sleepUpload'
    await w.find('[data-test="fab"]').trigger('click')
    await flushPromises()
    const opts = sheet.create.mock.calls[0][0]
    expect(opts.header).toBe('Upload apa?')
    expect(opts.subHeader).toBe('Pilih gambar yang mau dibaca.')
    expect(opts.buttons.map((b) => b.text)).toEqual(['⚖️ Timbangan', '🌙 Tidur', 'Batal'])
    expect(opts.buttons[2].role).toBe('cancel')
    expect(ionRouter.push).toHaveBeenLastCalledWith('/tabs/menu/badan/tidur/upload')
    ionRouter.push.mockClear()
    sheet.pick = undefined
    await w.find('[data-test="fab"]').trigger('click')
    await flushPromises()
    expect(ionRouter.push).not.toHaveBeenCalled()
  })

  it('HP Isi manual kecil → action sheet Isi manual apa?; Tidur → isi tidur manual', async () => {
    const w = await mountPage()
    sheet.pick = 'sleepManual'
    await w.find('[data-test="manual-small"]').trigger('click')
    await flushPromises()
    const opts = sheet.create.mock.calls[0][0]
    expect(opts.header).toBe('Isi manual apa?')
    expect(opts.buttons.map((b) => b.text)).toEqual(['⚖️ Timbangan', '🌙 Tidur', 'Batal'])
    expect(ionRouter.push).toHaveBeenLastCalledWith('/tabs/menu/badan/tidur/catat')
  })

  it('PC header Isi manual → action sheet Isi manual apa?; Tidur → panel isi tidur manual; tap dobel = 1 sheet', async () => {
    const w = await mountPage({ width: 1440 })
    sheet.pick = 'sleepManual'
    await w.find('[data-test="manual"]').trigger('click')
    await flushPromises()
    const opts = sheet.create.mock.calls[0][0]
    expect(opts.header).toBe('Isi manual apa?')
    expect(opts.buttons.map((b) => b.text)).toEqual(['⚖️ Timbangan', '🌙 Tidur', 'Batal'])
    expect(w.vm.panel).toMatchObject({ open: true, view: 'sleepManual' })
    expect(document.querySelector('[data-test="panel-title"]').textContent).toBe('Isi tidur manual')
    expect(ionRouter.push).not.toHaveBeenCalled()
    sheet.create.mockClear()
    sheet.create.mockImplementation(async () => ({ present: vi.fn(), onDidDismiss: () => new Promise(() => {}) }))
    await w.find('[data-test="manual"]').trigger('click')
    await w.find('[data-test="manual"]').trigger('click')
    await flushPromises()
    expect(sheet.create).toHaveBeenCalledTimes(1)
  })

  it('kosong: Isi manual → action sheet; PC Timbangan → panel manual, HP Tidur → halaman isi tidur manual', async () => {
    const empty = { weighings: [], target: null, activity: null, sleeps: [] }
    const pc = await mountPage({ width: 1440, data: empty })
    sheet.pick = 'manual'
    await pc.find('[data-test="empty-manual"]').trigger('click')
    await flushPromises()
    expect(sheet.create.mock.calls[0][0].header).toBe('Isi manual apa?')
    expect(pc.vm.panel).toMatchObject({ open: true, view: 'manual' })
    const hp = await mountPage({ data: empty })
    sheet.pick = 'sleepManual'
    await hp.find('[data-test="empty-manual"]').trigger('click')
    await flushPromises()
    expect(sheet.create).toHaveBeenCalledTimes(2)
    expect(ionRouter.push).toHaveBeenLastCalledWith('/tabs/menu/badan/tidur/catat')
  })

  it('HP: tap FAB dua kali cepet cuma munculin satu action sheet', async () => {
    const w = await mountPage()
    // Sheet pertama masih kebuka (belum ditutup) pas tap kedua.
    sheet.create.mockImplementation(async () => ({ present: vi.fn(), onDidDismiss: () => new Promise(() => {}) }))
    await w.find('[data-test="fab"]').trigger('click')
    await w.find('[data-test="fab"]').trigger('click')
    await flushPromises()
    expect(sheet.create).toHaveBeenCalledTimes(1)
  })

  it('kosong: tombol ketiga Upload tidur (HP → halaman upload tidur, PC → panel)', async () => {
    const empty = { weighings: [], target: null, activity: null, sleeps: [] }
    const hp = await mountPage({ data: empty })
    expect(hp.find('[data-test="empty-sleep"]').text()).toBe('Upload tidur')
    await hp.find('[data-test="empty-sleep"]').trigger('click')
    expect(ionRouter.push).toHaveBeenLastCalledWith('/tabs/menu/badan/tidur/upload')
    const pc = await mountPage({ width: 1440, data: empty })
    await pc.find('[data-test="empty-sleep"]').trigger('click')
    expect(pc.vm.panel).toMatchObject({ open: true, view: 'sleepUpload' })
  })

  it('PC: Isi manual dari layar gagal upload tidur → panel isi tidur manual', async () => {
    const w = await mountPage({ width: 1440 })
    w.vm.openPanel('sleepUpload')
    await flushPromises()
    w.findComponent({ name: 'BadanPanel' }).vm.$emit('sleepManual')
    await flushPromises()
    expect(w.vm.panel).toMatchObject({ open: true, view: 'sleepManual' })
  })

  describe('tidur di halaman', () => {
    const nap = (i, over) => ({ id: 50 - i, sleptOn: addDays(TODAY, -i), bedAt: '23:10', wakeAt: '05:53', totalMin: 403, deepMin: 75, lightMin: 228, remMin: 100, score: 79, awakeCount: 1, avgHr: 58, avgHrv: 41, source: 'scan', ...over })

    it('ada timbangan + tidur semalem: sub-judul, kartu Tidur terakhir, kolom Tidur di riwayat', async () => {
      const w = await mountPage({ data: { weighings, target: target(), activity: null, sleeps: [nap(0), nap(2, { totalMin: 365 })] } })
      expect(w.find('[data-test="sub"]').text()).toBe('Cutting · timbang terakhir hari ini, 06.42 · tidur semalem 6 j 43 m')
      expect(w.find('[data-test="sleep-card-when"]').text()).toBe('semalem')
      await w.find('[data-test="sleep-card"]').trigger('click')
      expect(ionRouter.push).toHaveBeenLastCalledWith('/tabs/menu/badan/tidur/50')
      expect(w.find('[data-test="history"]').text()).toContain('6j05')
      await w.findAll('[data-test="hsleep"]')[1].trigger('click')
      expect(ionRouter.push).toHaveBeenLastCalledWith('/tabs/menu/badan/tidur/48')
      expect(w.find('[data-test="chip-sleep"]').exists()).toBe(true)
    })

    it('tanpa tidur: kartu "Belum ada data tidur", sub-judul tanpa tidur', async () => {
      const w = await mountPage({ data: { weighings, target: target(), activity: null, sleeps: [] } })
      expect(w.find('[data-test="sub"]').text()).toBe('Cutting · timbang terakhir hari ini, 06.42')
      expect(w.find('[data-test="sleep-card-empty"]').text()).toBe('Belum ada data tidur')
    })

    it('tidur ada tapi timbangan belum: layar kosong + kartu tidur bisa dibuka, makan nunggu timbangan', async () => {
      const data = { weighings: [], target: target(), activity: null, sleeps: [nap(0)] }
      const hp = await mountPage({ data })
      expect(hp.text()).toContain('Belum ada timbangan')
      expect(hp.find('[data-test="sub"]').text()).toBe('Belum ada timbangan yang masuk · tidur semalem 6 j 43 m')
      expect(hp.find('[data-test="main"]').exists()).toBe(false)
      expect(hp.find('[data-test="food-empty"]').attributes('data-state')).toBe('needWeighing')
      await hp.find('[data-test="food-btn"]').trigger('click')
      expect(ionRouter.push).toHaveBeenLastCalledWith('/tabs/menu/badan/upload')
      await hp.find('[data-test="sleep-card"]').trigger('click')
      expect(ionRouter.push).toHaveBeenLastCalledWith('/tabs/menu/badan/tidur/50')

      const pc = await mountPage({ width: 1440, data })
      await pc.find('[data-test="sleep-card"]').trigger('click')
      expect(pc.vm.panel).toMatchObject({ open: true, view: 'sleepDetail', id: 50 })
    })

    it('tidur ada, timbangan & target belum: kartu tidur tanpa kartu makan; tidur kemarin nggak masuk sub-judul', async () => {
      const w = await mountPage({ data: { weighings: [], target: null, activity: null, sleeps: [nap(1)] } })
      expect(w.find('[data-test="sub"]').text()).toBe('Belum ada timbangan yang masuk.')
      expect(w.find('[data-test="sleep-card-when"]').text()).toBe(dDay(addDays(TODAY, -1)))
      expect(w.find('[data-test="food-empty"]').exists()).toBe(false)
    })

    it('kosong total: nggak ada kartu tidur / makan', async () => {
      const w = await mountPage({ data: { weighings: [], target: target(), activity: null, sleeps: [] } })
      expect(w.find('[data-test="sleep-card"]').exists()).toBe(false)
      expect(w.find('[data-test="sleep-card-empty"]').exists()).toBe(false)
      expect(w.find('[data-test="food-empty"]').exists()).toBe(false)
    })
  })
})

describe('BadanPage: Tanya AI', () => {
  it('HP pindah ke halaman chat Badan', async () => {
    const w = await mountPage()
    await w.find('[data-test="ask-ai"]').trigger('click')
    expect(ionRouter.push).toHaveBeenLastCalledWith('/tabs/menu/badan/tanya')
  })

  it('layar lebar buka panel chat Badan', async () => {
    const ai = { get: vi.fn(), post: vi.fn(async () => ({ id: 1, context: 'badan', kind: 'chat', messages: [], quote: null })), put: vi.fn(), patch: vi.fn(), del: vi.fn() }
    setAiApi(ai)
    setAiToast(vi.fn())
    const w = await mountPage({ width: 1440 })
    await w.find('[data-test="ask-ai"]').trigger('click')
    await flushPromises()
    expect(ionRouter.push).not.toHaveBeenCalled()
    expect(document.querySelector('[data-test="panel"].show')).not.toBeNull()
    expect(ai.post).toHaveBeenCalledWith('/ai/conversations', { context: 'badan' })
  })
})

