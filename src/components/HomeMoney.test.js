import { mount } from '@vue/test-utils'
import HomeMoney from './HomeMoney.vue'

const ionRouter = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('@ionic/vue', async (importOriginal) => ({ ...(await importOriginal()), useIonRouter: () => ionRouter }))

const TODAY = '2026-11-16'
const money = (o = {}) => ({ month: '2026-11', total: 2_140_000, todaySpent: 35_000, budget: { total: 4_000_000, left: 1_860_000 }, todayBudget: { jatah: 177_500, spent: 35_000, left: 142_500, monthLeft: 1_860_000, daysLeft: 15 }, ...o })
const owed = (o = {}) => ({ invoices: { total: 31_692_000, count: 2, lateCount: 1, nearestDue: '2026-11-18' }, split: { total: 185_000, people: 3 }, ...o })

const mounted = []
function mountIt(props = {}, media = {}) {
  window.matchMedia = vi.fn((q) => ({ matches: Boolean(media[q]), addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  const w = mount(HomeMoney, { props: { money: money(), owed: owed(), today: TODAY, ...props } })
  mounted.push(w)
  return w
}
beforeEach(() => ionRouter.push.mockClear())
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

describe('HomeMoney', () => {
  it('kartu hitam: sisa jatah, kelewat, tanpa budget', async () => {
    const w = mountIt()
    expect(w.find('[data-test="hero-label"]').text()).toBe('Sisa jatah hari ini')
    expect(w.find('[data-test="hero-value"]').text()).toBe('Rp142.500')
    expect(w.find('[data-test="hero-sub"]').text()).toBe('keluar November Rp2.140.000 dari Rp4.000.000')
    expect(w.find('[data-test="hero-bar"]').attributes('style')).toContain('width: 53.5%')
    expect(w.find('[data-test="hero-bar"]').classes()).not.toContain('over')

    await w.setProps({ money: money({ total: 4_500_000, todayBudget: { jatah: 0, spent: 0, left: -12_000, monthLeft: 0, daysLeft: 1 } }) })
    expect(w.find('[data-test="hero-label"]').text()).toBe('Jatah hari ini kelewat')
    expect(w.find('[data-test="hero-value"]').text()).toBe('−Rp12.000')
    expect(w.find('[data-test="hero-value"]').classes()).toContain('over')
    expect(w.find('[data-test="hero-bar"]').classes()).toContain('over')

    await w.setProps({ money: money({ budget: null, todayBudget: null }) })
    expect(w.find('[data-test="hero-label"]').text()).toBe('Keluar hari ini')
    expect(w.find('[data-test="hero-value"]').text()).toBe('Rp35.000')
    expect(w.find('[data-test="hero-sub"]').text()).toBe('keluar November Rp2.140.000 · belum pasang budget')
    expect(w.find('[data-test="hero-bar"]').exists()).toBe(false)
  })

  it('belum balik: teks + tap ke Invoice & Split bill', async () => {
    const w = mountIt()
    const inv = w.find('[data-test="owed-invoice"]')
    expect(inv.text()).toContain('Invoice belum masuk')
    expect(inv.text()).toContain('Rp31,7jt')
    expect(inv.find('.h-ms').text()).toBe('2 invoice · 1 telat')
    expect(inv.find('.h-ms').classes()).toContain('red')
    const spl = w.find('[data-test="owed-split"]')
    expect(spl.text()).toContain('Split bill belum balik')
    expect(spl.text()).toContain('Rp185rb')
    expect(spl.text()).toContain('3 orang')
    await inv.trigger('click')
    await spl.trigger('click')
    expect(ionRouter.push.mock.calls.map((c) => c[0])).toEqual(['/tabs/menu/invoice', '/tabs/menu/split-bill'])
  })

  it('Cepet & Catat: HP ke layar Catat & form To-do, iPad ke dialog To-do, PC Catat ke Duit & Split bill ke panel daftar; Invoice & Split bill ke Bikin', async () => {
    const targets = async (w) => {
      ionRouter.push.mockClear()
      for (const k of ['catat', 'todo', 'invoice', 'split']) await w.find(`[data-test="quick-${k}"]`).trigger('click')
      await w.find('[data-test="hero-catat"]').trigger('click')
      return ionRouter.push.mock.calls.map((c) => c[0])
    }
    expect(await targets(mountIt())).toEqual(['/tabs/menu/duit/catat', '/tabs/agenda/baru?tanggal=2026-11-16', '/tabs/menu/invoice/baru', '/tabs/menu/split-bill/baru', '/tabs/menu/duit/catat'])
    expect(await targets(mountIt({}, { '(min-width: 768px)': true }))).toEqual(['/tabs/menu/duit/catat', '/tabs/agenda?tambah=todo', '/tabs/menu/invoice/baru', '/tabs/menu/split-bill/baru', '/tabs/menu/duit/catat'])
    expect(await targets(mountIt({}, { '(min-width: 768px)': true, '(min-width: 1100px)': true }))).toEqual(['/tabs/menu/duit', '/tabs/agenda?tambah=todo', '/tabs/menu/invoice/baru', '/tabs/menu/split-bill?baru=1', '/tabs/menu/duit'])
    const labels = mountIt().findAll('.h-qb').map((b) => b.text())
    expect(labels).toEqual(['💸Catat', '✅To-do', '📄Invoice', '🍕Split bill'])
  })
})
