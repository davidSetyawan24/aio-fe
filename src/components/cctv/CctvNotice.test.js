import { mount } from '@vue/test-utils'
import CctvNotice from './CctvNotice.vue'

const mountNotice = (kind) => mount(CctvNotice, { props: { kind } })

describe('CctvNotice', () => {
  it('not a Mac → info card without any button', () => {
    const w = mountNotice('notMac')
    expect(w.text()).toContain('CCTV cuma bisa dibuka dari Mac di rumah.')
    expect(w.text()).toContain('Nanti bisa dari mana aja kalau udah ada mini PC.')
    expect(w.find('button').exists()).toBe(false)
  })

  it('off → big Nyalain CCTV button', async () => {
    const w = mountNotice('off')
    const btn = w.find('[data-test="start"]')
    expect(btn.text()).toContain('Nyalain CCTV')
    await btn.trigger('click')
    expect(w.emitted('start')).toHaveLength(1)
  })

  it('bridge never came up → not installed message + Coba lagi (fresh launch)', async () => {
    const w = mountNotice('error')
    expect(w.text()).toContain('AIO CCTV belum kepasang / nggak mau nyala.')
    await w.find('[data-test="start"]').trigger('click')
    expect(w.emitted('start')).toHaveLength(1)
  })

  it('blocked → how to open the permission', async () => {
    const w = mountNotice('blocked')
    expect(w.text()).toContain('Chrome belum ngizinin AIO buka CCTV.')
    expect(w.text()).toContain('ikon gembok')
    expect(w.text()).toContain('Izin situs')
    await w.find('[data-test="retry"]').trigger('click')
    expect(w.emitted('retry')).toHaveLength(1)
  })

  it('busy → another tab', async () => {
    const w = mountNotice('busy')
    expect(w.text()).toContain('CCTV lagi kebuka di tab lain.')
    await w.find('[data-test="retry"]').trigger('click')
    expect(w.emitted('retry')).toHaveLength(1)
  })

  it('checking / starting show progress, no buttons', () => {
    expect(mountNotice('checking').text()).toContain('Lagi ngecek AIO CCTV…')
    const starting = mountNotice('starting')
    expect(starting.text()).toContain('Lagi nyalain AIO CCTV…')
    expect(starting.find('button').exists()).toBe(false)
  })
})
