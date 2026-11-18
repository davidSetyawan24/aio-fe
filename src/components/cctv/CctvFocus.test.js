import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CctvFocus from './CctvFocus.vue'
import { SHARP_RETRIES, SHARP_RETRY_MS } from '@/lib/cctv.js'

const players = vi.hoisted(() => [])
vi.mock('@/lib/msePlayer.js', () => ({
  playCamera: vi.fn((video, opts) => {
    const p = { video, opts, stop: vi.fn() }
    players.push(p)
    return p
  }),
}))

const cam = { key: 'kamera1', ip: '192.168.1.7' }
const mounted = []
beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  players.length = 0
  vi.useRealTimers()
})

async function mountFocus(props = {}) {
  const w = mount(CctvFocus, { props: { cam, bridgeKey: 'K', sharp: true, ...props }, global: { stubs: { teleport: true } }, attachTo: document.body })
  mounted.push(w)
  await nextTick()
  await nextTick()
  return w
}
const ofQ = (q) => players.filter((p) => p.opts.q === q)
const running = (q) => ofQ(q).filter((p) => p.stop.mock.calls.length === 0)
const lastOf = (q) => ofQ(q).at(-1)

/** Kecil nyambung, tajem nyambung & gambarnya keluar → yang kecil dilepas. */
async function goSharp(w) {
  lastOf('kecil').opts.onState('live')
  lastOf('tajem').opts.onState('live')
  await w.find('[data-test="focus-sharp"]').trigger('loadeddata')
  await nextTick()
}

describe('CctvFocus', () => {
  it('sharp stream drops → falls back to the small one, not a camera error', async () => {
    const w = await mountFocus()
    await goSharp(w)
    expect(running('kecil')).toHaveLength(0)
    lastOf('tajem').opts.onState('error')
    await nextTick()
    expect(ofQ('kecil')).toHaveLength(2)
    expect(running('kecil')).toHaveLength(1)
    expect(w.find('[data-test="focus-sharp"]').classes()).toContain('cc-hide')
    expect(w.text()).not.toContain('Kamera nggak nyambung.')
    expect(w.text()).toContain('Lagi nyambung…')
    lastOf('kecil').opts.onState('live')
    await nextTick()
    expect(w.text()).not.toContain('Lagi nyambung…')
    expect(w.text()).toContain('Kualitas tinggi lagi nggak nyambung, pakai yang biasa dulu.')
  })

  it('tries the sharp stream again a few seconds later and swaps back once it shows', async () => {
    const w = await mountFocus()
    await goSharp(w)
    lastOf('tajem').opts.onState('error')
    lastOf('kecil').opts.onState('live')
    await nextTick()
    vi.advanceTimersByTime(SHARP_RETRY_MS - 1)
    expect(ofQ('tajem')).toHaveLength(1)
    vi.advanceTimersByTime(1)
    await nextTick()
    expect(ofQ('tajem')).toHaveLength(2)
    expect(lastOf('tajem').opts).toMatchObject({ key: 'K', cam: 'kamera1', q: 'tajem' })
    // Belum ada gambar tajem → tetep yang kecil.
    lastOf('tajem').opts.onState('live')
    await nextTick()
    expect(w.find('[data-test="focus-sharp"]').classes()).toContain('cc-hide')
    await w.find('[data-test="focus-sharp"]').trigger('loadeddata')
    await nextTick()
    expect(w.find('[data-test="focus-sharp"]').classes()).not.toContain('cc-hide')
    expect(running('kecil')).toHaveLength(0)
    expect(w.text()).not.toContain('Kualitas tinggi lagi nggak nyambung')
  })

  it('sharp retries are bounded; the small stream keeps playing', async () => {
    const w = await mountFocus()
    await goSharp(w)
    lastOf('tajem').opts.onState('error')
    lastOf('kecil').opts.onState('live')
    for (let i = 0; i < SHARP_RETRIES; i++) {
      vi.advanceTimersByTime(SHARP_RETRY_MS)
      await nextTick()
      lastOf('tajem').opts.onState('error')
    }
    expect(ofQ('tajem')).toHaveLength(1 + SHARP_RETRIES)
    vi.advanceTimersByTime(60000)
    expect(ofQ('tajem')).toHaveLength(1 + SHARP_RETRIES)
    await nextTick()
    expect(running('kecil')).toHaveLength(1)
    expect(w.text()).toContain('Kualitas tinggi lagi nggak nyambung, pakai yang biasa dulu.')
    expect(w.text()).not.toContain('Kamera nggak nyambung.')
  })

  it('small stream fails too → camera error with Coba lagi, which starts both again', async () => {
    const w = await mountFocus()
    await goSharp(w)
    lastOf('tajem').opts.onState('error')
    lastOf('kecil').opts.onState('error')
    await nextTick()
    expect(w.text()).toContain('Kamera nggak nyambung.')
    expect(w.text()).toContain('Cek kamera nyala & IP-nya di app Onassis.')
    // Nyerah beneran: nggak ada yang nyoba nyambung diem-diem.
    vi.advanceTimersByTime(60000)
    await nextTick()
    expect(players).toHaveLength(3)
    await w.find('[data-test="focus-retry"]').trigger('click')
    await nextTick()
    // Player yang error udah beres sendiri; "Coba lagi" bikin dua yang baru.
    expect(players.slice(3).map((p) => p.opts.q)).toEqual(['kecil', 'tajem'])
    expect(w.text()).toContain('Lagi nyambung…')
    expect(w.emitted('close')).toBeUndefined()
  })

  it('without H.265: small stream fails → camera error with Coba lagi', async () => {
    const w = await mountFocus({ sharp: false })
    lastOf('kecil').opts.onState('error')
    await nextTick()
    expect(w.text()).toContain('Kamera nggak nyambung.')
    await w.find('[data-test="focus-retry"]').trigger('click')
    await nextTick()
    expect(ofQ('kecil')).toHaveLength(2)
    expect(ofQ('tajem')).toHaveLength(0)
  })

  it('small fails while the sharp one is still connecting → keeps waiting for the sharp one', async () => {
    const w = await mountFocus()
    lastOf('kecil').opts.onState('error')
    await nextTick()
    expect(w.text()).toContain('Lagi nyambung…')
    lastOf('tajem').opts.onState('live')
    await nextTick()
    expect(w.text()).toContain('Lagi nyambung…')
    await w.find('[data-test="focus-sharp"]').trigger('loadeddata')
    await nextTick()
    expect(w.text()).not.toContain('Lagi nyambung…')
    expect(w.text()).not.toContain('Kamera nggak nyambung.')
  })

  it('closing the big view while a sharp retry is pending → nothing reconnects afterwards', async () => {
    const w = await mountFocus()
    await goSharp(w)
    lastOf('tajem').opts.onState('error')
    await w.setProps({ cam: null })
    vi.advanceTimersByTime(60000)
    await nextTick()
    expect(ofQ('tajem')).toHaveLength(1)
    expect(running('kecil')).toHaveLength(0)
    expect(w.find('[data-test="focus"]').exists()).toBe(false)
  })
})
