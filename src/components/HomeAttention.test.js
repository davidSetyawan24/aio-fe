import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { setHomeApi, useHomeStore } from '@/stores/home.js'
import HomeAttention from './HomeAttention.vue'

const ionRouter = vi.hoisted(() => ({ push: vi.fn() }))
const toastCreate = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  toastController: { create: toastCreate },
}))

const bill = { kind: 'bill', billId: 2, period: '2026-11', name: 'Cicilan motor', emoji: '🏍️', tint: '#FFE9D6', amount: 1_250_000, dueOn: '2026-11-12', status: 'late', lateDays: 4, daysLeft: 0 }
const card = { kind: 'card', sourceId: 10, name: 'CC BCA', bank: 'BCA', dueOn: '2026-11-14', lateDays: 2, daysLeft: 0 }
const invoice = { kind: 'invoice', invoiceId: 7, number: 'INV-7', client: 'PT Maju', amount: 4_500_000, dueOn: '2026-10-30', lateDays: 17, daysLeft: 0 }
const todo = { kind: 'todo', todoId: 3, title: 'Kirim revisi', occurrence: '2026-11-13', recurring: false, lateDays: 3 }
const budget = { kind: 'budget', categoryId: 2, name: 'Ngopi', emoji: '☕', tint: '#FFF3B8', spent: 255_000, budget: 300_000, level: 'warn' }
const extra = (n) => Array.from({ length: n }, (_, i) => ({ ...bill, billId: 100 + i, name: `Tagihan ${i}` }))

let api
const mounted = []
function mountIt(items, put = () => Promise.resolve({})) {
  api = { get: vi.fn(), put: vi.fn(put), del: vi.fn(() => Promise.resolve({})), patch: vi.fn(() => Promise.resolve({})) }
  setHomeApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useHomeStore()
  store.refresh = vi.fn()
  const w = mount(HomeAttention, { props: { items, today: '2026-11-16' }, global: { plugins: [pinia] } })
  mounted.push(w)
  return w
}
beforeEach(() => {
  ionRouter.push.mockClear()
  toastCreate.mockReset().mockResolvedValue({ present: vi.fn() })
})
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

describe('HomeAttention', () => {
  it('baris tiap jenis + tombol / ›', () => {
    const w = mountIt([bill, card, invoice, todo, budget])
    const rows = w.findAll('[data-test="attn-row"]')
    expect(rows).toHaveLength(5)
    expect(rows[0].text()).toContain('Rp1.250.000 · telat 4 hari')
    expect(rows[0].find('button').text()).toBe('Lunas?')
    expect(rows[1].find('button').text()).toBe('Udah bayar?')
    expect(rows[2].find('button').exists()).toBe(false)
    expect(rows[3].find('button').text()).toBe('Beres?')
    expect(rows[4].find('button').exists()).toBe(false)
    expect(rows[4].find('.h-go').exists()).toBe(true)
  })

  it('keterangan cuma boleh pindah baris di " · " (HP: tombol lebar nggak motong kalimat)', () => {
    const w = mountIt([card])
    const segs = w.find('[data-test="attn-row"] small').findAll('.seg').map((s) => s.text())
    expect(segs).toEqual(['Telat 2 hari ·', 'jatuh tempo 14 Nov'])
    expect(w.find('[data-test="attn-row"] small').text()).toBe('Telat 2 hari · jatuh tempo 14 Nov')
  })

  it('badge = yang belum dicentang, 0 → ilang', async () => {
    const w = mountIt([bill, card])
    expect(w.find('[data-test="attn-count"]').text()).toBe('2')
    await w.findAll('button')[0].trigger('click')
    await flushPromises()
    expect(w.find('[data-test="attn-count"]').text()).toBe('1')
    await w.findAll('button')[1].trigger('click')
    await flushPromises()
    expect(w.find('[data-test="attn-count"]').exists()).toBe(false)
  })

  it('kosong → Semua beres. Mantap', () => {
    const w = mountIt([])
    expect(w.text()).toContain('Semua beres. Mantap')
    expect(w.text()).toContain('Nggak ada yang telat atau mepet. Budget juga aman.')
    expect(w.find('[data-test="attn-count"]').exists()).toBe(false)
  })

  it('lebih dari 6 → 6 + "Lihat 2 lagi" → kebuka semua', async () => {
    const w = mountIt(extra(8))
    expect(w.findAll('[data-test="attn-row"]')).toHaveLength(6)
    const more = w.find('[data-test="attn-more"]')
    expect(more.text()).toBe('Lihat 2 lagi')
    await more.trigger('click')
    expect(w.findAll('[data-test="attn-row"]')).toHaveLength(8)
    expect(w.find('[data-test="attn-more"]').exists()).toBe(false)
  })

  it('Lunas? → pudar, dicoret, "Udah dicatet ✓", tombol "Lunas", toast; tap lagi → "Dibatalin"', async () => {
    const w = mountIt([bill])
    await w.find('button').trigger('click')
    await flushPromises()
    const row = w.find('[data-test="attn-row"]')
    expect(row.classes()).toContain('done')
    expect(row.text()).toContain('Udah dicatet ✓')
    expect(w.find('button').text()).toBe('Lunas')
    expect(toastCreate).toHaveBeenLastCalledWith(expect.objectContaining({ message: 'Cicilan motor · lunas ✓', position: 'top', cssClass: 'aio-toast', duration: 2000 }))
    await w.find('button').trigger('click')
    await flushPromises()
    expect(toastCreate).toHaveBeenLastCalledWith(expect.objectContaining({ message: 'Dibatalin' }))
    expect(w.find('[data-test="attn-row"]').classes()).not.toContain('done')
  })

  it('gagal → balik + toast pesan BE', async () => {
    const w = mountIt([bill], () => Promise.reject(Object.assign(new Error('x'), { message: 'Server lagi bermasalah' })))
    await w.find('button').trigger('click')
    await flushPromises()
    expect(w.find('[data-test="attn-row"]').classes()).not.toContain('done')
    expect(w.find('button').text()).toBe('Lunas?')
    expect(toastCreate).toHaveBeenLastCalledWith(expect.objectContaining({ message: 'Server lagi bermasalah' }))
  })

  it('tap dobel → 1 permintaan', async () => {
    let release
    const w = mountIt([bill], () => new Promise((r) => (release = r)))
    const btn = w.find('button')
    await btn.trigger('click')
    await btn.trigger('click')
    expect(api.put).toHaveBeenCalledTimes(1)
    expect(btn.attributes('disabled')).toBeDefined()
    release({})
    await flushPromises()
  })

  it('tap baris → tujuan per jenis; tap tombol nggak pindah halaman', async () => {
    const w = mountIt([bill, card, invoice, todo, budget])
    const rows = w.findAll('[data-test="attn-row"]')
    const targets = ['/tabs/menu/bayar-rutin', '/tabs/uang', '/tabs/menu/invoice/7', '/tabs/agenda?tanggal=2026-11-16', '/tabs/menu/budget']
    for (const [i, to] of targets.entries()) {
      await rows[i].trigger('click')
      expect(ionRouter.push).toHaveBeenLastCalledWith(to)
    }
    ionRouter.push.mockClear()
    await rows[0].find('button').trigger('click')
    await flushPromises()
    expect(ionRouter.push).not.toHaveBeenCalled()
  })
})
