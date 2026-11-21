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

  it('label yang tabrakan (terlalu deket ke samping) disembunyiin; yang terakhir selalu ada', () => {
    const many = [20, 21, 22.5, 23, 24.5, 25, 26.5, 27].map((w, i) => pt(`2026-11-${String(i + 2).padStart(2, '0')}`, w, 10, w * 1.33))
    const w = mount(GymChart, { props: { points: many } })
    const boxes = w.findAll('text.lbl').map((t) => {
      const x = Number(t.attributes('x'))
      const y = Number(t.attributes('y'))
      const wd = t.text().length * 6.4 + 6
      const a = t.attributes('text-anchor')
      const x0 = a === 'start' ? x : a === 'end' ? x - wd : x - wd / 2
      return { x0, x1: x0 + wd, y, text: t.text() }
    })
    expect(boxes.length).toBeLessThan(many.length)
    expect(boxes.at(-1)?.text ?? labels(w).at(-1)).toBeTruthy()
    expect(labels(w)).toContain('27×10')
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j]
        const overlap = a.x0 < b.x1 && b.x0 < a.x1 && Math.abs(a.y - b.y) < 13
        expect(overlap, `${a.text} vs ${b.text}`).toBe(false)
      }
  })

  it('titik yang garisnya naik / turun di atasnya → label di bawah titik (nggak ketimpa garis)', () => {
    const w = mount(GymChart, { props: { points: [pt('2026-11-04', 20.5, 10, 27), pt('2026-11-19', 23, 10, 30.5), pt('2026-11-21', 20, 10, 26.5)], wide: true } })
    const cy = w.findAll('circle.pt').map((c) => Number(c.attributes('cy')))
    const ly = Object.fromEntries(w.findAll('text.lbl').map((t) => [t.text(), Number(t.attributes('y'))]))
    expect(ly['20,5×10']).toBeGreaterThan(cy[0])
    expect(ly['23×10']).toBeLessThan(cy[1])
    expect(ly['20×10']).toBeGreaterThan(cy[2])
  })

  it('titik di tengah tanjakan → label ke kiri-atas (anchor end), di tengah turunan → kanan-atas (anchor start)', () => {
    const up = mount(GymChart, { props: { points: [pt('2026-11-02', 20, 10, 26), pt('2026-11-04', 22.5, 10, 30), pt('2026-11-09', 25, 10, 33), pt('2026-11-11', 22.5, 8, 28)], wide: true } })
    const a = Object.fromEntries(up.findAll('text.lbl').map((t) => [t.text(), t.attributes('text-anchor')]))
    expect(a['22,5×10']).toBe('end')
    const down = mount(GymChart, { props: { points: [pt('2026-11-02', 25, 10, 33), pt('2026-11-04', 22.5, 10, 30), pt('2026-11-09', 20, 10, 26), pt('2026-11-11', 22.5, 8, 28)], wide: true } })
    const b = Object.fromEntries(down.findAll('text.lbl').map((t) => [t.text(), t.attributes('text-anchor')]))
    expect(b['22,5×10']).toBe('start')
  })
})
