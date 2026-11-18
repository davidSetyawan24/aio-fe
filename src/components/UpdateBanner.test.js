import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useAppUpdateStore } from '@/stores/appUpdate.js'
import UpdateBanner from './UpdateBanner.vue'

function mountBanner(props = {}) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useAppUpdateStore()
  const w = mount(UpdateBanner, { props, global: { plugins: [pinia] } })
  return { w, store }
}

describe('UpdateBanner', () => {
  it('nggak keliatan kalau nggak ada versi baru', () => {
    const { w } = mountBanner()
    expect(w.find('.upd-cap').exists()).toBe(false)
  })

  it('nampilin teks versi baru pas ada', async () => {
    const { w, store } = mountBanner()
    store.markNeedRefresh()
    await w.vm.$nextTick()
    expect(w.find('.upd-cap').text()).toContain('Ada versi baru AIO')
    expect(w.find('.upd-cap').text()).toContain('Biar pakai yang terbaru')
  })

  it('Muat ulang: manggil apply sekali, tombol mati, teks lagi muat ulang, ✕ ilang', async () => {
    const { w, store } = mountBanner()
    const applier = vi.fn()
    store.setApplier(applier)
    store.markNeedRefresh()
    await w.vm.$nextTick()
    const go = w.find('[data-test="upd-go"]')
    await go.trigger('click')
    await go.trigger('click')
    expect(applier).toHaveBeenCalledTimes(1)
    expect(w.find('[data-test="upd-go"]').attributes('disabled')).toBeDefined()
    expect(w.text()).toContain('Lagi muat ulang…')
    expect(w.find('[aria-label="Nanti aja"]').exists()).toBe(false)
  })

  it('tanpa sidebar (login/splash) kapsul di tengah layar penuh', async () => {
    const { w, store } = mountBanner({ noSidebar: true })
    store.markNeedRefresh()
    await w.vm.$nextTick()
    expect(w.find('.upd-cap').classes()).toContain('upd-solo')
    const other = mountBanner()
    other.store.markNeedRefresh()
    await other.w.vm.$nextTick()
    expect(other.w.find('.upd-cap').classes()).not.toContain('upd-solo')
  })

  it('✕ nyembunyiin kapsul', async () => {
    const { w, store } = mountBanner()
    store.markNeedRefresh()
    await w.vm.$nextTick()
    await w.find('[aria-label="Nanti aja"]').trigger('click')
    expect(w.find('.upd-cap').exists()).toBe(false)
  })
})
