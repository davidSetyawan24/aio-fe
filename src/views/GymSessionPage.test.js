import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { makeReport } from '@/test/gymReportFixture.js'
import { setGymApi, setGymStorage, useGymStore } from '@/stores/gym.js'
import GymSessionPage from './GymSessionPage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn(), replace: vi.fn() }))
const sheet = vi.hoisted(() => ({ create: vi.fn(), pick: undefined }))
const toast = vi.hoisted(() => ({ create: vi.fn() }))
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  actionSheetController: { create: sheet.create },
  toastController: { create: toast.create },
}))

const mounted = []
let api
let router
function stubMedia(width) {
  window.matchMedia = (query) => {
    const min = Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0)
    return { matches: width >= min, addEventListener: () => {}, removeEventListener: () => {} }
  }
}
async function mountPage({ path = '/tabs/menu/gym/riwayat/20', width = 390, report = makeReport(), cached = false, missing = false } = {}) {
  stubMedia(width)
  setGymStorage({ getItem: () => null, setItem: () => {}, removeItem: () => {} })
  api = {
    get: vi.fn(async (url) => (missing && url !== '/gym' ? Promise.reject(Object.assign(new Error('Sesinya nggak ketemu.'), { status: 404 })) : url === '/gym' ? { programs: [], exercises: [], active: null, recent: [], week: { days: [], count: 0, minutes: 0 }, totalSessions: 0, firstOn: null, mini: null } : report)),
    post: vi.fn(), patch: vi.fn(), put: vi.fn(async () => report), del: vi.fn(async () => null),
  }
  setGymApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  if (cached) useGymStore().reports[20] = report
  router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/tabs/menu/gym/riwayat', component: { template: '<i />' } }, { path: '/tabs/menu/gym/riwayat/:id', component: GymSessionPage }, { path: '/tabs/menu/gym/riwayat/:id/ubah', component: GymSessionPage }] })
  router.push(path)
  await router.isReady()
  const w = mount(GymSessionPage, { global: { plugins: [pinia, router] }, attachTo: document.body })
  mounted.push(w)
  await flushPromises()
  return w
}
beforeEach(() => {
  Object.values(ionRouter).forEach((f) => f.mockReset?.())
  ionRouter.canGoBack = () => true
  sheet.pick = undefined
  sheet.create.mockReset().mockImplementation(async () => ({ present: vi.fn(), onDidDismiss: async () => ({ data: sheet.pick }) }))
  toast.create.mockReset().mockResolvedValue({ present: vi.fn() })
  document.body.appendChild(document.createElement('ion-app'))
})
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  document.querySelectorAll('ion-app').forEach((e) => e.remove())
})
const q = (w, t) => w.find(`[data-test="${t}"]`)

describe('GymSessionPage (HP)', () => {
  it('detail: judul, tanggal, Durasi/Volume(±%)/Set, set per gerakan + chip PR', async () => {
    const w = await mountPage()
    expect(w.find('h1').text()).toContain('Push')
    expect(w.find('h1').text()).toContain('23 Nov · 18.05–19.17')
    expect(q(w, 'stat-dur').text()).toBe('1 j 12 m')
    expect(q(w, 'stat-vol').text()).toContain('9.120')
    expect(q(w, 'vol-chip').text()).toBe('-9%')
    expect(q(w, 'stat-sets').text()).toBe('6')
    const dex = w.findAll('[data-test="dex"]')
    expect(dex).toHaveLength(5)
    expect(dex[0].text()).toContain('Incline Dumbbell Press')
    expect(dex[0].find('[data-test="pr-chip"]').exists()).toBe(true)
    expect(dex[0].findAll('[data-test="dset"]')[0].text()).toContain('25 kg × 8')
    expect(dex[0].findAll('[data-test="dset"]')[0].text()).toContain('200 kg')
    expect(dex[2].find('[data-test="pr-chip"]').exists()).toBe(false)
  })

  it('gerakan di luar rencana ditandain "tambahan"', async () => {
    const w = await mountPage()
    const dex = w.findAll('[data-test="dex"]')
    expect(dex[4].text()).toContain('Lateral Raise')
    expect(dex[4].text()).toContain('tambahan')
    expect(dex[0].text()).not.toContain('tambahan')
  })

  it('Ubah → ke halaman ubah', async () => {
    const w = await mountPage({ cached: true })
    await q(w, 'edit').trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/gym/riwayat/20/ubah')
  })

  it('di /ubah: judul "Ubah sesi." + form; simpen → balik', async () => {
    const w = await mountPage({ path: '/tabs/menu/gym/riwayat/20/ubah' })
    expect(w.find('h1').text()).toContain('Ubah sesi.')
    expect(q(w, 'form').exists()).toBe(true)
    await q(w, 'form').trigger('submit')
    await flushPromises()
    expect(api.put).toHaveBeenCalled()
    expect(ionRouter.back).toHaveBeenCalled()
  })

  it('Hapus sesi → action sheet, Batal = nggak ngapa-ngapain', async () => {
    const w = await mountPage()
    await q(w, 'delete').trigger('click')
    await flushPromises()
    const opts = sheet.create.mock.calls[0][0]
    expect(opts.header).toBe('Hapus sesi Push 23 Nov?')
    expect(opts.subHeader).toBe('6 set ilang dari riwayat & grafik. PR dihitung ulang.')
    expect(opts.buttons[0]).toMatchObject({ text: 'Hapus sesi', role: 'destructive' })
    expect(opts.buttons[1]).toMatchObject({ text: 'Batal', role: 'cancel' })
    expect(api.del).not.toHaveBeenCalled()
  })

  it('Hapus sesi → DELETE, toast "Sesi dihapus", balik ke riwayat', async () => {
    const w = await mountPage()
    sheet.pick = 'delete'
    await q(w, 'delete').trigger('click')
    await flushPromises()
    expect(api.del).toHaveBeenCalledWith('/gym/sessions/20')
    expect(toast.create).toHaveBeenCalledWith(expect.objectContaining({ message: 'Sesi dihapus' }))
    expect(ionRouter.navigate).toHaveBeenCalledWith('/tabs/menu/gym/riwayat', 'back', 'replace')
  })

  it('hapus gagal → toast error, tetep di detail', async () => {
    const w = await mountPage()
    api.del.mockRejectedValue(new Error('Gagal.'))
    sheet.pick = 'delete'
    await q(w, 'delete').trigger('click')
    await flushPromises()
    expect(ionRouter.navigate).not.toHaveBeenCalled()
    expect(toast.create).toHaveBeenCalledWith(expect.objectContaining({ message: 'Gagal.' }))
  })

  it('sesi nggak ketemu → pesan server + Coba lagi', async () => {
    const w = await mountPage({ missing: true })
    expect(q(w, 'failed').text()).toContain('Sesinya nggak ketemu.')
    expect(q(w, 'edit').exists()).toBe(false)
  })
})

describe('GymSessionPage (PC)', () => {
  it('≥1100: dialihin ke riwayat?sesi=:id', async () => {
    await mountPage({ width: 1440 })
    expect(router.currentRoute.value.path).toBe('/tabs/menu/gym/riwayat')
    expect(router.currentRoute.value.query.sesi).toBe('20')
    expect(router.currentRoute.value.query.ubah).toBeUndefined()
  })

  it('≥1100 di /ubah: ?sesi=:id&ubah=1', async () => {
    await mountPage({ width: 1440, path: '/tabs/menu/gym/riwayat/20/ubah' })
    expect(router.currentRoute.value.query).toMatchObject({ sesi: '20', ubah: '1' })
  })
})
