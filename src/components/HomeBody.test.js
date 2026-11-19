import { mount } from '@vue/test-utils'
import HomeBody from './HomeBody.vue'

const ionRouter = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('@ionic/vue', async (importOriginal) => ({ ...(await importOriginal()), useIonRouter: () => ionRouter }))

const TODAY = '2026-11-19'
const body = (o = {}) => ({
  lastOn: '2026-11-19', lastAt: '06:42', from: '2026-11-13', to: '2026-11-19', count: 5, arah: 'cutting',
  fat: 21.4, muscle: 33.5, weight: 73.9,
  deltas: { fat: -0.6, muscle: 0.2, weight: -0.5 },
  tones: { fat: 'good', muscle: 'good', weight: 'good' },
  weightGoal: { mode: 'reach', state: 'progress', goal: 69, min: 65, max: 69, pct: 40, left: 4.9 },
  spark: [22, 21.8, 21.6, 21.4],
  ...o,
})
const mounted = []
const mountIt = (props = {}) => {
  const w = mount(HomeBody, { props: { body: body(), today: TODAY, ...props } })
  mounted.push(w)
  return w
}
beforeEach(() => ionRouter.push.mockClear())
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

describe('HomeBody', () => {
  it('body null: nggak dirender', () => {
    expect(mountIt({ body: null }).find('[data-test="home-body"]').exists()).toBe(false)
  })
  it('cutting: kurang X kg ke 69, panah & hari', () => {
    const w = mountIt()
    expect(w.text()).toContain('kurang 4,9 kg ke 69')
    expect(w.text()).toContain('timbang terakhir hari ini, 06.42')
    expect(w.find('[data-test="hb-fat"]').text()).toBe('↓0,6')
    expect(w.find('[data-test="hb-fat"]').classes()).toContain('good')
  })
  it('jaga: aman / di luar kisaran; tanpa target: panah mingguan', () => {
    expect(mountIt({ body: body({ weightGoal: { mode: 'keep', inRange: true, min: 65, max: 69 } }) }).text()).toContain('aman di kisaran')
    expect(mountIt({ body: body({ weightGoal: { mode: 'keep', inRange: false, min: 65, max: 69 } }) }).text()).toContain('di luar kisaran 65–69')
    expect(mountIt({ body: body({ weightGoal: null }) }).find('[data-test="hb-weight"]').text()).toBe('↓0,5')
  })
  it('di luar kisaran: kuning (warn), bukan merah', () => {
    const w = mountIt({ body: body({ weightGoal: { mode: 'reach', state: 'above', goal: 69, min: 65, max: 69 } }) })
    expect(w.find('[data-test="hb-weight"]').text()).toBe('di atas kisaran 65–69')
    expect(w.find('[data-test="hb-weight"]').classes()).toContain('warn')
    expect(w.find('[data-test="hb-weight"]').classes()).not.toContain('bad')
  })
  it('judul ikut banyaknya timbangan: 3+ rata-rata 7 hari, 2 timbangan, 1 = timbangan terakhir', () => {
    expect(mountIt().find('[data-test="hb-label"]').text()).toBe('Rata-rata 7 hari')
    expect(mountIt({ body: body({ count: 2 }) }).find('[data-test="hb-label"]').text()).toBe('Rata-rata 2 timbangan')
    const one = mountIt({ body: body({ count: 1, spark: [] }) })
    expect(one.find('[data-test="hb-label"]').text()).toBe('Timbangan terakhir')
    expect(one.text()).not.toContain('Rata-rata 7 hari')
    expect(one.text()).not.toContain('rata-rata 7 hari')
  })
  it('angka kosong: "–" tanpa satuan', () => {
    const w = mountIt({ body: body({ fat: null, muscle: null }) })
    expect(w.findAll('.hb-v').map((v) => v.text())).toEqual(['–', '–', '73,9kg'])
  })
  it('cutting yang awalnya udah lewat goal lalu naik lagi: kurang = sekarang − goal, bukan 0', () => {
    const w = mountIt({ body: body({ weight: 71.2, weightGoal: { mode: 'reach', state: 'progress', goal: 69, min: 65, max: 69, pct: 100, left: 0 } }) })
    expect(w.find('[data-test="hb-weight"]').text()).toBe('kurang 2,2 kg ke 69')
  })
  it('judul "Badan ›" = link ke halaman Badan', async () => {
    await mountIt().find('[data-test="home-body-link"]').trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/badan')
  })
  it('tap: ke halaman Badan', async () => {
    await mountIt().find('[data-test="home-body-card"]').trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/badan')
  })
})
