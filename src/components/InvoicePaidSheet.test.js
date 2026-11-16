import { mount } from '@vue/test-utils'
import InvoicePaidSheet from './InvoicePaidSheet.vue'

const mountSheet = (props = {}) =>
  mount(InvoicePaidSheet, { props: { open: true, today: '2026-11-16', issuedOn: '2026-11-10', ...props }, global: { stubs: { teleport: true } } })

describe('InvoicePaidSheet', () => {
  it('chip Hari ini & Kemarin dengan tanggal', () => {
    const w = mountSheet()
    expect(w.find('[data-test="pick-today"]').text()).toBe('Hari ini · 16 Nov')
    expect(w.find('[data-test="pick-yest"]').text()).toBe('Kemarin · 15 Nov')
  })

  it('default hari ini', async () => {
    const w = mountSheet()
    await w.find('[data-test="ok"]').trigger('click')
    expect(w.emitted('done')[0]).toEqual(['2026-11-16'])
  })

  it('pilih Kemarin', async () => {
    const w = mountSheet()
    await w.find('[data-test="pick-yest"]').trigger('click')
    await w.find('[data-test="ok"]').trigger('click')
    expect(w.emitted('done')[0]).toEqual(['2026-11-15'])
  })

  it('Kemarin mati kalau sebelum tanggal invoice', () => {
    const w = mountSheet({ issuedOn: '2026-11-16' })
    expect(w.find('[data-test="pick-yest"]').attributes('disabled')).toBeDefined()
  })

  it('Pilih… : kalender dibatasi tanggal invoice s.d. hari ini', async () => {
    const w = mountSheet()
    const input = w.find('[data-test="pick-date"]')
    expect(input.attributes('min')).toBe('2026-11-10')
    expect(input.attributes('max')).toBe('2026-11-16')
    input.element.value = '2026-11-12'
    await input.trigger('change')
    expect(w.find('[data-test="pick-custom"]').text()).toBe('12 Nov')
    await w.find('[data-test="ok"]').trigger('click')
    expect(w.emitted('done')[0]).toEqual(['2026-11-12'])
  })

  it('tanggal di luar batas ditolak', async () => {
    const w = mountSheet()
    const input = w.find('[data-test="pick-date"]')
    input.element.value = '2026-11-20'
    await input.trigger('change')
    await w.find('[data-test="ok"]').trigger('click')
    expect(w.emitted('done')[0]).toEqual(['2026-11-16'])
  })

  it('Batal menutup', async () => {
    const w = mountSheet()
    await w.find('[data-test="cancel"]').trigger('click')
    expect(w.emitted('close')).toBeTruthy()
  })
})
