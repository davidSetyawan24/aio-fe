import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { setBadanApi } from '@/stores/badan.js'
import BadanPanel from './BadanPanel.vue'
import BadanUpload from './BadanUpload.vue'

let w
beforeEach(() => {
  document.body.appendChild(document.createElement('ion-app'))
  setBadanApi({ get: vi.fn(async () => ({ weighings: [], target: null })), post: vi.fn(), patch: vi.fn(), put: vi.fn(), del: vi.fn() })
  setActivePinia(createPinia())
})
afterEach(() => {
  w?.unmount()
  document.querySelectorAll('ion-app').forEach((e) => e.remove())
})

describe('BadanPanel', () => {
  it('upload ganti tahap → panel di-scroll balik ke atas + judul ikut tahap', async () => {
    w = mount(BadanPanel, { props: { open: true, view: 'upload', formKey: 1 }, attachTo: document.body })
    await flushPromises()
    const aside = document.querySelector('[data-test="panel"]')
    let top = 640
    Object.defineProperty(aside, 'scrollTop', {
      configurable: true,
      get: () => top,
      set(v) {
        top = v
      },
    })
    w.findComponent(BadanUpload).vm.$emit('stage', 'load')
    await flushPromises()
    expect(top).toBe(0)
    top = 900
    w.findComponent(BadanUpload).vm.$emit('stage', 'result')
    await flushPromises()
    expect(top).toBe(0)
    expect(aside.querySelector('[data-test="panel-title"]').textContent).toBe('Hasil bacaan')
  })
})
