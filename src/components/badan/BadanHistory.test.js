import { mount } from '@vue/test-utils'
import { addDays } from '@/lib/agenda.js'
import BadanHistory from './BadanHistory.vue'

const TODAY = '2026-11-20'
const wg = (i, over) => ({ id: 100 - i, weighedOn: addDays(TODAY, -i), weighedAt: '06:42', weight: 74.9, fat: 25.6, muscle: 52.85, water: 51, visceral: 10, bone: 2.83, protein: 19.5, bmr: 1650, source: 'scan', ...over })
const sl = (i, totalMin, over) => ({ id: 200 - i, sleptOn: addDays(TODAY, -i), totalMin, source: 'scan', ...over })

/** Timbangan hari ini, kemarin, 3 hari lalu; tidur hari ini & 2 hari lalu (hari tanpa timbangan). */
const rows = [wg(0), wg(1), wg(3)]
const sleeps = [sl(0, 403), sl(2, 365)]

const mk = (props) => mount(BadanHistory, { props: { rows, sleeps, today: TODAY, ...props } })
const hrows = (w) => w.findAll('[data-test="hrow"]')

describe('BadanHistory (gabung timbangan + tidur)', () => {
  it('judul kecil, kolom Tidur sesudah Otot, baris per tanggal gabungan', () => {
    const w = mk()
    expect(w.text()).toContain('3 timbangan · 2 malam tidur')
    const head = w.find('.b-rhead').findAll('span').map((s) => s.text())
    expect(head.slice(0, 5)).toEqual(['Tanggal', 'Berat', 'Lemak', 'Otot', 'Tidur'])
    expect(hrows(w)).toHaveLength(4)
    const first = hrows(w)[0].findAll('.c').map((c) => c.text())
    expect(first.slice(0, 4)).toEqual(['74,90', '25,6%', '52,85', '6j43'])
    // kemarin: timbangan doang → Tidur "–"
    expect(hrows(w)[1].find('[data-test="hsleep"]').exists()).toBe(false)
    expect(hrows(w)[1].findAll('.c')[3].text()).toBe('–')
  })

  it('baris cuma tidur: "–" di kolom timbangan, keterangan "cuma tidur"', () => {
    const w = mk()
    const r = hrows(w)[2]
    expect(r.find('.dt small').text()).toContain('cuma tidur')
    const cells = r.findAll('.c').map((c) => c.text())
    expect(cells.slice(0, 3)).toEqual(['–', '–', '–'])
    expect(cells[3]).toBe('6j05')
    expect(cells.slice(4)).toEqual(['–', '–', '–', '–', '–'])
  })

  it('tanpa tidur: judul kecil tanpa bagian malam', () => {
    expect(mk({ sleeps: [] }).text()).toContain('3 timbangan')
    expect(mk({ sleeps: [] }).text()).not.toContain('malam tidur')
  })

  it('tap baris → detail timbangan; baris cuma tidur → detail tidur; tap sel Tidur → detail tidur aja', async () => {
    const w = mk()
    await hrows(w)[0].trigger('click')
    expect(w.emitted('open')).toEqual([[100]])
    await hrows(w)[2].trigger('click')
    expect(w.emitted('openSleep')).toEqual([[198]])
    await hrows(w)[0].find('[data-test="hsleep"]').trigger('click')
    expect(w.emitted('openSleep')).toEqual([[198], [200]])
    expect(w.emitted('open')).toHaveLength(1)
  })

  it('HP: 8 baris + "Liat semua N hari" ngitung hari gabungan', async () => {
    const many = Array.from({ length: 6 }, (_, i) => wg(i * 2))
    const nights = Array.from({ length: 6 }, (_, i) => sl(i * 2 + 1, 400))
    const w = mk({ rows: many, sleeps: nights })
    expect(hrows(w)).toHaveLength(8)
    expect(w.find('[data-test="more"]').text()).toBe('Liat semua 12 hari')
    await w.find('[data-test="more"]').trigger('click')
    expect(hrows(w)).toHaveLength(12)
    expect(mk({ rows: many, sleeps: nights, all: true }).find('[data-test="more"]').exists()).toBe(false)
  })
})
