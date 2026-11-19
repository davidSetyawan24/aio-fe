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
})
