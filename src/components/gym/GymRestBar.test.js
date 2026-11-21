import { mount } from '@vue/test-utils'
import { startTimer } from '@/lib/gymTimer.js'
import GymRestBar from './GymRestBar.vue'

const t0 = 1_000_000
const timer = startTimer(120, 'Shoulder Press', t0)

describe('GymRestBar', () => {
  it('jalan: judul, sisa waktu gede, +30 dtk, Lewati', () => {
    const w = mount(GymRestBar, { props: { timer, now: t0 + 13_000 } })
    expect(w.find('.rest').classes()).not.toContain('done')
    expect(w.find('small').text()).toBe('Istirahat · Shoulder Press')
    expect(w.find('[data-test="rest-time"]').text()).toBe('1:47')
    expect(w.find('[data-test="plus30"]').text()).toBe('+30 dtk')
    expect(w.find('[data-test="skip"]').text()).toBe('Lewati')
    expect(w.find('circle.fg').attributes('stroke-dashoffset')).toBeDefined()
  })

  it('beres: lime, "Istirahat beres" + "Gas set berikutnya" + lewat m:ss + Tutup, tanpa +30', () => {
    const w = mount(GymRestBar, { props: { timer, now: t0 + 143_000 } })
    expect(w.find('.rest').classes()).toContain('done')
    expect(w.text()).toContain('Istirahat beres')
    expect(w.text()).toContain('Gas set berikutnya')
    expect(w.find('[data-test="rest-over"]').text()).toBe('lewat 0:23')
    expect(w.find('[data-test="skip"]').text()).toBe('Tutup')
    expect(w.find('[data-test="plus30"]').exists()).toBe(false)
  })

  it('tombol emit', async () => {
    const w = mount(GymRestBar, { props: { timer, now: t0 + 1000 } })
    await w.find('[data-test="plus30"]').trigger('click')
    await w.find('[data-test="skip"]').trigger('click')
    expect(w.emitted('plus30')).toHaveLength(1)
    expect(w.emitted('skip')).toHaveLength(1)
  })
})
