import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { addDays } from '@/lib/agenda.js'
import BadanChart from './BadanChart.vue'

const showToast = vi.hoisted(() => vi.fn())
vi.mock('@/lib/personalForm.js', async (orig) => ({ ...(await orig()), showToast }))

const LAST = '2026-11-30'
const rows = Array.from({ length: 30 }, (_, i) => ({ id: i, weighedOn: addDays(LAST, -i), weighedAt: '06:00', weight: 77 + i * 0.1, fat: 25 + i * 0.1, muscle: 52, water: 50, visceral: 9 }))
const tgt = { arah: 'cutting', fat: 20, muscle: 55, weightMin: 70, weightMax: 74, startedOn: addDays(LAST, -29) }

function mk(target = tgt) {
  window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })
  return mount(BadanChart, { props: { rows, target, lastOn: LAST }, attachTo: document.body })
}
const chip = (w, k) => w.find(`[data-test="chip-${k}"]`)
const on = (w) => w.findAll('.b-mc.on').map((c) => c.attributes('data-test').slice(5))

beforeEach(() => showToast.mockReset())

describe('BadanChart', () => {
  it('chip bawaan Lemak, Otot, Berat; legenda per baris', () => {
    const w = mk()
    expect(on(w)).toEqual(['fat', 'muscle', 'weight'])
    expect(w.findAll('[data-test="lrow"]')).toHaveLength(3)
    expect(w.text()).toContain('Rata-rata 7 hari · perubahan 30 hari')
    expect(w.text()).toContain('target 20,0%')
    expect(w.text()).toContain('kisaran 70–74')
  })
  it('perubahan: lemak turun (hijau) pas cutting; tanpa target abu', async () => {
    const w = mk()
    const fat = w.find('[data-test="lrow-fat"]')
    expect(fat.text()).toMatch(/^[↑↓]/)
    expect(w.find('[data-test="lrow-weight"]').classes()).toContain('good')
    const w2 = mk(null)
    expect(w2.find('[data-test="lrow-weight"]').classes()).toContain('neutral')
  })
  it('range 90 hari ganti teks "sejak", titik harian cuma di 30 hari', async () => {
    const w = mk()
    expect(w.findAll('circle.dot').length).toBeGreaterThan(0)
    await w.find('[data-test="range-90"]').trigger('click')
    expect(w.text()).toContain('perubahan sejak')
    expect(w.findAll('circle.dot')).toHaveLength(0)
  })
  it('matiin chip terakhir → toast & tetep 1', async () => {
    const w = mk()
    await chip(w, 'muscle').trigger('click')
    await chip(w, 'weight').trigger('click')
    expect(on(w)).toEqual(['fat'])
    await chip(w, 'fat').trigger('click')
    expect(showToast).toHaveBeenCalledWith('Minimal satu yang nyala ya')
    expect(on(w)).toEqual(['fat'])
  })
  it('1 metrik berat + target: pita kisaran; banyak metrik: nggak ada', async () => {
    const w = mk()
    expect(w.find('rect.band').exists()).toBe(false)
    await chip(w, 'fat').trigger('click')
    await chip(w, 'muscle').trigger('click')
    expect(on(w)).toEqual(['weight'])
    expect(w.find('rect.band').exists()).toBe(true)
    expect(w.text()).toContain('kisaran berat')
  })
  it('data kosong di rentang: "belum ada data"', () => {
    window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })
    const w = mount(BadanChart, { props: { rows: rows.slice(0, 2), target: null, lastOn: LAST } })
    expect(w.text()).toContain('belum ada data')
  })
  it('pointermove nampilin tooltip angka asli hari itu', async () => {
    const w = mk()
    const hit = w.find('[data-test="hit"]')
    hit.element.dispatchEvent(new MouseEvent('pointermove', { clientX: 9999, bubbles: true }))
    await nextTick()
    const tip = w.find('[data-test="tip"]')
    expect(tip.exists()).toBe(true)
    expect(tip.text()).toContain('angka timbangan hari itu')
    expect(tip.text()).toContain('77,00')
    await hit.trigger('pointerleave')
    expect(w.find('[data-test="tip"]').exists()).toBe(false)
  })
  it('legenda: desimal rata-rata sama kayak hero (berat & otot 1 desimal)', () => {
    const w = mk()
    const weight = w.findAll('[data-test="lrow"]')[2].find('.b-lv').text()
    expect(weight).toBe('77,3kg')
    expect(w.findAll('[data-test="lrow"]')[1].find('.b-lv').text()).toBe('52,0kg')
  })
  it('garis rata-rata putus kalau bolong > 7 hari', () => {
    window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })
    const gap = [...rows.slice(0, 8), ...rows.slice(20)]
    const w = mount(BadanChart, { props: { rows: gap, target: null, lastOn: LAST } })
    const d = w.find('[data-test="avg-path"]').attributes('d')
    expect(d.match(/M/g)).toHaveLength(2)
    const full = mk().find('[data-test="avg-path"]').attributes('d')
    expect(full.match(/M/g)).toHaveLength(1)
  })
  it('tooltip: angka kosong "–" tanpa satuan', async () => {
    window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })
    const data = rows.map((r, i) => (i === 0 ? { ...r, fat: null } : r))
    const w = mount(BadanChart, { props: { rows: data, target: null, lastOn: LAST }, attachTo: document.body })
    w.find('[data-test="hit"]').element.dispatchEvent(new MouseEvent('pointermove', { clientX: 9999, bubbles: true }))
    await nextTick()
    const tip = w.find('[data-test="tip"]').text()
    expect(tip).not.toContain('–%')
    expect(tip).toContain('–')
  })

  describe('chip Tidur', () => {
    const sleeps = Array.from({ length: 10 }, (_, i) => ({ id: 300 + i, sleptOn: addDays(LAST, -i), totalMin: i === 0 ? 403 : 380 + i }))
    function mkS(extra = {}) {
      window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })
      return mount(BadanChart, { props: { rows, target: tgt, lastOn: LAST, sleeps, ...extra }, attachTo: document.body })
    }
    it('urutan chip: Lemak, Otot, Berat, Tidur, Air…; bawaan mati', () => {
      const w = mkS()
      const keys = w.findAll('.b-mc').map((c) => c.attributes('data-test').slice(5))
      expect(keys.slice(0, 5)).toEqual(['fat', 'muscle', 'weight', 'sleep', 'water'])
      expect(chip(w, 'sleep').text()).toBe('Tidur')
      expect(on(w)).toEqual(['fat', 'muscle', 'weight'])
      expect(w.find('[data-test="sleep-path"]').exists()).toBe(false)
    })
    it('nyalain Tidur → garis rata-rata 7 hari + titik harian + legenda jam + catatan', async () => {
      const w = mkS()
      await chip(w, 'sleep').trigger('click')
      expect(on(w)).toEqual(['fat', 'muscle', 'weight', 'sleep'])
      // 10 malam berturut-turut → rata-rata mulai malam ke-3 → 8 titik garis
      const d = w.find('[data-test="sleep-path"]').attributes('d')
      expect(d.match(/L/g)).toHaveLength(7)
      expect(w.findAll('circle.dot[data-k="sleep"]')).toHaveLength(10)
      expect(w.find('.b-legend').text()).toContain('rata-rata 7 hari')
      expect(w.find('.b-legend').text()).toContain('harian')
      expect(w.find('[data-test="lrow-sleep"]').exists()).toBe(true)
      expect(w.text()).toContain('tidur = total jam per malam')
    })
    it('Tidur doang: sumbu dalam jam', async () => {
      const w = mkS()
      await chip(w, 'sleep').trigger('click')
      for (const k of ['fat', 'muscle', 'weight']) await chip(w, k).trigger('click')
      expect(on(w)).toEqual(['sleep'])
      const ticks = w.findAll('text.ax').map((t) => t.text()).filter((t) => t.endsWith('j'))
      expect(ticks.length).toBeGreaterThan(1)
    })
    it('crosshair nampilin durasi "6 j 43 m"', async () => {
      const w = mkS()
      await chip(w, 'sleep').trigger('click')
      w.find('[data-test="hit"]').element.dispatchEvent(new MouseEvent('pointermove', { clientX: 9999, bubbles: true }))
      await nextTick()
      const tip = w.find('[data-test="tip"]').text()
      expect(tip).toContain('Tidur')
      expect(tip).toContain('6 j 43 m')
      expect(tip).toContain('angka hari itu')
    })
    it('Tidur doang tanpa data tidur di rentang: "belum ada data tidur"', async () => {
      const w = mkS({ sleeps: [] })
      await chip(w, 'sleep').trigger('click')
      for (const k of ['fat', 'muscle', 'weight']) await chip(w, k).trigger('click')
      expect(w.text()).toContain('belum ada data tidur')
    })
  })

  it('timbangan terakhir 19/11, tidur 20/11: ujung sumbu 20 Nov, titik tidur 20/11 kegambar, legenda timbangan tetep dari timbangan terakhir', async () => {
    window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })
    const W19 = '2026-11-19'
    const wrows = Array.from({ length: 10 }, (_, i) => ({ id: i, weighedOn: addDays(W19, -i), weighedAt: '06:00', weight: 77, fat: 25, muscle: 52 }))
    const sleeps = [{ id: 1, sleptOn: '2026-11-20', totalMin: 403 }, { id: 2, sleptOn: W19, totalMin: 380 }, { id: 3, sleptOn: '2026-11-18', totalMin: 390 }, { id: 4, sleptOn: '2026-11-17', totalMin: 400 }]
    const w = mount(BadanChart, { props: { rows: wrows, target: null, lastOn: W19, sleeps }, attachTo: document.body })
    const ticks = w.findAll('text.ax').map((t) => t.text())
    expect(ticks).toContain('20 Nov')
    expect(ticks).not.toContain('19 Nov')
    await chip(w, 'sleep').trigger('click')
    // garis rata-rata tidur 19 → 20 Nov (≥ 3 malam), titik terakhirnya mepet kanan (W − R); titik harian 20/11 juga
    const d = w.find('[data-test="sleep-path"]').attributes('d')
    expect(d.match(/L/g)).toHaveLength(1)
    const lastX = Number(/L([\d.]+),/.exec(d)[1])
    expect(lastX).toBeCloseTo(260 - 10, 0)
    expect(w.findAll('circle.dot[data-k="sleep"]').map((c) => Math.round(Number(c.attributes('cx'))))).toContain(250)
    // berat: titik terakhir 19 Nov, sebelum ujung kanan
    const weightLast = w.findAll('circle.last')[2]
    expect(Number(weightLast.attributes('cx'))).toBeLessThan(lastX)
    expect(w.find('[data-test="lrow-weight"]').text()).toBe('±0,0')
    w.find('[data-test="hit"]').element.dispatchEvent(new MouseEvent('pointermove', { clientX: 9999, bubbles: true }))
    await nextTick()
    const tip = w.find('[data-test="tip"]').text()
    expect(tip).toContain('Jum, 20 Nov')
    expect(tip).toContain('6 j 43 m')
    expect(tip).toContain('Berat–')
  })
})
