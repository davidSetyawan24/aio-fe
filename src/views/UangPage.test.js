import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { setExpensesApi } from '@/stores/expenses.js'
import { setOverviewApi } from '@/stores/overview.js'
import UangPage from './UangPage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
const toastCreate = vi.hoisted(() => vi.fn())
const enter = vi.hoisted(() => ({ fn: null }))
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  onIonViewWillEnter: (fn) => {
    enter.fn = fn
    fn()
  },
  toastController: { create: toastCreate },
}))
// Form & panel kategori aslinya berat (store + api) — di sini cukup kembarannya.
const formSpy = vi.hoisted(() => ({ pick: vi.fn() }))
vi.mock('@/components/ExpenseForm.vue', () => ({
  default: {
    props: ['expense', 'eyebrow', 'newCategoryInline'],
    emits: ['saved', 'deleted', 'new-category'],
    setup(_, { expose }) {
      expose({ busy: false, pickJustCreated: formSpy.pick })
      return () => null
    },
  },
}))
vi.mock('@/components/CategoryPanel.vue', () => ({
  default: {
    props: ['open', 'formKey', 'forCatat'],
    emits: ['close', 'done'],
    template: '<div class="cat-panel-stub" :class="{ show: open }" />',
  },
}))
vi.mock('@/components/NotifBell.vue', () => ({ default: { template: '<span class="bell-stub" />' } }))

const day = (date, total, jatah, extra = {}) => ({ date, total, jatah, over: jatah !== null && total > jatah, future: false, ...extra })
const novDaily = () =>
  Array.from({ length: 30 }, (_, i) => {
    const date = `2026-11-${String(i + 1).padStart(2, '0')}`
    if (i >= 15) return { date, total: 0, jatah: null, over: false, future: true }
    if (i === 8) return day(date, 160_000, 72_000)
    if (i === 14) return day(date, 18_100, 71_500)
    return day(date, 60_000, 75_000)
  })
const cats = [
  { id: 1, name: 'Makan', emoji: '🍜', tint: '#FFE9D6', archived: false, total: 420_000, budget: 600_000 },
  { id: 2, name: 'Ngopi', emoji: '☕', tint: '#FFF3B8', archived: false, total: 312_000, budget: 350_000 },
  { id: 3, name: 'Belanja', emoji: '🛒', tint: '#F3E1FF', archived: false, total: 198_500, budget: 150_000 },
  { id: 4, name: 'Transportasi', emoji: '🚗', tint: '#DCEBFF', archived: false, total: 110_000, budget: 300_000 },
  { id: 5, name: 'Jajan', emoji: '🍰', tint: '#FFE0E6', archived: false, total: 65_000, budget: null },
  { id: 6, name: 'Pulsa', emoji: '📱', tint: '#E4F7C4', archived: true, total: 0, budget: 100_000 },
]
const bill = { kind: 'bill', billId: 2, period: '2026-11', name: 'Cicilan motor', emoji: '🛵', tint: '#DCEBFF', amount: 1_250_000, dueOn: '2026-11-12', status: 'late', lateDays: 3, daysLeft: 0 }
const card = { kind: 'card', sourceId: 10, name: 'CC BCA', bank: 'BCA', dueOn: '2026-11-17', daysLeft: 2, lateDays: 0 }
const budgetItem = { kind: 'budget', categoryId: 2, name: 'Ngopi', emoji: '☕', tint: '#FFF3B8', spent: 312_000, budget: 350_000, level: 'warn' }
const nov = (over = {}) => ({
  month: '2026-11', today: '2026-11-15', isCurrent: true, firstMonth: '2026-09',
  total: 1_105_500, prevMonth: '2026-10', prevTotal: 2_040_000, change: -46, avgPerDay: 73_700,
  budget: { total: 2_250_000, left: 1_144_500 },
  todayBudget: { jatah: 71_500, spent: 18_100, left: 53_400, monthLeft: 1_144_500, daysLeft: 16 },
  daily: novDaily(), categories: cats, attention: [bill, card, budgetItem],
  bills: { left: 4_800_000, lateCount: 2, paidCount: 3, count: 7 }, split: { outstanding: 245_000, people: 3 },
  ...over,
})
const okt = (over = {}) => ({
  month: '2026-10', today: '2026-11-15', isCurrent: false, firstMonth: '2026-09',
  total: 2_040_000, prevMonth: '2026-09', prevTotal: 2_217_391, change: -8, avgPerDay: 65_806,
  budget: { total: 2_250_000, left: 210_000 }, todayBudget: null,
  daily: Array.from({ length: 31 }, (_, i) => day(`2026-10-${String(i + 1).padStart(2, '0')}`, 65_000, 72_000)),
  categories: cats.slice(0, 2), attention: [], bills: { left: 0, lateCount: 0, paidCount: 7, count: 7 }, split: null,
  ...over,
})

const exp = (id, spentOn, amount, note) => ({
  id, spentOn, amount, note,
  category: { id: 1, name: 'Makan', emoji: '🍜', tint: '#FFE9D6', archived: false },
  source: { id: 1, name: 'Cash', kind: 'cash', bank: null, archived: false },
})
const expNov = () => [exp(11, '2026-11-15', 12_000, 'Sarapan'), exp(12, '2026-11-15', 6_100, 'Kopi'), exp(13, '2026-11-09', 160_000, 'Servis')]
const expOkt = () => [exp(21, '2026-10-31', 65_000, 'Makan malem')]

let api
let expApi
const mounted = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  delete window.matchMedia
})
beforeEach(() => {
  ionRouter.push.mockClear()
  toastCreate.mockReset().mockResolvedValue({ present: vi.fn() })
})

async function mountPage({ current = nov(), past = okt(), wide = false, expGet } = {}) {
  if (wide) window.matchMedia = vi.fn((q) => ({ matches: q.includes('min-width'), addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  api = {
    // Tiap jawaban objek baru (kayak server beneran).
    get: vi.fn(async (url) => structuredClone(url.includes('month=2026-10') ? past : current)),
    put: vi.fn(async () => ({})),
    del: vi.fn(async () => null),
  }
  expApi = { get: vi.fn(expGet ?? (async (url) => ({ expenses: url.includes('month=2026-10') ? expOkt() : expNov() }))) }
  setOverviewApi(api)
  setExpensesApi(expApi)
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/tabs/uang', component: UangPage }] })
  router.push('/tabs/uang')
  await router.isReady()
  const w = mount(UangPage, { global: { plugins: [pinia, router], stubs: { teleport: true } }, attachTo: document.body })
  mounted.push(w)
  await flushPromises()
  return w
}
const text = (w, sel) => w.find(`[data-test="${sel}"]`).text()

describe('UangPage', () => {
  it('judul: keluar bulan ini s.d. hari ini + baris bulan', async () => {
    const w = await mountPage()
    // Lonceng di baris label (selebar halaman, pojok kanan), judul + tombol bulan di baris sendiri (pola Agenda)
    expect(w.find('.page-head h1').exists()).toBe(false)
    expect(w.find('.u-head h1').exists()).toBe(true)
    expect(w.find('h1').text()).toContain('Rp1.105.500')
    expect(w.find('h1').text()).toContain('keluar November · s.d. hari ini')
    expect(text(w, 'month')).toContain('November 2026')
    expect(w.find('[data-test="next"]').attributes('disabled')).toBeDefined()
    expect(w.find('[data-test="prev"]').attributes('disabled')).toBeUndefined()
  })

  it('kartu hitam bulan ini: sisa jatah, budget, sisa budget', async () => {
    const w = await mountPage()
    const hero = text(w, 'hero')
    expect(hero).toContain('Sisa jatah hari ini')
    expect(hero).toContain('Rp53.400')
    expect(hero).toContain('jatah Rp71.500 · udah keluar Rp18.100')
    expect(hero).toContain('Budget bulan ini')
    expect(hero).toContain('Rp2.250.000')
    expect(hero).toContain('Sisa budget')
    expect(hero).toContain('Rp1.144.500')
    expect(hero).toContain('16 hari lagi')
  })

  it('kartu hitam: jatah kelewat & tanpa budget', async () => {
    let w = await mountPage({ current: nov({ todayBudget: { jatah: 71_500, spent: 90_000, left: -18_500, monthLeft: 1_000_000, daysLeft: 16 } }) })
    expect(text(w, 'hero')).toContain('Jatah hari ini kelewat')
    expect(text(w, 'hero')).toContain('−Rp18.500')
    w.unmount()
    w = await mountPage({ current: nov({ budget: null, todayBudget: null }) })
    expect(text(w, 'hero')).toContain('Keluar hari ini')
    expect(text(w, 'hero')).toContain('Rp18.100')
    expect(text(w, 'hero')).not.toContain('Sisa jatah')
  })

  it('‹ ke bulan lalu: tersisa dana, perbandingan, tanpa Perlu diurus & Split bill', async () => {
    const w = await mountPage()
    await w.find('[data-test="prev"]').trigger('click')
    await flushPromises()
    expect(api.get).toHaveBeenLastCalledWith('/overview?month=2026-10')
    expect(w.find('h1').text()).toContain('keluar Oktober')
    expect(w.find('h1').text()).not.toContain('s.d. hari ini')
    const hero = text(w, 'hero')
    expect(hero).toContain('Tersisa dana Oktober')
    expect(hero).toContain('Rp210.000')
    expect(hero).toContain('▼ 8% dari September')
    expect(hero).toContain('Rata-rata sehari')
    expect(hero).toContain('Rp65.806')
    expect(w.find('[data-test="attention"]').exists()).toBe(false)
    expect(w.find('[data-test="tile-split"]').exists()).toBe(false)
    expect(text(w, 'tile-bills')).toContain('lunas di Oktober')
    expect(w.find('[data-test="next"]').attributes('disabled')).toBeUndefined()
  })

  it('bulan lalu: kelewat budget & tanpa budget; ‹ nonaktif di bulan pertama', async () => {
    let w = await mountPage({ current: okt({ budget: { total: 2_000_000, left: -40_000 }, firstMonth: '2026-10' }) })
    expect(text(w, 'hero')).toContain('Budget Oktober kelewat')
    expect(text(w, 'hero')).toContain('−Rp40.000')
    expect(text(w, 'hero')).not.toContain('Tersisa dana')
    expect(w.find('[data-test="prev"]').attributes('disabled')).toBeDefined()
    w.unmount()
    w = await mountPage({ current: okt({ budget: null }) })
    expect(text(w, 'hero')).toContain('Keluar Oktober')
    expect(text(w, 'hero')).toContain('Rp2.040.000')
  })

  it('Perlu diurus: teks per jenis', async () => {
    const w = await mountPage()
    const rows = w.findAll('[data-test="todo"]')
    expect(rows).toHaveLength(3)
    expect(rows[0].text()).toContain('Cicilan motor')
    expect(rows[0].text()).toContain('Bayar rutin · telat 3 hari · Rp1.250.000')
    expect(rows[0].find('small').classes()).toContain('red')
    expect(rows[1].text()).toContain('Tagihan CC BCA')
    expect(rows[1].text()).toContain('Udah bayar?')
    expect(rows[2].text()).toContain('Ngopi udah 89% budget')
    expect(rows[2].text()).toContain('sisa Rp38.000 buat 16 hari')
    expect(text(w, 'attention-count')).toBe('3')
  })

  it('Lunas? → PUT Bayar Rutin, jadi hijau + toast, tap lagi → batal', async () => {
    const w = await mountPage()
    const btn = () => w.findAll('[data-test="todo"]')[0].find('button')
    await btn().trigger('click')
    await flushPromises()
    expect(api.put).toHaveBeenCalledWith('/recurring-bills/2/payments/2026-11', {})
    expect(btn().classes()).toContain('done')
    expect(btn().text()).toBe('Lunas')
    expect(toastCreate).toHaveBeenLastCalledWith(expect.objectContaining({ message: 'Cicilan motor lunas ✓' }))
    expect(text(w, 'attention-count')).toBe('2')
    await btn().trigger('click')
    await flushPromises()
    expect(api.del).toHaveBeenCalledWith('/recurring-bills/2/payments/2026-11')
    expect(btn().classes()).not.toContain('done')
  })

  it('Udah bayar? → PUT kartu kredit + toast', async () => {
    const w = await mountPage()
    await w.findAll('[data-test="todo"]')[1].find('button').trigger('click')
    await flushPromises()
    expect(api.put).toHaveBeenCalledWith('/payment-sources/10/bill-paid/2026-11-17', {})
    expect(toastCreate).toHaveBeenLastCalledWith(expect.objectContaining({ message: 'CC BCA udah dibayar ✓' }))
    expect(w.findAll('[data-test="todo"]')[1].find('button').text()).toBe('Udah dibayar')
  })

  it('Perlu diurus: CC telat merah, Udah bayar? pakai jatuh tempo yang lewat', async () => {
    const late = { ...card, dueOn: '2026-11-14', daysLeft: 0, lateDays: 1 }
    const w = await mountPage({ current: nov({ attention: [late] }) })
    const row = w.findAll('[data-test="todo"]')[0]
    expect(row.text()).toContain('Kartu kredit · telat 1 hari')
    expect(row.find('small').classes()).toContain('red')
    await row.find('button').trigger('click')
    await flushPromises()
    expect(api.put).toHaveBeenCalledWith('/payment-sources/10/bill-paid/2026-11-14', {})
  })

  it('budget mepet › ke Atur budget; kosong → Semua aman', async () => {
    let w = await mountPage()
    await w.findAll('[data-test="todo"]')[2].trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/budget')
    w.unmount()
    w = await mountPage({ current: nov({ attention: [] }) })
    expect(text(w, 'attention')).toContain('Semua aman')
  })

  it('Keluar buat apa: 5 teratas, Lihat semua → semua, Ringkas', async () => {
    const w = await mountPage()
    let rows = w.findAll('[data-test="cat"]')
    expect(rows).toHaveLength(5)
    expect(rows[0].text()).toContain('Makan')
    expect(rows[0].text()).toContain('Rp420.000')
    expect(rows[0].text()).toContain('38% dari total')
    expect(rows[0].text()).toContain('dari Rp600rb')
    expect(rows[1].find('.warn').exists()).toBe(true)
    expect(rows[2].text()).toContain('kelewat Rp48,5rb')
    expect(rows[4].text()).toContain('di luar budget')
    await w.find('[data-test="cat-all"]').trigger('click')
    rows = w.findAll('[data-test="cat"]')
    expect(rows).toHaveLength(6)
    expect(w.find('[data-test="cat-all"]').text()).toContain('Ringkas')
    await w.find('[data-test="cat-all"]').trigger('click')
    expect(w.findAll('[data-test="cat"]')).toHaveLength(5)
    expect(w.find('[data-test="cat-all"]').text()).toContain('Lihat semua 6')
  })

  it('Rekap harian: batang per tanggal, kelewat merah, hari ini, hari depan; tap → keterangan', async () => {
    const w = await mountPage()
    const bars = w.findAll('[data-test="bar"]')
    expect(bars).toHaveLength(30)
    expect(bars[8].classes()).toContain('over')
    expect(bars[14].classes()).toContain('today')
    expect(bars[14].classes()).toContain('on')
    expect(bars[8].classes()).not.toContain('on')
    expect(bars[20].classes()).toContain('future')
    expect(bars[0].find('.jl').exists()).toBe(true)
    expect(bars[20].find('.jl').exists()).toBe(false)
    expect(text(w, 'over-count')).toBe('1 hari kelewat jatah')
    expect(text(w, 'daily-cap')).toContain('rata-rata Rp73.700 / hari')
    await bars[8].trigger('click')
    expect(text(w, 'daily-cap')).toContain('rata-rata Rp73.700 / hari')
  })

  it('kartu kecil: Bayar Rutin & Split bill ke menunya', async () => {
    const w = await mountPage()
    expect(text(w, 'tile-bills')).toContain('Rp4,8jt')
    expect(text(w, 'tile-bills')).toContain('belum lunas November')
    expect(text(w, 'tile-bills')).toContain('2 telat')
    expect(text(w, 'tile-split')).toContain('Rp245rb')
    expect(text(w, 'tile-split')).toContain('masih di 3 temen')
    await w.find('[data-test="tile-bills"]').trigger('click')
    expect(ionRouter.push).toHaveBeenLastCalledWith('/tabs/menu/bayar-rutin')
    await w.find('[data-test="tile-split"]').trigger('click')
    expect(ionRouter.push).toHaveBeenLastCalledWith('/tabs/menu/split-bill')
  })

  it('HP: tombol Catat melayang → layar Catat', async () => {
    const w = await mountPage()
    expect(w.find('[data-test="pc-add"]').exists()).toBe(false)
    await w.find('[data-test="fab"]').trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/duit/catat')
  })

  it('PC: Catat di kepala → Duit, tanpa tombol melayang', async () => {
    const w = await mountPage({ wide: true })
    expect(w.find('[data-test="fab"]').exists()).toBe(false)
    await w.find('[data-test="pc-add"]').trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/duit')
  })

  it('ganti bulan pas app masih kebuka (lewat tengah malam) → masuk lagi buka bulan yang baru', async () => {
    await mountPage()
    api.get.mockImplementation(async () => nov({ month: '2026-12', today: '2026-12-01' }))
    enter.fn()
    await flushPromises()
    expect(api.get).toHaveBeenLastCalledWith('/overview')
  })

  it('balik ke bulan ini lewat › → masuk lagi tetep "bulan ini", bukan bulan yang dikunci', async () => {
    const w = await mountPage()
    await w.find('[data-test="prev"]').trigger('click')
    await flushPromises()
    await w.find('[data-test="next"]').trigger('click')
    await flushPromises()
    expect(api.get).toHaveBeenLastCalledWith('/overview')
    enter.fn()
    await flushPromises()
    expect(api.get).toHaveBeenLastCalledWith('/overview')
  })

  it('"Lihat semua" tetep kebuka abis centang Lunas? (rangkuman dimuat ulang)', async () => {
    const w = await mountPage()
    await w.find('[data-test="cat-all"]').trigger('click')
    expect(w.findAll('[data-test="cat"]')).toHaveLength(6)
    await w.findAll('[data-test="todo"]')[0].find('button').trigger('click')
    await flushPromises()
    expect(api.get).toHaveBeenCalledTimes(2)
    expect(w.findAll('[data-test="cat"]')).toHaveLength(6)
  })

  it('masuk lagi ke tab → dimuat ulang (bulan yang lagi dilihat)', async () => {
    const w = await mountPage()
    expect(api.get).toHaveBeenCalledTimes(1)
    enter.fn()
    await flushPromises()
    expect(api.get).toHaveBeenCalledTimes(2)
    expect(api.get).toHaveBeenLastCalledWith('/overview')
    await w.find('[data-test="prev"]').trigger('click')
    await flushPromises()
    enter.fn()
    await flushPromises()
    expect(api.get).toHaveBeenLastCalledWith('/overview?month=2026-10')
  })

  describe('rincian per hari', () => {
    it('rincian hari ini kebuka duluan', async () => {
      const w = await mountPage()
      expect(text(w, 'day-head')).toContain('Hari ini · Minggu, 15 Nov')
      expect(w.findAll('[data-test="day-expense"]')).toHaveLength(2)
    })

    it('tap batang → rincian ganti; tap lagi → balik hari ini', async () => {
      const w = await mountPage()
      await w.findAll('[data-test="bar"]')[8].trigger('click')
      expect(text(w, 'day-head')).toContain('Senin, 9 Nov')
      expect(w.findAll('[data-test="day-expense"]')).toHaveLength(1)
      await w.findAll('[data-test="bar"]')[8].trigger('click')
      expect(text(w, 'day-head')).toContain('Hari ini')
    })

    it('bulan lalu → tanggal terakhir', async () => {
      const w = await mountPage()
      await w.find('[data-test="prev"]').trigger('click')
      await flushPromises()
      expect(text(w, 'day-head')).toContain('Sabtu, 31 Okt')
      expect(w.findAll('[data-test="day-expense"]')).toHaveLength(1)
    })

    it('muat catatan gagal → bagian lain tetep, Coba lagi muat ulang', async () => {
      let first = true
      const w = await mountPage({
        expGet: async () => {
          if (first) {
            first = false
            throw new Error('putus')
          }
          return { expenses: expNov() }
        },
      })
      expect(w.find('[data-test="day-error"]').exists()).toBe(true)
      expect(w.find('[data-test="daily-cap"]').exists()).toBe(true)
      expect(w.find('[data-test="hero"]').exists()).toBe(true)
      await w.find('[data-test="day-retry"]').trigger('click')
      await flushPromises()
      expect(w.find('[data-test="day-error"]').exists()).toBe(false)
      expect(w.findAll('[data-test="day-expense"]')).toHaveLength(2)
    })

    it('ganti bulan cepet: catatan bulan lama nggak nongol', async () => {
      let release
      const held = new Promise((r) => (release = r))
      const w = await mountPage({
        expGet: async (url) => {
          if (url.includes('month=2026-11')) await held
          return { expenses: url.includes('month=2026-10') ? expOkt() : expNov() }
        },
      })
      await w.find('[data-test="prev"]').trigger('click')
      await flushPromises()
      expect(text(w, 'day-head')).toContain('Sabtu, 31 Okt')
      release()
      await flushPromises()
      expect(text(w, 'day-head')).toContain('Sabtu, 31 Okt')
      expect(w.findAll('[data-test="day-expense"]')).toHaveLength(1)
    })

    it('muat catatan: jawaban telat bulan lama nggak ngubah rincian bulan baru', async () => {
      let relNov
      let relOkt
      const heldNov = new Promise((r) => (relNov = r))
      const heldOkt = new Promise((r) => (relOkt = r))
      const w = await mountPage({
        expGet: async (url) => {
          if (url.includes('month=2026-10')) await heldOkt
          else await heldNov
          return { expenses: url.includes('month=2026-10') ? expOkt() : expNov() }
        },
      })
      await w.find('[data-test="prev"]').trigger('click')
      await flushPromises()
      relNov() // jawaban November (telat) duluan
      await flushPromises()
      expect(w.findAll('[data-test="day-expense"]')).toHaveLength(0)
      expect(w.find('[data-test="day-empty"]').exists()).toBe(false)
      expect(w.find('[data-test="day-error"]').exists()).toBe(false)
      relOkt()
      await flushPromises()
      expect(text(w, 'day-head')).toContain('Sabtu, 31 Okt')
      expect(w.findAll('[data-test="day-expense"]')).toHaveLength(1)
      expect(text(w, 'day-expense')).toContain('Makan malem')
    })

    it('muat catatan: jawaban gagal yang telat nggak ngubah state baru yang sukses jadi error', async () => {
      let failFirst
      let calls = 0
      const w = await mountPage({
        expGet: async () => {
          calls += 1
          if (calls === 1) return { expenses: expNov() } // mount
          if (calls === 2) await new Promise((_, rej) => (failFirst = rej)) // Coba lagi pertama: ditahan lalu gagal
          return { expenses: expNov() }
        },
      })
      // loadDay kedua (lewat balik ke tab) ditahan, lalu yang ketiga sukses duluan
      enter.fn()
      await flushPromises()
      enter.fn()
      await flushPromises()
      failFirst(new Error('putus'))
      await flushPromises()
      expect(w.find('[data-test="day-error"]').exists()).toBe(false)
      expect(w.findAll('[data-test="day-expense"]')).toHaveLength(2)
    })

    it('PC: tap baris → panel, bukan pindah halaman', async () => {
      const w = await mountPage({ wide: true })
      await w.findAll('[data-test="day-expense"]')[0].trigger('click')
      expect(ionRouter.push).not.toHaveBeenCalled()
      expect(w.find('[data-test="panel"]').classes()).toContain('show')
      expect(w.find('.panel-h1').text()).toContain('Sarapan')
    })

    it('PC: abis simpen panel nutup + Uang muat ulang, hari tetep', async () => {
      const w = await mountPage({ wide: true })
      await w.findAll('[data-test="bar"]')[8].trigger('click')
      await w.findAll('[data-test="day-expense"]')[0].trigger('click')
      const before = api.get.mock.calls.length
      w.findComponent({ name: 'UangExpensePanel' }).vm.$emit('saved', exp(13, '2026-11-09', 1, 'x'), false)
      await flushPromises()
      expect(w.find('[data-test="panel"]').classes()).not.toContain('show')
      expect(api.get.mock.calls.length).toBeGreaterThan(before)
      expect(text(w, 'day-head')).toContain('Senin, 9 Nov')
    })

    it('PC: abis hapus panel nutup + Uang muat ulang', async () => {
      const w = await mountPage({ wide: true })
      await w.findAll('[data-test="day-expense"]')[0].trigger('click')
      const before = api.get.mock.calls.length
      w.findComponent({ name: 'UangExpensePanel' }).vm.$emit('deleted')
      await flushPromises()
      expect(w.find('[data-test="panel"]').classes()).not.toContain('show')
      expect(api.get.mock.calls.length).toBeGreaterThan(before)
    })

    it('PC: + Baru kategori → panel kategori; selesai → nutup, kepilih, toast', async () => {
      const w = await mountPage({ wide: true })
      await w.findAll('[data-test="day-expense"]')[0].trigger('click')
      const panel = w.findComponent({ name: 'UangExpensePanel' })
      panel.vm.$emit('new-category')
      await flushPromises()
      const cat = w.find('.cat-panel-stub')
      expect(cat.classes()).toContain('show')
      expect(w.find('[data-test="panel"]').classes()).toContain('show')
      w.findComponent('.cat-panel-stub').vm.$emit('done', 'Kategori dibikin')
      await flushPromises()
      expect(w.find('.cat-panel-stub').classes()).not.toContain('show')
      expect(formSpy.pick).toHaveBeenCalled()
      expect(toastCreate).toHaveBeenCalledWith(expect.objectContaining({ message: 'Kategori dibikin' }))
    })

    it('HP: panel nggak dirender', async () => {
      const w = await mountPage()
      expect(w.find('[data-test="panel"]').exists()).toBe(false)
      expect(w.find('.cat-panel-stub').exists()).toBe(false)
    })

    it('tap baris di HP → layar ubah dari Uang', async () => {
      const w = await mountPage()
      await w.findAll('[data-test="day-expense"]')[0].trigger('click')
      expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/duit/11?dari=uang')
    })

    it('balik ke tab → hari kepilih tetep', async () => {
      const w = await mountPage()
      await w.findAll('[data-test="bar"]')[8].trigger('click')
      enter.fn()
      await flushPromises()
      expect(text(w, 'day-head')).toContain('Senin, 9 Nov')
    })
  })
})
