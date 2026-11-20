import { mount } from '@vue/test-utils'
import { bodySummary, paceEta, paceStatus } from '@/lib/badan.js'
import { addDays } from '@/lib/agenda.js'
import BadanTarget from './BadanTarget.vue'

const D = '2026-11-20'
/** Tiap hari satu timbangan; `weightAt(i)` = berat i hari yang lalu. */
const series = (n, weightAt) => Array.from({ length: n }, (_, i) => ({ id: i + 1, weighedOn: addDays(D, -i), weighedAt: '06:40', weight: weightAt(i), fat: 25, muscle: 52 }))
const T = (over) => ({ arah: 'cutting', pace: 'normal', fat: null, muscle: null, weightMin: 65, weightMax: 69, startedOn: addDays(D, -30), ...over })

function make(rows, target) {
  const summary = bodySummary(rows, target)
  return mount(BadanTarget, { props: { target, summary, rows, pace: paceStatus(target, rows, summary.lastOn), paceEta: paceEta(target, rows, summary.lastOn) } })
}
const t = (w, sel) => w.get(`[data-test="${sel}"]`).text().replace(/\s+/g, ' ')
/** 0,07 kg/hari = 0,49 kg/minggu → turun pas (patokan Normal 74 kg ±0,37–0,56). */
const steady = series(35, (i) => 74 + i * 0.07)

describe('BadanTarget kecepatan', () => {
  it('judul bawa kecepatan', () => {
    expect(t(make(steady, T()), 'target-title')).toBe('Target · Cutting · Normal')
  })

  it('pas: chip hijau + teks target & 2 minggu terakhir', () => {
    const w = make(steady, T())
    const chip = w.get('[data-test="speed-chip"]')
    expect(chip.text()).toBe('pas')
    expect(chip.classes()).toContain('green')
    expect(t(w, 'speed-text')).toMatch(/^Target turun 0,3\d–0,5\d kg\/minggu · 2 minggu terakhir 0,49 kg\/minggu$/)
    expect(w.find('.b-sbar .mk').exists()).toBe(true)
  })

  it('kepelanan & kecepetan: chip kuning', () => {
    const slow = make(series(35, (i) => 74 + i * 0.02), T())
    expect(slow.get('[data-test="speed-chip"]').text()).toBe('kepelanan')
    expect(slow.get('[data-test="speed-chip"]').classes()).toContain('amber')
    const fast = make(series(35, (i) => 74 + i * 0.2), T())
    expect(fast.get('[data-test="speed-chip"]').text()).toBe('kecepetan')
  })

  it('belum ada data 2 minggu: netral, tanpa marker', () => {
    const w = make(series(7, () => 74), T())
    expect(w.get('[data-test="speed-chip"]').text()).toBe('Butuh 2 minggu data')
    expect(w.get('[data-test="speed-chip"]').classes()).toContain('mut')
    expect(w.find('.b-sbar .mk').exists()).toBe(false)
    expect(t(w, 'speed-text')).not.toContain('2 minggu terakhir')
  })

  it('target lama tanpa pace: nggak ada baris Kecepatan & perkiraan', () => {
    const w = make(steady, T({ pace: null }))
    expect(w.find('[data-test="row-speed"]').exists()).toBe(false)
    expect(w.find('[data-test="eta-pace"]').exists()).toBe(false)
    expect(w.find('[data-test="eta"]').exists()).toBe(false)
    expect(t(w, 'target-title')).toBe('Target · Cutting')
  })

  it('perkiraan 2 baris dari kecepatan', () => {
    const w = make(steady, T())
    const e = t(w, 'eta-pace')
    expect(e).toMatch(/^⏳Kalau temponya kayak 2 minggu terakhir \(0,49 kg\/minggu\), berat 69 kg kira-kira ±\w+ \d{4}\.Kalau pas/)
    expect(e).toMatch(/Kalau pas Normal \(0,\d+–0,\d+ kg\/minggu\): ±\w+ \d{4}\. Perkiraan kasar dari rata-rata 7 hari\.$/)
  })

  it('perkiraan: bulan singkat & angka target berkoma kayak di sheet', () => {
    const e = t(make(steady, T({ weightMin: 64.5, weightMax: 68.5 })), 'eta-pace')
    expect(e).toMatch(/berat 68,5 kg kira-kira ±[A-Z][a-z]{2} \d{4}\./)
    expect(e).toMatch(/: ±[A-Z][a-z]{2} \d{4}\. Perkiraan kasar/)
    expect(t(make(steady, T()), 'eta-pace')).toMatch(/berat 69 kg kira-kira ±[A-Z][a-z]{2} \d{4}\./)
  })

  it('skala kecepatan pakai format mockup (0,5 · 1,0 / 0,3 · 0,6)', () => {
    const slab = (w) => w.findAll('.b-slab span').map((x) => x.text())
    expect(slab(make(steady, T()))).toEqual(['0', '0,5', '1,0 kg/minggu'])
    expect(slab(make(steady, T({ arah: 'bulking', weightMin: 78, weightMax: 80 })))).toEqual(['0', '0,3', '0,6 kg/minggu'])
  })

  it('actual null: cuma baris plan', () => {
    const e = t(make(series(7, () => 74.5), T()), 'eta-pace')
    expect(e).toMatch(/^⏳Kalau pas Normal \(0,\d+–0,\d+ kg\/minggu\), berat 69 kg kira-kira ±\w+ \d{4}\.Perkiraan kasar/)
  })

  it('dua-duanya null: nggak tampil', () => {
    const w = make(series(35, () => 66), T())
    expect(w.find('[data-test="eta-pace"]').exists()).toBe(false)
  })

  it('recomp tetap pakai perkiraan lemak v1', () => {
    const rows = series(35, () => 74).map((r, i) => ({ ...r, fat: 25 - (34 - i) * 0.02 }))
    const w = make(rows, T({ arah: 'recomp', pace: null, fat: 20 }))
    expect(w.find('[data-test="row-speed"]').exists()).toBe(false)
    expect(t(w, 'eta')).toContain('lemak 20% kira-kira')
  })
})

describe('BadanTarget kosong', () => {
  it('teks mockup notarget', () => {
    const w = mount(BadanTarget, { props: { target: null } })
    expect(t(w, 'no-target')).toContain('Pasang target biar progresnya keliatan')
    expect(t(w, 'no-target')).toContain('Pilih arah (Cutting, Bulking, …), angka target, sama aktivitas harian. Dari situ target makan ikut keitung.')
  })
})
