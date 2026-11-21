import { mount } from '@vue/test-utils'
import GymChart from './GymChart.vue'

const pt = (on, w, r, e1rm) => ({ sessionId: 1, on, sets: [[w, r]], best: [w, r], e1rm })
const points = [pt('2026-11-02', 20, 10, 26.5), pt('2026-11-04', 20, 10, 26.5), pt('2026-11-09', 22.5, 8, 28.5), pt('2026-11-11', 22.5, 8, 28.5), pt('2026-11-16', 22.5, 10, 30)]
const labels = (w) => w.findAll('text.lbl').map((t) => t.text())

describe('GymChart', () => {
  it('beban terberat: label cuma di titik pertama, yang berubah, dan terakhir', () => {
    const w = mount(GymChart, { props: { points, wide: true } })
    expect(labels(w)).toEqual(['20×10', '22,5×8', '22,5×10'])
  })

  it('HP: titik kedua dari akhir nggak dilabelin (nggak numpuk sama yang terakhir)', () => {
    const w = mount(GymChart, { props: { points } })
    // titik 4 (22,5×8, indeks 3) = kedua dari akhir; indeks 2 (22,5×8) tetap berubah
    expect(labels(w)).toEqual(['20×10', '22,5×8', '22,5×10'])
    const w2 = mount(GymChart, { props: { points: [pt('2026-11-02', 20, 10, 26.5), pt('2026-11-04', 22.5, 10, 30), pt('2026-11-09', 25, 8, 31.5)] } })
    expect(labels(w2)).toEqual(['20×10', '25×8'])
  })

  it('mode 1RM: label & garis pake e1rm', () => {
    const w = mount(GymChart, { props: { points, mode: 'orm', wide: true } })
    expect(labels(w)).toEqual(['26,5', '28,5', '30'])
  })

  it('mini: cuma titik terakhir dilabelin; kosong → nggak render apa-apa', () => {
    expect(labels(mount(GymChart, { props: { points, mini: true } }))).toEqual(['22,5×10'])
    expect(mount(GymChart, { props: { points: [] } }).find('[data-test="chart"]').exists()).toBe(false)
  })
})
