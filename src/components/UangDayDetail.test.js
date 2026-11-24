import { mount } from '@vue/test-utils'
import UangDayDetail from './UangDayDetail.vue'

const exp = { id: 7, spentOn: '2026-11-09', amount: 18000, note: '', category: { name: 'Ngopi', emoji: '☕', tint: '#FFF3B8' }, source: { name: 'Jago Jajan' } }
const mk = (props = {}) =>
  mount(UangDayDetail, {
    props: { row: { date: '2026-11-15', total: 18_100, jatah: 71_500 }, isToday: true, items: [exp], state: 'ok', ...props },
  })

describe('UangDayDetail', () => {
  it('judul + total hari ini', () => {
    const w = mk()
    expect(w.get('[data-test="day-head"]').text()).toContain('Hari ini · Minggu, 15 Nov')
    expect(w.get('[data-test="day-total"]').text()).toBe('Rp18.100')
  })

  it('baris jatah hari lewat kelewat', () => {
    const w = mk({ row: { date: '2026-11-09', total: 160_000, jatah: 72_000 }, isToday: false })
    const n = w.get('[data-test="day-note"]')
    expect(n.text()).toBe('jatah Rp72.000 · kelewat Rp88.000')
    expect(n.get('span').classes()).toContain('bad')
  })

  it('baris catatan: catatan kosong → nama kategori', async () => {
    const w = mk()
    const r = w.get('[data-test="day-expense"]')
    expect(r.get('.title').text()).toBe('Ngopi')
    expect(r.get('.sub').text()).toBe('Ngopi · Jago Jajan')
    expect(r.get('.amt').text()).toBe('Rp18.000')
    await r.trigger('click')
    expect(w.emitted('open')[0][0].id).toBe(7)
  })

  it('hari kosong ada jatah', () => {
    const w = mk({ row: { date: '2026-11-09', total: 0, jatah: 74_000 }, isToday: false, items: [] })
    const t = w.get('[data-test="day-empty"]').text()
    expect(t).toContain('Nggak ada duit keluar hari itu 👌')
    expect(t).toContain('jatah Rp74.000 utuh')
  })

  it('hari kosong tanpa budget', () => {
    const w = mk({ row: { date: '2026-11-09', total: 0, jatah: null }, isToday: false, items: [] })
    expect(w.get('[data-test="day-empty"]').text()).not.toContain('utuh')
    expect(w.find('[data-test="day-note"]').exists()).toBe(false)
  })

  it('gagal muat → Coba lagi', async () => {
    const w = mk({ state: 'error' })
    expect(w.get('[data-test="day-error"]').text()).toContain('Catatan nggak kemuat.')
    expect(w.find('[data-test="day-expense"]').exists()).toBe(false)
    await w.get('[data-test="day-retry"]').trigger('click')
    expect(w.emitted('retry')).toBeTruthy()
  })

  it('muat + items kosong → kotak kosong tanpa teks', () => {
    const w = mk({ state: 'loading', items: [] })
    expect(w.find('[data-test="day-empty"]').exists()).toBe(false)
    expect(w.find('[data-test="day-error"]').exists()).toBe(false)
    expect(w.find('[data-test="day-expense"]').exists()).toBe(false)
    expect(w.get('.core').text()).toBe('')
  })

  it('muat ulang + items ada → baris tetep tampil', () => {
    const w = mk({ state: 'loading' })
    expect(w.findAll('[data-test="day-expense"]')).toHaveLength(1)
  })

  it('catatan terisi dipakai jadi judul baris', () => {
    const w = mk({ items: [{ ...exp, note: 'Kopi susu' }] })
    expect(w.get('.title').text()).toBe('Kopi susu')
  })

  it('baris jatah hari ini → sisa, kelas good', () => {
    const n = mk().get('[data-test="day-note"]')
    expect(n.text()).toBe('jatah Rp71.500 · sisa Rp53.400')
    expect(n.get('span').classes()).toContain('good')
  })
})
