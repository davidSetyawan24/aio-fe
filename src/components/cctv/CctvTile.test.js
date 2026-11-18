import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CctvTile from './CctvTile.vue'
import { RECONNECT_MS } from '@/lib/cctv.js'

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
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  players.length = 0
  vi.useRealTimers()
})
const mountTile = (props = {}) => {
  const w = mount(CctvTile, { props: { cam, bridgeKey: 'K', active: true, ...props }, attachTo: document.body })
  mounted.push(w)
  return w
}

describe('CctvTile', () => {
  it('shows the camera IP and plays the small stream', async () => {
    const w = mountTile()
    await nextTick()
    expect(w.text()).toContain('192.168.1.7')
    expect(w.text()).toContain('Lagi nyambung…')
    expect(players).toHaveLength(1)
    expect(players[0].video.tagName).toBe('VIDEO')
    expect(players[0].opts).toMatchObject({ key: 'K', cam: 'kamera1', q: 'kecil' })
  })

  it('live → the dot lights up and the loading text goes away', async () => {
    const w = mountTile()
    await nextTick()
    players[0].opts.onState('live')
    await nextTick()
    expect(w.find('[data-test="live-dot"]').classes()).toContain('on')
    expect(w.text()).not.toContain('Lagi nyambung…')
  })

  it('reconnect schedule: 2 s, 5 s, 10 s, then every 15 s, about 2 minutes in total', () => {
    expect(RECONNECT_MS.slice(0, 4)).toEqual([2000, 5000, 10000, 15000])
    expect(RECONNECT_MS.slice(3).every((ms) => ms === 15000)).toBe(true)
    const total = RECONNECT_MS.reduce((a, b) => a + b, 0)
    expect(total).toBeGreaterThanOrEqual(100000)
    expect(total).toBeLessThanOrEqual(130000)
  })

  it('stream drops → reconnects on its own with backoff, no click needed', async () => {
    vi.useFakeTimers()
    const w = mountTile()
    await nextTick()
    players[0].opts.onState('live')
    players[0].opts.onState('error')
    await nextTick()
    expect(w.text()).toContain('Lagi nyambung ulang…')
    expect(w.text()).not.toContain('Kamera nggak nyambung.')
    expect(w.find('[data-test="live-dot"]').classes()).not.toContain('on')
    vi.advanceTimersByTime(RECONNECT_MS[0] - 1)
    expect(players).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(players).toHaveLength(2)
    expect(players[1].opts).toMatchObject({ key: 'K', cam: 'kamera1', q: 'kecil' })
    players[1].opts.onState('error')
    await nextTick()
    expect(w.text()).toContain('Lagi nyambung ulang…')
    vi.advanceTimersByTime(RECONNECT_MS[1])
    expect(players).toHaveLength(3)
    players[2].opts.onState('live')
    await nextTick()
    expect(w.find('[data-test="live-dot"]').classes()).toContain('on')
    expect(w.text()).not.toContain('Lagi nyambung')
    // Abis nyambung lagi, putus berikutnya mulai dari 2 dtk lagi.
    players[2].opts.onState('error')
    vi.advanceTimersByTime(RECONNECT_MS[0])
    expect(players).toHaveLength(4)
    expect(w.emitted('open')).toBeUndefined()
  })

  it('still failing after ~2 minutes → gives up: tells why, Coba lagi starts over', async () => {
    vi.useFakeTimers()
    const w = mountTile()
    await nextTick()
    vi.runOnlyPendingTimers() // timer sekali jalan bawaan lingkungan test (bukan punya kotak) dibuang dulu
    const base = vi.getTimerCount()
    for (const ms of RECONNECT_MS) {
      players.at(-1).opts.onState('error')
      vi.advanceTimersByTime(ms)
    }
    expect(players).toHaveLength(RECONNECT_MS.length + 1)
    players.at(-1).opts.onState('error')
    await nextTick()
    expect(w.text()).toContain('Kamera nggak nyambung.')
    expect(w.text()).toContain('Cek kamera nyala & IP-nya di app Onassis.')
    expect(vi.getTimerCount()).toBe(base)
    vi.advanceTimersByTime(60000)
    expect(players).toHaveLength(RECONNECT_MS.length + 1)
    await w.find('[data-test="tile"]').trigger('click')
    expect(w.emitted('open')).toBeUndefined()
    await w.find('[data-test="tile-retry"]').trigger('click')
    await nextTick()
    expect(players).toHaveLength(RECONNECT_MS.length + 2)
    expect(w.text()).toContain('Lagi nyambung…')
    // Coba lagi = jatah nyambung ulang dari awal.
    players.at(-1).opts.onState('error')
    await nextTick()
    expect(w.text()).toContain('Lagi nyambung ulang…')
    vi.advanceTimersByTime(RECONNECT_MS[0])
    expect(players).toHaveLength(RECONNECT_MS.length + 3)
  })

  it('no reconnect once inactive or removed (no leftover timers)', async () => {
    vi.useFakeTimers()
    const w = mountTile()
    await nextTick()
    vi.runOnlyPendingTimers() // timer sekali jalan bawaan lingkungan test (bukan punya kotak) dibuang dulu
    const base = vi.getTimerCount()
    players[0].opts.onState('error')
    expect(vi.getTimerCount()).toBe(base + 1)
    await w.setProps({ active: false })
    expect(vi.getTimerCount()).toBe(base)
    vi.advanceTimersByTime(60000)
    expect(players).toHaveLength(1)
    await w.setProps({ active: true })
    expect(players).toHaveLength(2)
    players[1].opts.onState('error')
    expect(vi.getTimerCount()).toBe(base + 1)
    w.unmount()
    mounted.length = 0
    expect(vi.getTimerCount()).toBeLessThanOrEqual(base)
    vi.advanceTimersByTime(60000)
    expect(players).toHaveLength(2)
  })

  it('late news from a stopped player is ignored', async () => {
    vi.useFakeTimers()
    const w = mountTile()
    await nextTick()
    vi.runOnlyPendingTimers() // timer sekali jalan bawaan lingkungan test (bukan punya kotak) dibuang dulu
    const base = vi.getTimerCount()
    await w.setProps({ active: false })
    players[0].opts.onState('error')
    await nextTick()
    expect(vi.getTimerCount()).toBe(base)
    expect(w.text()).not.toContain('Lagi nyambung ulang…')
  })

  it('click → asks to enlarge this camera', async () => {
    const w = mountTile()
    await nextTick()
    await w.find('[data-test="tile"]').trigger('click')
    expect(w.emitted('open')[0]).toEqual([cam])
  })

  it('stops when not active anymore and when removed', async () => {
    const w = mountTile()
    await nextTick()
    await w.setProps({ active: false })
    expect(players[0].stop).toHaveBeenCalledTimes(1)
    await w.setProps({ active: true })
    await nextTick()
    expect(players).toHaveLength(2)
    w.unmount()
    mounted.length = 0
    expect(players[1].stop).toHaveBeenCalledTimes(1)
  })
})
