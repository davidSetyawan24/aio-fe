import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { reactive } from 'vue'
import { addDays } from '@/lib/agenda.js'
import { wibNow } from '@/lib/home.js'
import { setBadanApi } from '@/stores/badan.js'
import BadanPage from './BadanPage.vue'

/** Pilihan chip grafik: balik dari halaman anak Badan tetep, masuk dari luar balik ke bawaan. */
const hooks = vi.hoisted(() => ({ enter: [], leave: [] }))
const route = vi.hoisted(() => ({ value: null }))
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }),
  onIonViewWillEnter: (fn) => hooks.enter.push(fn),
  onIonViewWillLeave: (fn) => hooks.leave.push(fn),
}))
vi.mock('vue-router', async (importOriginal) => ({ ...(await importOriginal()), useRoute: () => route.value, useRouter: () => undefined }))

const TODAY = wibNow().date
const weighings = Array.from({ length: 10 }, (_, i) => ({
  id: 100 - i, weighedOn: addDays(TODAY, -i), weighedAt: '06:42', weight: 74, fat: 28, muscle: 52, water: 50, visceral: 9, bone: 2.9, protein: 17, bmr: 1600, bmi: 24.6, score: 80,
  bodyType: 'thick_set', source: 'scan',
}))

let w
beforeEach(async () => {
  hooks.enter.length = 0
  hooks.leave.length = 0
  route.value = reactive({ path: '/tabs/menu/badan', query: {} })
  window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })
  setBadanApi({ get: vi.fn(async () => ({ weighings, target: null })), post: vi.fn(), patch: vi.fn(), put: vi.fn(), del: vi.fn() })
  setActivePinia(createPinia())
  document.body.appendChild(document.createElement('ion-app'))
  w = mount(BadanPage, { attachTo: document.body })
  hooks.enter.forEach((f) => f())
  await flushPromises()
})
afterEach(() => {
  w.unmount()
  document.querySelectorAll('ion-app').forEach((e) => e.remove())
})

const chips = () => w.findAll('.b-mc.on').map((c) => c.text())
async function leaveTo(path) {
  route.value.path = path
  hooks.leave.forEach((f) => f())
  route.value.path = '/tabs/menu/badan'
  hooks.enter.forEach((f) => f())
  await flushPromises()
}

describe('BadanPage — chip grafik pas balik', () => {
  it('balik dari detail / form Badan: pilihan tetep', async () => {
    await w.find('[data-test="chip-water"]').trigger('click')
    expect(chips()).toEqual(['Lemak', 'Otot', 'Berat', 'Air'])
    await leaveTo('/tabs/menu/badan/100')
    expect(chips()).toEqual(['Lemak', 'Otot', 'Berat', 'Air'])
    await leaveTo('/tabs/menu/badan/catat')
    expect(chips()).toEqual(['Lemak', 'Otot', 'Berat', 'Air'])
  })
  it('keluar Badan terus masuk lagi: balik ke Lemak, Otot, Berat', async () => {
    await w.find('[data-test="chip-water"]').trigger('click')
    await leaveTo('/tabs/menu')
    expect(chips()).toEqual(['Lemak', 'Otot', 'Berat'])
  })
})
