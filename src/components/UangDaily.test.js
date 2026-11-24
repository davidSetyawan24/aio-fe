import { mount } from '@vue/test-utils'
import UangDaily from './UangDaily.vue'

const day = (date, total, jatah) => ({ date, total, jatah, over: jatah !== null && total > jatah, future: false })
const daily = () =>
  Array.from({ length: 30 }, (_, i) => {
    const date = `2026-11-${String(i + 1).padStart(2, '0')}`
    if (i >= 15) return { date, total: 0, jatah: null, over: false, future: true }
    if (i === 8) return day(date, 160_000, 72_000)
    if (i === 14) return day(date, 18_100, 71_500)
    return day(date, 60_000, 75_000)
  })
const mk = (selected = '2026-11-15') =>
  mount(UangDaily, { props: { daily: daily(), avgPerDay: 73_700, today: '2026-11-15', isCurrent: true, month: '2026-11', selected } })

describe('UangDaily', () => {
  it('batang kepilih ditandain on', () => {
    const bars = mk().findAll('[data-test="bar"]')
    expect(bars[14].classes()).toContain('on')
    expect(bars[8].classes()).not.toContain('on')
  })

  it('klik batang lewat → emit pick tanggalnya', async () => {
    const w = mk()
    await w.findAll('[data-test="bar"]')[8].trigger('click')
    expect(w.emitted('pick')[0]).toEqual(['2026-11-09'])
  })

  it('batang masa depan disabled, nggak emit', async () => {
    const w = mk()
    const bar = w.findAll('[data-test="bar"]')[20]
    expect(bar.attributes('disabled')).toBeDefined()
    await bar.trigger('click')
    expect(w.emitted('pick')).toBeUndefined()
  })

  it('klik nggak ngubah tulisan atas', async () => {
    const w = mk()
    await w.findAll('[data-test="bar"]')[8].trigger('click')
    expect(w.find('[data-test="daily-cap"]').text()).toContain('rata-rata Rp73.700 / hari')
  })

  it('angka tanggal: kepilih tampil, patokan mepet disembunyiin', () => {
    let spans = mk('2026-11-15').findAll('.days span')
    expect(spans[14].text()).toBe('15')
    expect(spans[14].classes()).toContain('on')
    expect(spans[13].text()).toBe('')
    spans = mk('2026-11-09').findAll('.days span')
    expect(spans[6].text()).toBe('')
    expect(spans[8].text()).toBe('9')
  })
})
