import { createPinia, setActivePinia } from 'pinia'
import { useAppUpdateStore } from './appUpdate.js'

let store
beforeEach(() => {
  setActivePinia(createPinia())
  store = useAppUpdateStore()
})

describe('appUpdate store', () => {
  it('kapsul keliatan cuma kalau ada versi baru & belum di-✕, nongol lagi abis undismiss', () => {
    expect(store.visible).toBe(false)
    store.markNeedRefresh()
    expect(store.visible).toBe(true)
    store.dismiss()
    expect(store.visible).toBe(false)
    store.undismiss()
    expect(store.visible).toBe(true)
  })

  it('apply nandain lagi muat ulang & manggil applier sekali walau dipencet 2×', () => {
    const applier = vi.fn()
    store.setApplier(applier)
    store.markNeedRefresh()
    store.apply()
    store.apply()
    expect(store.applying).toBe(true)
    expect(applier).toHaveBeenCalledTimes(1)
  })
})
