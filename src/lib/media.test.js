import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useMedia } from './media.js'

describe('useMedia', () => {
  afterEach(() => delete window.matchMedia)

  it('follows a media query and stops listening when the component goes away', () => {
    let listener
    const mq = { matches: false, addEventListener: vi.fn((_, fn) => (listener = fn)), removeEventListener: vi.fn() }
    window.matchMedia = vi.fn(() => mq)
    let wide
    const w = mount(defineComponent({ setup: () => ((wide = useMedia('(min-width: 1100px)')), () => h('div')) }))
    expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 1100px)')
    expect(wide.value).toBe(false)
    listener({ matches: true })
    expect(wide.value).toBe(true)
    w.unmount()
    expect(mq.removeEventListener).toHaveBeenCalledWith('change', listener)
  })

  it('is false where matchMedia does not exist', () => {
    let wide
    mount(defineComponent({ setup: () => ((wide = useMedia('(min-width: 1100px)')), () => h('div')) }))
    expect(wide.value).toBe(false)
  })
})
