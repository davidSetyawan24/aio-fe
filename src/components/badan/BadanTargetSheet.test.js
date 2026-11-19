import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/lib/api.js'
import { setBadanApi } from '@/stores/badan.js'
import BadanTargetSheet from './BadanTargetSheet.vue'

const toast = vi.hoisted(() => vi.fn())
vi.mock('@/lib/personalForm.js', async (importOriginal) => ({ ...(await importOriginal()), showToast: toast }))

const target = { arah: 'recomp', fat: 20, muscle: 55, weightMin: 73, weightMax: 76, startedOn: '2026-11-01' }
const summary = { fat: 25.6, muscle: 52.85, weight: 74.9 }

let api
let mounted
let host
function make(props = {}) {
  host = document.createElement('ion-app')
  document.body.appendChild(host)
  api = { get: vi.fn(async () => ({ weighings: [], target: null })), post: vi.fn(), patch: vi.fn(), put: vi.fn(async () => ({})), del: vi.fn(async () => ({})) }
  setBadanApi(api)
  setActivePinia(createPinia())
  mounted = mount(BadanTargetSheet, { props: { open: true, target, summary, ...props }, attachTo: document.body })
  return mounted
}
const q = (sel) => document.querySelector(sel)
const type = async (sel, v) => {
  const el = q(sel)
  el.value = v
  el.dispatchEvent(new Event('input'))
  await flushPromises()
}
const submit = async () => {
  q('[data-test="target-form"]').dispatchEvent(new Event('submit', { cancelable: true }))
  await flushPromises()
}

beforeEach(() => toast.mockReset())
afterEach(() => {
  mounted?.unmount()
  host?.remove()
})

describe('BadanTargetSheet', () => {
  it('shows the existing target, "sekarang" averages and delete link', () => {
    make()
    expect(q('[data-test="t-fat"]').value).toBe('20')
    expect(q('[data-test="t-min"]').value).toBe('73')
    expect(document.body.textContent).toContain('sekarang 25,6%')
    expect(document.body.textContent).toContain('sekarang 74,9 kg')
    expect(q('[data-test="target-delete"]')).not.toBeNull()
  })

  it('saves decimal-comma numbers as numbers', async () => {
    make({ target: null })
    q('[data-arah="cutting"]').click()
    await type('[data-test="t-fat"]', '19,5')
    await type('[data-test="t-min"]', '73')
    await type('[data-test="t-max"]', '76,5')
    await submit()
    expect(api.put).toHaveBeenCalledWith('/body/target', { arah: 'cutting', fat: 19.5, muscle: null, weightMin: 73, weightMax: 76.5 })
    expect(toast).toHaveBeenCalledWith('Target kesimpen ✓')
    expect(mounted.emitted('close')).toBeTruthy()
  })

  it('refuses only one side of the weight range', async () => {
    make({ target: null })
    await type('[data-test="t-min"]', '73')
    await submit()
    expect(q('[data-test="err-max"]').textContent).toBe('Isi dua-duanya atau kosongin dua-duanya.')
    expect(api.put).not.toHaveBeenCalled()
  })

  it('refuses min >= max and out of range', async () => {
    make({ target: null })
    await type('[data-test="t-min"]', '80')
    await type('[data-test="t-max"]', '76')
    await type('[data-test="t-fat"]', '90')
    await submit()
    expect(q('[data-test="err-max"]').textContent).toBe('Paling ringan harus di bawah paling berat.')
    expect(q('[data-test="err-fat"]').textContent).toContain('di luar rentang wajar')
    expect(api.put).not.toHaveBeenCalled()
  })

  it('shows the server 422 message per field and stays open', async () => {
    make()
    api.put.mockRejectedValue(new ApiError('Ada yang salah.', 422, { weightMax: ['Pesan dari server.'] }))
    await submit()
    expect(q('[data-test="err-max"]').textContent).toBe('Pesan dari server.')
    expect(mounted.emitted('close')).toBeFalsy()
  })

  it('deletes the target directly', async () => {
    make()
    q('[data-test="target-delete"]').click()
    await flushPromises()
    expect(api.del).toHaveBeenCalledWith('/body/target')
    expect(toast).toHaveBeenCalledWith('Target dihapus')
    expect(mounted.emitted('close')).toBeTruthy()
  })

  it('hides delete without a target', () => {
    make({ target: null })
    expect(q('[data-test="target-delete"]')).toBeNull()
  })

  it('shows the arah-change hint only when the arah differs from the saved one', async () => {
    make()
    expect(q('[data-test="arah-change"]')).toBeNull()
    q('[data-arah="bulking"]').click()
    await flushPromises()
    expect(q('[data-test="arah-change"]').textContent).toContain('Ganti arah = progres mulai dari nol (riwayat tetep).')
    expect(q('[data-test="arah-info"]').textContent).toContain('Fokus nambah otot')
    q('[data-arah="recomp"]').click()
    await flushPromises()
    expect(q('[data-test="arah-change"]')).toBeNull()
  })
})
