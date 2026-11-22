import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { setAiApi, setAiToast } from '@/stores/ai.js'
import AiChatPanel from './AiChatPanel.vue'

const mounted = []
let api
async function mountPanel(props = {}) {
  api = { get: vi.fn(), post: vi.fn(async () => ({ id: 1, context: 'gym', kind: 'chat', messages: [], quote: null })), put: vi.fn(), patch: vi.fn(), del: vi.fn() }
  setAiApi(api)
  setAiToast(vi.fn())
  const pinia = createPinia()
  setActivePinia(pinia)
  const w = mount(AiChatPanel, { props: { open: true, context: 'gym', formKey: 1, ...props }, global: { plugins: [pinia] }, attachTo: document.body })
  mounted.push(w)
  await flushPromises()
  return w
}
beforeEach(() => document.body.appendChild(document.createElement('ion-app')))
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  document.querySelectorAll('ion-app').forEach((e) => e.remove())
})
const panel = () => document.querySelector('ion-app [data-test="panel"]')

describe('AiChatPanel (PC)', () => {
  it('dipasang di ion-app, kebuka, isinya chat dengan tombol ✕', async () => {
    await mountPanel()
    expect(panel().classList.contains('show')).toBe(true)
    expect(panel().querySelector('[data-test="close"]')).not.toBeNull()
    expect(panel().querySelector('[data-test="back"]')).toBeNull()
    expect(api.post).toHaveBeenCalledWith('/ai/conversations', { context: 'gym' })
  })

  it('belum pernah dibuka: nggak masang apa-apa', async () => {
    await mountPanel({ open: false })
    expect(panel()).toBeNull()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('✕ emit close', async () => {
    const w = await mountPanel()
    panel().querySelector('[data-test="close"]').click()
    expect(w.emitted('close')).toHaveLength(1)
  })

  it('Esc nutup, kecuali ada action sheet / alert Ionic kebuka', async () => {
    const w = await mountPanel()
    const sheet = document.createElement('ion-action-sheet')
    document.body.appendChild(sheet)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(w.emitted('close')).toBeUndefined()
    sheet.remove()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(w.emitted('close')).toHaveLength(1)
  })

  it('formKey baru → obrolan kebuka ulang (konteks / sesi baru)', async () => {
    const w = await mountPanel({ sessionId: 4 })
    expect(api.post).toHaveBeenLastCalledWith('/ai/conversations', { context: 'gym', sessionId: 4 })
    await w.setProps({ sessionId: 9, formKey: 2 })
    await flushPromises()
    expect(api.post).toHaveBeenLastCalledWith('/ai/conversations', { context: 'gym', sessionId: 9 })
  })

  it('ditutup: panel geser keluar (kelas show ilang), nggak dicopot', async () => {
    const w = await mountPanel()
    await w.setProps({ open: false })
    await flushPromises()
    expect(panel().classList.contains('show')).toBe(false)
  })
})
