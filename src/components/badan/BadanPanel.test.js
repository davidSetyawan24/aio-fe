import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { setBadanApi, useBadanStore } from '@/stores/badan.js'
import BadanPanel from './BadanPanel.vue'
import BadanSleepUpload from './BadanSleepUpload.vue'
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

  it('sleepDetail view: shows the sleep detail, Ubah asks for sleepEdit; sleepEdit back asks for sleepDetail', async () => {
    setBadanApi({ get: vi.fn(async () => ({ weighings: [], target: null, activity: null, sleeps: [{ id: 8, sleptOn: '2026-11-17', bedAt: null, wakeAt: null, totalMin: 400, deepMin: null, lightMin: null, remMin: null, score: null, awakeCount: null, avgHr: null, avgHrv: null, source: 'manual' }] })), post: vi.fn(), patch: vi.fn(), put: vi.fn(), del: vi.fn() })
    setActivePinia(createPinia())
    await useBadanStore().load()
    w = mount(BadanPanel, { props: { open: true, view: 'sleepDetail', id: 8, formKey: 1 }, attachTo: document.body })
    await flushPromises()
    const aside = document.querySelector('[data-test="panel"]')
    expect(aside.querySelector('[data-test="panel-title"]').textContent).toBe('Detail tidur')
    expect(aside.querySelector('[data-test="panel-back"]')).toBeNull()
    aside.querySelector('[data-test="edit"]').click()
    expect(w.emitted('sleepEdit')[0]).toEqual([8])
    await w.setProps({ view: 'sleepEdit' })
    expect(aside.querySelector('[data-test="panel-title"]').textContent).toBe('Ubah tidur')
    expect(aside.querySelector('[data-test="panel-sub"]').textContent).toBe('Selasa, 17 November')
    aside.querySelector('[data-test="panel-back"]').click()
    expect(w.emitted('sleepDetail')[0]).toEqual([8])
  })

  it('sleepUpload view: title/sub follow the stage, panel goes wide after pick, Isi manual asks for sleepManual', async () => {
    w = mount(BadanPanel, { props: { open: true, view: 'sleepUpload', formKey: 1 }, attachTo: document.body })
    await flushPromises()
    const aside = document.querySelector('[data-test="panel"]')
    expect(aside.querySelector('[data-test="panel-title"]').textContent).toBe('Upload tidur')
    expect(aside.querySelector('[data-test="panel-sub"]').textContent).toBe('Dari gambar Huawei Health.')
    expect(aside.classList.contains('wide')).toBe(false)
    const up = w.findComponent(BadanSleepUpload)
    up.vm.$emit('stage', 'load')
    await flushPromises()
    expect(aside.classList.contains('wide')).toBe(true)
    expect(aside.querySelector('[data-test="panel-sub"]').textContent).toBe('Bentar ya.')
    up.vm.$emit('stage', 'fail')
    await flushPromises()
    expect(aside.querySelector('[data-test="panel-title"]').textContent).toBe('Upload tidur')
    expect(aside.querySelector('[data-test="panel-sub"]').textContent).toBe('Gambarnya nggak bisa dibaca.')
    up.vm.$emit('stage', 'result')
    await flushPromises()
    expect(aside.querySelector('[data-test="panel-title"]').textContent).toBe('Hasil bacaan tidur')
    expect(aside.querySelector('[data-test="panel-sub"]').textContent).toBe('Cek dulu angkanya, terus Simpen.')
    up.vm.$emit('manual')
    expect(w.emitted('sleepManual')).toHaveLength(1)
    up.vm.$emit('open', 4)
    expect(w.emitted('sleepDetail')[0]).toEqual([4])
    up.vm.$emit('done', 'Data tidur kesimpen ✓')
    expect(w.emitted('done')[0]).toEqual(['Data tidur kesimpen ✓'])
  })
})
