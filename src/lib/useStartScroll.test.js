import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { useStartScroll } from './useStartScroll.js'

/** ResizeObserver palsu: test yang mutusin kapan "ukuran berubah". */
let observers = []
class FakeResizeObserver {
  constructor(cb) { this.cb = cb; this.els = []; observers.push(this) }
  observe(el) { this.els.push(el) }
  unobserve(el) { this.els = this.els.filter((e) => e !== el) }
  disconnect() { this.els = [] }
}
const resized = async () => { observers.forEach((o) => o.els.length && o.cb([])); await nextTick() }

/** Elemen scroll palsu yang niru browser: scrollTop dibatesin, dan 0 kalau lagi disembunyiin (display: none). */
function harness({ visible = true, height = 600 } = {}) {
  const box = { ch: height, sh: 1536, top: 0 }
  const show = ref(visible)
  const start = ref(420)
  const day = ref('2026-11-15')
  let el
  const fake = (node) => {
    if (!node || node.__fake) return
    node.__fake = true
    Object.defineProperty(node, 'clientHeight', { get: () => box.ch })
    Object.defineProperty(node, 'scrollHeight', { get: () => box.sh })
    Object.defineProperty(node, 'scrollTop', { get: () => box.top, set: (v) => { box.top = box.ch > 0 ? Math.max(0, Math.min(v, box.sh - box.ch)) : 0 } })
    el = node
  }
  const C = defineComponent({
    setup() {
      const scroller = ref(null)
      useStartScroll(scroller, start, 64, [() => day.value])
      return () => (show.value ? h('div', { ref: (n) => { fake(n); scroller.value = n } }) : h('span'))
    },
  })
  const w = mount(C)
  const userScroll = (top) => { box.top = top; el.dispatchEvent(new Event('scroll')) }
  return { w, box, show, start, day, userScroll }
}

beforeEach(() => {
  observers = []
  globalThis.ResizeObserver = FakeResizeObserver
})
afterEach(() => delete globalThis.ResizeObserver)

describe('useStartScroll', () => {
  it('scrolls to the start (07.00 − 10px) once the hours become visible', async () => {
    const { box } = harness({ height: 0 })
    await nextTick()
    expect(box.top).toBe(0)
    box.ch = 600
    await resized()
    expect(box.top).toBe(438)
  })

  it('stops after one try on a tall window, so a later resize keeps the user spot', async () => {
    const { box, userScroll } = harness({ height: 1300 }) // max scroll 236 < 438
    await nextTick()
    expect(box.top).toBe(236)
    userScroll(100)
    await resized()
    expect(box.top).toBe(100)
  })

  it('puts the user back where they were after the page was hidden and shown again', async () => {
    const { box, userScroll } = harness()
    await nextTick()
    userScroll(900)
    box.ch = 0
    box.top = 0 // browser buang posisi scroll pas display: none
    await resized()
    box.ch = 600
    await resized()
    expect(box.top).toBe(900)
  })

  it('follows the first event while it loads, but not after the user has scrolled', async () => {
    const { box, start, userScroll } = harness()
    await nextTick()
    start.value = 300
    await nextTick(); await nextTick()
    expect(box.top).toBe(310)
    userScroll(800)
    start.value = 200
    await nextTick(); await nextTick()
    expect(box.top).toBe(800)
  })

  it('always scrolls again for a new date', async () => {
    const { box, day, userScroll } = harness()
    await nextTick()
    userScroll(800)
    day.value = '2026-11-16'
    await nextTick(); await nextTick()
    expect(box.top).toBe(438)
  })

  it('scrolls when the hours appear later (iPad rotated to landscape)', async () => {
    const { box, show } = harness({ visible: false })
    await nextTick()
    show.value = true
    await nextTick(); await nextTick(); await nextTick()
    expect(box.top).toBe(438)
  })
})
