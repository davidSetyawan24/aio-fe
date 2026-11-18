import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CctvPage from './CctvPage.vue'

const hooks = vi.hoisted(() => ({ enter: [], leave: [] }))
const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  onIonViewDidEnter: (fn) => hooks.enter.push(fn),
  onIonViewWillLeave: (fn) => hooks.leave.push(fn),
}))

const kind = vi.hoisted(() => ({ value: 'Mac' }))
vi.mock('@/lib/device.js', async (importOriginal) => ({ ...(await importOriginal()), detectKind: () => kind.value }))

const bridge = vi.hoisted(() => ({ talis: [] }))
vi.mock('@/lib/cctv.js', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchStatus: vi.fn(),
  launch: vi.fn(),
  networkPermission: vi.fn(async () => 'granted'),
  openTali: vi.fn((key, { onClose }) => {
    const t = { key, onClose, sent: [], closed: false }
    t.send = vi.fn((obj) => t.sent.push(obj))
    t.close = vi.fn(() => (t.closed = true))
    t.alive = () => !t.closed
    bridge.talis.push(t)
    return t
  }),
}))

const players = vi.hoisted(() => [])
const hevc = vi.hoisted(() => ({ value: true }))
vi.mock('@/lib/msePlayer.js', () => ({
  hevcSupported: () => hevc.value,
  playCamera: vi.fn((video, opts) => {
    const p = { video, opts, stop: vi.fn() }
    players.push(p)
    return p
  }),
}))

import { fetchStatus, launch, openTali } from '@/lib/cctv.js'

// Bentuk respons asli /status (dicoba pakai kamera beneran 18/11).
const OK = { kind: 'ok', cameras: [{ key: 'kamera1', ip: '192.168.1.7' }, { key: 'kamera2', ip: '192.168.1.5' }], hevc: true }

let visibility = 'visible'
Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility })
const setVisibility = async (v) => {
  visibility = v
  document.dispatchEvent(new Event('visibilitychange'))
  await flushPromises()
}

const mounted = []
beforeEach(() => {
  hooks.enter.length = 0
  hooks.leave.length = 0
  bridge.talis.length = 0
  players.length = 0
  kind.value = 'Mac'
  hevc.value = true
  visibility = 'visible'
  fetchStatus.mockReset().mockResolvedValue(OK)
  launch.mockReset()
  openTali.mockClear()
})
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

async function mountPage() {
  const w = mount(CctvPage, { global: { stubs: { teleport: true } }, attachTo: document.body })
  mounted.push(w)
  hooks.enter.forEach((fn) => fn())
  await flushPromises()
  return w
}
const playing = () => players.filter((p) => p.stop.mock.calls.length === 0)

describe('CctvPage', () => {
  it('iPhone → info card, never touches the bridge or aiocctv://', async () => {
    kind.value = 'iPhone'
    const w = await mountPage()
    expect(w.text()).toContain('CCTV cuma bisa dibuka dari Mac di rumah.')
    expect(w.text()).toContain('Nanti bisa dari mana aja kalau udah ada mini PC.')
    expect(fetchStatus).not.toHaveBeenCalled()
    expect(launch).not.toHaveBeenCalled()
    expect(openTali).not.toHaveBeenCalled()
  })

  it('Mac + bridge answers → 2 cameras labelled by IP, playing the small stream', async () => {
    const w = await mountPage()
    const tiles = w.findAll('[data-test="tile"]')
    expect(tiles).toHaveLength(2)
    expect(tiles[0].text()).toContain('192.168.1.7')
    expect(tiles[1].text()).toContain('192.168.1.5')
    expect(players.map((p) => [p.opts.cam, p.opts.q])).toEqual([['kamera1', 'kecil'], ['kamera2', 'kecil']])
    expect(bridge.talis).toHaveLength(1)
    expect(players[0].opts.key).toBe(bridge.talis[0].key)
    expect(launch).not.toHaveBeenCalled()
  })

  it('Mac + bridge off → launches AIO CCTV once and shows progress', async () => {
    fetchStatus.mockResolvedValue({ kind: 'off' })
    const w = await mountPage()
    expect(launch).toHaveBeenCalledTimes(1)
    expect(launch.mock.calls[0][0]).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(w.text()).toContain('Lagi nyalain AIO CCTV…')
  })

  it('leaving the page sends stop on the tali, then closes it and stops the players', async () => {
    await mountPage()
    const t = bridge.talis[0]
    hooks.leave.forEach((fn) => fn())
    await nextTick()
    expect(t.sent).toEqual([{ stop: true }])
    expect(t.close).toHaveBeenCalled()
    expect(t.send.mock.invocationCallOrder[0]).toBeLessThan(t.close.mock.invocationCallOrder[0])
    expect(playing()).toHaveLength(0)
  })

  it('unmounting also stops everything', async () => {
    const w = await mountPage()
    const t = bridge.talis[0]
    w.unmount()
    mounted.length = 0
    expect(t.sent).toEqual([{ stop: true }])
    expect(t.closed).toBe(true)
  })

  it('tab hidden → players stop + ngumpet; visible again → keliatan + players again, no launch', async () => {
    await mountPage()
    const t = bridge.talis[0]
    await setVisibility('hidden')
    expect(playing()).toHaveLength(0)
    expect(t.sent).toEqual([{ tab: 'ngumpet' }])
    await setVisibility('visible')
    expect(t.sent).toEqual([{ tab: 'ngumpet' }, { tab: 'keliatan' }])
    expect(playing()).toHaveLength(2)
    expect(launch).not.toHaveBeenCalled()
  })

  it('tali dropped while hidden → back with the Nyalain CCTV button', async () => {
    const w = await mountPage()
    const t = bridge.talis[0]
    await setVisibility('hidden')
    t.closed = true
    t.onClose()
    await setVisibility('visible')
    expect(w.find('[data-test="start"]').text()).toContain('Nyalain CCTV')
    expect(launch).not.toHaveBeenCalled()
  })

  it('click a camera → big view, small stream first, sharp stream swapped in once it has data', async () => {
    const w = await mountPage()
    await w.findAll('[data-test="tile"]')[0].trigger('click')
    await flushPromises()
    const focus = w.find('[data-test="focus"]')
    expect(focus.exists()).toBe(true)
    expect(focus.text()).toContain('192.168.1.7')
    const big = players.slice(2)
    expect(big.map((p) => p.opts.q)).toEqual(['kecil', 'tajem'])
    expect(w.find('[data-test="focus-sharp"]').classes()).toContain('cc-hide')
    big[0].opts.onState('live')
    big[1].opts.onState('live')
    await nextTick()
    // Data udah nyampe tapi gambarnya belum ada → masih yang kecil (nggak layar item).
    expect(w.find('[data-test="focus-sharp"]').classes()).toContain('cc-hide')
    await w.find('[data-test="focus-sharp"]').trigger('loadeddata')
    expect(w.find('[data-test="focus-sharp"]').classes()).not.toContain('cc-hide')
    expect(big[0].stop).toHaveBeenCalled()
    expect(focus.text()).not.toContain('Kualitas tinggi nggak didukung browser ini.')
  })

  it('browser without H.265 → big view stays on the small stream with a note', async () => {
    hevc.value = false
    const w = await mountPage()
    await w.findAll('[data-test="tile"]')[1].trigger('click')
    await flushPromises()
    expect(players.slice(2).map((p) => [p.opts.cam, p.opts.q])).toEqual([['kamera2', 'kecil']])
    expect(w.find('[data-test="focus"]').text()).toContain('Kualitas tinggi nggak didukung browser ini.')
  })

  it('big view open → tab hidden briefly → back: same camera reopens big without a click', async () => {
    const w = await mountPage()
    await w.findAll('[data-test="tile"]')[1].trigger('click')
    await flushPromises()
    await setVisibility('hidden')
    expect(w.find('[data-test="focus"]').exists()).toBe(false)
    expect(playing()).toHaveLength(0)
    await setVisibility('visible')
    await flushPromises()
    const focus = w.find('[data-test="focus"]')
    expect(focus.exists()).toBe(true)
    expect(focus.text()).toContain('192.168.1.5')
    expect(playing().map((p) => [p.opts.cam, p.opts.q])).toEqual(
      expect.arrayContaining([['kamera2', 'kecil'], ['kamera2', 'tajem']]),
    )
    expect(launch).not.toHaveBeenCalled()
  })

  it('leaving live (page left, then back) → big view not reopened', async () => {
    const w = await mountPage()
    await w.findAll('[data-test="tile"]')[0].trigger('click')
    await flushPromises()
    hooks.leave.forEach((fn) => fn())
    await flushPromises()
    hooks.enter.forEach((fn) => fn())
    await flushPromises()
    expect(w.findAll('[data-test="tile"]')).toHaveLength(2)
    expect(w.find('[data-test="focus"]').exists()).toBe(false)
  })

  it('tali dropped while hidden with big view open → back on Nyalain CCTV, big view gone', async () => {
    const w = await mountPage()
    await w.findAll('[data-test="tile"]')[0].trigger('click')
    await flushPromises()
    const t = bridge.talis[0]
    await setVisibility('hidden')
    t.closed = true
    t.onClose()
    await setVisibility('visible')
    expect(w.find('[data-test="start"]').exists()).toBe(true)
    expect(w.find('[data-test="focus"]').exists()).toBe(false)
  })

  it('✕ and Esc close the big view', async () => {
    const w = await mountPage()
    await w.findAll('[data-test="tile"]')[0].trigger('click')
    await flushPromises()
    await w.find('[data-test="focus-close"]').trigger('click')
    expect(w.find('[data-test="focus"]').exists()).toBe(false)
    expect(players.slice(2).every((p) => p.stop.mock.calls.length > 0)).toBe(true)
    await w.findAll('[data-test="tile"]')[0].trigger('click')
    await flushPromises()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(w.find('[data-test="focus"]').exists()).toBe(false)
  })
})
