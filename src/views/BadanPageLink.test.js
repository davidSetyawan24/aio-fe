import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { setBadanApi } from '@/stores/badan.js'
import BadanPage from './BadanPage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
const route = vi.hoisted(() => ({ path: '/tabs/menu/badan', query: {} }))
const router = vi.hoisted(() => ({ replace: vi.fn() }))
vi.mock('@ionic/vue', async (importOriginal) => ({ ...(await importOriginal()), useIonRouter: () => ionRouter }))
vi.mock('vue-router', async (importOriginal) => ({ ...(await importOriginal()), useRoute: () => route, useRouter: () => router }))

const row = { id: 4, weighedOn: '2026-11-17', weighedAt: '06:12', weight: 75, fat: 28, muscle: 52, water: 50, visceral: 9, bone: 2.9, protein: 17, bmr: 1600, bmi: 24.6, score: 80, bodyType: null, source: 'scan' }

async function mountAt(query, width = 1440) {
  route.query = query
  window.matchMedia = (q) => ({ matches: width >= Number(/min-width:\s*(\d+)px/.exec(q)?.[1] ?? 0), addEventListener: () => {}, removeEventListener: () => {} })
  setBadanApi({ get: vi.fn(async () => ({ weighings: [row], target: null })), post: vi.fn(), patch: vi.fn(), put: vi.fn(), del: vi.fn() })
  setActivePinia(createPinia())
  const w = mount(BadanPage, { global: { plugins: [createPinia()] }, attachTo: document.body })
  await flushPromises()
  return w
}

beforeEach(() => {
  router.replace.mockReset()
  document.body.appendChild(document.createElement('ion-app'))
})
afterEach(() => document.querySelectorAll('ion-app').forEach((e) => e.remove()))

describe('BadanPage ?panel= link', () => {
  it('opens the detail panel for a known id and drops the query', async () => {
    const w = await mountAt({ panel: 'detail', id: '4' })
    expect(w.vm.panel).toMatchObject({ open: true, view: 'detail', id: 4 })
    expect(router.replace).toHaveBeenCalledWith({ path: '/tabs/menu/badan', query: {} })
    w.unmount()
  })

  it('opens manual without an id, ignores unknown ids and views', async () => {
    const a = await mountAt({ panel: 'manual' })
    expect(a.vm.panel).toMatchObject({ open: true, view: 'manual' })
    a.unmount()
    const b = await mountAt({ panel: 'detail', id: '99' })
    expect(b.vm.panel.open).toBe(false)
    b.unmount()
    const c = await mountAt({ panel: 'ngaco' })
    expect(c.vm.panel.open).toBe(false)
    c.unmount()
  })
})
