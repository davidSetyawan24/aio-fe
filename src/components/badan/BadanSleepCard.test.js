import { mount } from '@vue/test-utils'
import BadanSleepCard from './BadanSleepCard.vue'

const TODAY = '2026-11-20'
const sleep = { id: 8, sleptOn: TODAY, bedAt: '23:10', wakeAt: '05:53', totalMin: 403, deepMin: 75, lightMin: 228, remMin: 100, score: 79, awakeCount: 1, avgHr: 58, avgHrv: 41, source: 'scan' }
const summary = { lastOn: TODAY, totalMin: 403, avg7Min: 380, nights: 5 }

const mk = (props) => mount(BadanSleepCard, { props: { sleep, summary, today: TODAY, ...props } })

describe('BadanSleepCard', () => {
  it('isi kayak mockup: semalem, jam, total, skor, batang, tahap, kebangun/HR/HRV, rata-rata', () => {
    const w = mk()
    expect(w.find('[data-test="sleep-card-when"]').text()).toBe('semalem')
    expect(w.text()).toContain('Tidur terakhir')
    expect(w.find('[data-test="sleep-card-clock"]').text()).toBe('Semalem · 23.10 → 05.53')
    expect(w.find('[data-test="sleep-card-total"]').text()).toBe('6j43m')
    expect(w.find('[data-test="sleep-card-score"]').text()).toBe('79skor')
    expect(w.findAll('.bs-stack i')).toHaveLength(3)
    const legend = w.find('.bs-legend').text()
    expect(legend).toContain('Dalam1 j 15 m19%')
    expect(legend).toContain('Ringan3 j 48 m57%')
    expect(legend).toContain('REM1 j 40 m25%')
    const s3 = w.find('.bs-s3').text()
    expect(s3).toContain('Kebangun1×')
    expect(s3).toContain('HR rata-rata58bpm')
    expect(s3).toContain('HRV rata-rata41ms')
    expect(w.find('[data-test="sleep-card-avg"]').text()).toBe('Rata-rata 7 hari 6 j 20 m (dari 5 malam)')
  })

  it('bukan hari ini: tanggal; tanpa jam & tahap: nggak ada batang, angka kosong "–"', () => {
    const old = { ...sleep, sleptOn: '2026-11-17', bedAt: null, wakeAt: null, deepMin: null, lightMin: null, remMin: null, score: null, awakeCount: null, avgHr: null, avgHrv: null }
    const w = mk({ sleep: old })
    expect(w.find('[data-test="sleep-card-when"]').text()).toBe('Sel, 17 Nov')
    expect(w.find('[data-test="sleep-card-clock"]').text()).toBe('Sel, 17 Nov')
    expect(w.find('.bs-stack').exists()).toBe(false)
    expect(w.find('[data-test="sleep-card-score"]').text()).toBe('–skor')
    expect(w.find('.bs-legend').text()).toContain('Dalam–')
    expect(w.find('.bs-s3').text()).toContain('Kebangun–')
  })

  it('tap kartu → open(id)', async () => {
    const w = mk()
    await w.find('[data-test="sleep-card"]').trigger('click')
    expect(w.emitted('open')).toEqual([[8]])
    await w.find('[data-test="sleep-card"]').trigger('keydown', { key: 'Enter' })
    expect(w.emitted('open')).toHaveLength(2)
  })

  it('kosong: teks pudar netral, tanpa tombol / teguran, nggak bisa di-tap', async () => {
    const w = mk({ sleep: null, summary: null })
    expect(w.find('[data-test="sleep-card-empty"]').text()).toBe('Belum ada data tidur')
    expect(w.find('[data-test="sleep-card-when"]').exists()).toBe(false)
    expect(w.find('button').exists()).toBe(false)
    expect(w.find('[data-test="sleep-card"]').exists()).toBe(false)
  })
})
