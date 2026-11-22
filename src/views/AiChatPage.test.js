import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { setAiApi, setAiToast } from '@/stores/ai.js'
import AiChatPage from './AiChatPage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
vi.mock('@ionic/vue', async (importOriginal) => ({ ...(await importOriginal()), useIonRouter: () => ionRouter }))

const mounted = []
let api
async function mountPage(url, kind = 'chat') {
  api = { get: vi.fn(async () => ({ id: 3, context: 'gym', kind: 'chat', messages: [], quote: null })), post: vi.fn(async () => ({ id: 3, context: url.includes('/badan/') ? 'badan' : 'gym', kind, messages: [], quote: null })), put: vi.fn(), patch: vi.fn(), del: vi.fn() }
  setAiApi(api)
  setAiToast(vi.fn())
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/tabs/menu/:from/tanya', component: AiChatPage }] })
  router.push(url)
  await router.isReady()
  const w = mount(AiChatPage, { global: { plugins: [pinia, router] }, attachTo: document.body })
  mounted.push(w)
  await flushPromises()
  return w
}
beforeEach(() => {
  Object.values(ionRouter).forEach((f) => f.mockReset?.())
  ionRouter.canGoBack = () => true
})
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

describe('AiChatPage (HP)', () => {
  it('/gym/tanya: obrolan Gym baru, header "‹ Gym"', async () => {
    const w = await mountPage('/tabs/menu/gym/tanya')
    expect(api.post).toHaveBeenCalledWith('/ai/conversations', { context: 'gym' })
    expect(w.find('[data-test="back"]').text()).toBe('Gym')
  })

  it('/badan/tanya: obrolan Badan', async () => {
    const w = await mountPage('/tabs/menu/badan/tanya')
    expect(api.post).toHaveBeenCalledWith('/ai/conversations', { context: 'badan' })
    expect(w.find('[data-test="back"]').text()).toBe('Badan')
  })

  it('?sesi=<id>: obrolan evaluasi sesi itu', async () => {
    await mountPage('/tabs/menu/gym/tanya?sesi=12')
    expect(api.post).toHaveBeenCalledWith('/ai/conversations', { context: 'gym', sessionId: 12 })
  })

  it('?sesi=<id>&dari=riwayat: tombol balik "Riwayat"', async () => {
    const w = await mountPage('/tabs/menu/gym/tanya?sesi=12&dari=riwayat', 'eval')
    expect(w.find('[data-test="back"]').text()).toBe('Riwayat')
  })

  it('?obrolan=<id>: buka obrolan dari riwayat', async () => {
    await mountPage('/tabs/menu/gym/tanya?obrolan=5')
    expect(api.get).toHaveBeenCalledWith('/ai/conversations/5')
  })

  it('tombol balik: kembali ke halaman sebelumnya', async () => {
    const w = await mountPage('/tabs/menu/gym/tanya')
    await w.find('[data-test="back"]').trigger('click')
    expect(ionRouter.back).toHaveBeenCalled()
  })

  it('nggak ada riwayat navigasi: balik ke halaman asal', async () => {
    ionRouter.canGoBack = () => false
    const w = await mountPage('/tabs/menu/badan/tanya')
    await w.find('[data-test="back"]').trigger('click')
    expect(ionRouter.navigate).toHaveBeenCalledWith('/tabs/menu/badan', 'back', 'replace')
  })
})
