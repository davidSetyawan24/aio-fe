import { BRIDGE, createPageMachine, fetchStatus, launchUrl, networkPermission, newKey, openTali } from './cctv.js'

// Bentuk respons asli AIO CCTV (dicoba pakai kamera beneran 18/11) — jangan dikarang.
const STATUS_OK = { ok: true, cameras: [{ key: 'kamera1', ip: '192.168.1.7' }, { key: 'kamera2', ip: '192.168.1.5' }], hevc: true }
const BUSY = { ok: false, error: 'busy', message: 'CCTV lagi kebuka di tab lain.' }
const ORIGIN = { ok: false, error: 'origin' }
const json = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body })

class FakeWS {
  static all = []
  constructor(url) {
    this.url = url
    this.readyState = 0
    this.sent = []
    this.closed = false
    FakeWS.all.push(this)
  }
  send(data) { this.sent.push(data) }
  close() { this.closed = true; this.readyState = 3 }
  serverOpen() { this.readyState = 1; this.onopen?.({}) }
  serverClose() { this.readyState = 3; this.onclose?.({}) }
  serverText(obj) { this.onmessage?.({ data: JSON.stringify(obj) }) }
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  FakeWS.all = []
})

describe('bridge address & key', () => {
  it('talks to 127.0.0.1 (the bridge only listens on IPv4)', () => {
    expect(BRIDGE).toBe('http://127.0.0.1:1985')
  })

  it('makes a fresh 43-char base64url key every time', () => {
    const a = newKey()
    const b = newKey()
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(b).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(a).not.toBe(b)
  })

  it('builds the aiocctv:// launch link', () => {
    expect(launchUrl('abc')).toBe('aiocctv://start?k=abc')
  })
})

describe('fetchStatus', () => {
  it('returns the cameras (IP only) and hevc when the bridge answers', async () => {
    const fetch = vi.fn(async () => json(200, STATUS_OK))
    vi.stubGlobal('fetch', fetch)
    expect(await fetchStatus('K')).toEqual({ kind: 'ok', cameras: STATUS_OK.cameras, hevc: true })
    expect(fetch.mock.calls[0][0]).toBe('http://127.0.0.1:1985/status?k=K')
    expect(fetch.mock.calls[0][1]).toMatchObject({ cache: 'no-store' })
  })

  it('409 = another tab owns the bridge', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(409, BUSY)))
    expect(await fetchStatus('K')).toEqual({ kind: 'busy' })
  })

  it('403 (origin not allowed) counts as off', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(403, ORIGIN)))
    expect(await fetchStatus('K')).toEqual({ kind: 'off' })
  })

  it('gives up after 1.5 s without an answer', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn((url, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))))))
    let result = null
    fetchStatus('K').then((r) => (result = r))
    await vi.advanceTimersByTimeAsync(1499)
    expect(result).toBeNull()
    await vi.advanceTimersByTimeAsync(1)
    expect(result).toEqual({ kind: 'off' })
  })

  it('a fast TypeError (nothing listening) is off — Chrome blocking looks the same, so that comes from the permission check', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    expect(await fetchStatus('K')).toEqual({ kind: 'off' })
  })
})

describe('networkPermission', () => {
  it('reads Chrome local network permission', async () => {
    const query = vi.fn(async ({ name }) => {
      if (name === 'loopback-network') throw new TypeError('unknown')
      return { state: 'denied' }
    })
    vi.stubGlobal('navigator', { permissions: { query } })
    expect(await networkPermission()).toBe('denied')
  })

  it('unknown when the browser has no such permission', async () => {
    vi.stubGlobal('navigator', { permissions: { query: async () => { throw new TypeError('unknown') } } })
    expect(await networkPermission()).toBe('unknown')
    vi.stubGlobal('navigator', {})
    expect(await networkPermission()).toBe('unknown')
  })
})

describe('openTali', () => {
  beforeEach(() => vi.stubGlobal('WebSocket', FakeWS))

  it('opens /tali with the key and queues messages until open', () => {
    const tali = openTali('K', { onClose: vi.fn() })
    const ws = FakeWS.all[0]
    expect(ws.url).toBe('ws://127.0.0.1:1985/tali?k=K')
    tali.send({ tab: 'ngumpet' })
    expect(ws.sent).toEqual([])
    ws.serverOpen()
    expect(ws.sent).toEqual(['{"tab":"ngumpet"}'])
    tali.send({ tab: 'keliatan' })
    expect(ws.sent).toEqual(['{"tab":"ngumpet"}', '{"tab":"keliatan"}'])
  })

  it('ignores the bridge heartbeat and reports when the bridge drops it', () => {
    const onClose = vi.fn()
    const tali = openTali('K', { onClose })
    const ws = FakeWS.all[0]
    ws.serverOpen()
    ws.serverText({ hai: true })
    expect(tali.alive()).toBe(true)
    ws.serverClose()
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(tali.alive()).toBe(false)
  })

  it('stop sent before open still goes out, then the socket closes', () => {
    const onClose = vi.fn()
    const tali = openTali('K', { onClose })
    const ws = FakeWS.all[0]
    tali.send({ stop: true })
    tali.close()
    expect(ws.closed).toBe(false)
    ws.serverOpen()
    expect(ws.sent).toEqual(['{"stop":true}'])
    expect(ws.closed).toBe(true)
    ws.onclose?.({})
    expect(onClose).not.toHaveBeenCalled()
  })
})

/* ---------------- mesin keadaan halaman ---------------- */

function fakeTali() {
  const t = { sent: [], closed: false, isAlive: true, onClose: null }
  t.send = (obj) => t.sent.push(obj)
  t.close = () => { t.closed = true; t.isAlive = false }
  t.alive = () => t.isAlive
  t.drop = () => { t.isAlive = false; t.onClose() }
  return t
}

function setup({ isMac = true, statuses = [], permission = 'granted', active = true } = {}) {
  const queue = [...statuses]
  const talis = []
  const states = []
  let keys = 0
  const deps = {
    newKey: vi.fn(() => `key${++keys}`),
    fetchStatus: vi.fn(async () => (queue.length ? queue.shift() : { kind: 'off' })),
    openTali: vi.fn((key, { onClose }) => {
      const t = fakeTali()
      t.key = key
      t.onClose = onClose
      talis.push(t)
      return t
    }),
    launch: vi.fn(),
    networkPermission: vi.fn(async () => permission),
    userActive: () => active,
    docHidden: () => false,
    launches: [],
  }
  const m = createPageMachine({ isMac, deps, onChange: (s) => states.push(s.name) })
  return { m, deps, talis, states, queue }
}

const OK = { kind: 'ok', cameras: STATUS_OK.cameras, hevc: true }

describe('createPageMachine', () => {
  beforeEach(() => vi.useFakeTimers())

  it('not a Mac → info card, never checks or launches', async () => {
    const { m, deps } = setup({ isMac: false })
    await m.enter()
    expect(m.state.name).toBe('notMac')
    expect(deps.fetchStatus).not.toHaveBeenCalled()
    expect(deps.launch).not.toHaveBeenCalled()
    expect(deps.networkPermission).not.toHaveBeenCalled()
  })

  it('off → launches once with the same key, polls every second, goes live and opens the tali', async () => {
    const { m, deps, talis } = setup({ statuses: [{ kind: 'off' }, { kind: 'off' }, { kind: 'off' }, OK] })
    const done = m.enter()
    await vi.advanceTimersByTimeAsync(0)
    expect(m.state.name).toBe('starting')
    expect(deps.launch).toHaveBeenCalledTimes(1)
    expect(deps.launch).toHaveBeenCalledWith('key1')
    await vi.advanceTimersByTimeAsync(3000)
    await done
    expect(m.state).toMatchObject({ name: 'live', key: 'key1', cameras: STATUS_OK.cameras, hevc: true, playing: true })
    expect(deps.fetchStatus).toHaveBeenCalledTimes(4)
    for (const call of deps.fetchStatus.mock.calls) expect(call[0]).toBe('key1')
    expect(deps.launch).toHaveBeenCalledTimes(1)
    expect(talis).toHaveLength(1)
    expect(talis[0].key).toBe('key1')
  })

  it('never spins forever: auto launch with no answer for 15 s → big "Nyalain CCTV" button', async () => {
    const { m, deps } = setup()
    const done = m.enter()
    await vi.advanceTimersByTimeAsync(14000)
    expect(m.state.name).toBe('starting')
    await vi.advanceTimersByTimeAsync(2000)
    await done
    expect(m.state.name).toBe('off')
    expect(deps.launch).toHaveBeenCalledTimes(1)
  })

  it('the button makes a fresh key + launch; no answer for 15 s → error (Coba lagi)', async () => {
    const { m, deps } = setup()
    const first = m.enter()
    await vi.advanceTimersByTimeAsync(16000)
    await first
    const second = m.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(m.state.name).toBe('starting')
    expect(deps.launch).toHaveBeenLastCalledWith('key2')
    await vi.advanceTimersByTimeAsync(16000)
    await second
    expect(m.state.name).toBe('error')
    const third = m.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(deps.launch).toHaveBeenLastCalledWith('key3')
    deps.fetchStatus.mockResolvedValue(OK)
    await vi.advanceTimersByTimeAsync(1000)
    await third
    expect(m.state).toMatchObject({ name: 'live', key: 'key3' })
  })

  it('no user gesture left (e.g. page reloaded) → button straight away, no pointless launch', async () => {
    const { m, deps } = setup({ active: false })
    await m.enter()
    expect(m.state.name).toBe('off')
    expect(deps.launch).not.toHaveBeenCalled()
  })

  it('409 → "lagi kebuka di tab lain", no launch', async () => {
    const { m, deps } = setup({ statuses: [{ kind: 'busy' }] })
    await m.enter()
    expect(m.state.name).toBe('busy')
    expect(deps.launch).not.toHaveBeenCalled()
  })

  it('Chrome blocked local network → blocked, no launch', async () => {
    const { m, deps } = setup({ permission: 'denied' })
    await m.enter()
    expect(m.state.name).toBe('blocked')
    expect(deps.launch).not.toHaveBeenCalled()
    expect(deps.fetchStatus).not.toHaveBeenCalled()
  })

  it('Chrome blocks while waiting (user picked Block on the prompt) → blocked instead of "belum kepasang"', async () => {
    const { m, deps } = setup()
    const done = m.enter()
    await vi.advanceTimersByTimeAsync(0)
    deps.networkPermission.mockResolvedValue('denied')
    await vi.advanceTimersByTimeAsync(16000)
    await done
    expect(m.state.name).toBe('blocked')
  })

  it('camera answers slowly is fine: a camera error never comes from the page machine', async () => {
    const { m } = setup({ statuses: [{ kind: 'off' }, OK] })
    const done = m.enter()
    await vi.advanceTimersByTimeAsync(1000)
    await done
    expect(m.state.name).toBe('live')
  })

  describe('tab hidden / visible', () => {
    async function live(opts) {
      const ctx = setup({ statuses: [{ kind: 'off' }, OK], ...opts })
      const done = ctx.m.enter()
      await vi.advanceTimersByTimeAsync(1000)
      await done
      return ctx
    }

    it('hidden → players stop + ngumpet; back within a minute → keliatan + players again, no launch', async () => {
      const { m, deps, talis } = await live()
      m.hidden()
      expect(m.state.playing).toBe(false)
      expect(talis[0].sent).toEqual([{ tab: 'ngumpet' }])
      await vi.advanceTimersByTimeAsync(30000)
      m.visible()
      expect(m.state).toMatchObject({ name: 'live', playing: true })
      expect(talis[0].sent).toEqual([{ tab: 'ngumpet' }, { tab: 'keliatan' }])
      expect(deps.launch).toHaveBeenCalledTimes(1)
    })

    it('the bridge gave up (tali closed) → button, no launch', async () => {
      const { m, deps, talis } = await live()
      m.hidden()
      talis[0].drop()
      m.visible()
      expect(m.state).toMatchObject({ name: 'off', playing: false })
      expect(deps.launch).toHaveBeenCalledTimes(1)
    })

    it('hidden ≥ 60 s even if the tali still looks open → off and the tali is closed', async () => {
      const { m, talis } = await live()
      m.hidden()
      await vi.advanceTimersByTimeAsync(60000)
      m.visible()
      expect(m.state.name).toBe('off')
      expect(talis[0].closed).toBe(true)
    })

    it('59 s hidden is still fine', async () => {
      const { m } = await live()
      m.hidden()
      await vi.advanceTimersByTimeAsync(59000)
      m.visible()
      expect(m.state).toMatchObject({ name: 'live', playing: true })
    })

    it('tali dropped while watching → button', async () => {
      const { m, talis } = await live()
      talis[0].drop()
      expect(m.state).toMatchObject({ name: 'off', playing: false })
    })
  })

  it('leaving sends stop, then closes the tali; late events are ignored', async () => {
    const { m, talis } = setup({ statuses: [{ kind: 'off' }, OK] })
    const done = m.enter()
    await vi.advanceTimersByTimeAsync(1000)
    await done
    const t = talis[0]
    m.leave()
    expect(t.sent).toEqual([{ stop: true }])
    expect(t.closed).toBe(true)
    expect(m.state).toMatchObject({ name: 'idle', playing: false })
    t.onClose()
    m.visible()
    expect(m.state.name).toBe('idle')
  })

  it('leaving while waiting for the bridge stops the polling', async () => {
    const { m, deps } = setup()
    m.enter()
    await vi.advanceTimersByTimeAsync(2000)
    m.leave()
    const calls = deps.fetchStatus.mock.calls.length
    await vi.advanceTimersByTimeAsync(20000)
    expect(deps.fetchStatus.mock.calls.length).toBe(calls)
    expect(m.state.name).toBe('idle')
  })

  it('coming back right after leaving waits for the old bridge to finish instead of saying "tab lain"', async () => {
    const { m, deps, queue } = setup({ statuses: [{ kind: 'off' }, OK] })
    const first = m.enter()
    await vi.advanceTimersByTimeAsync(1000)
    await first
    m.leave()
    queue.push({ kind: 'busy' }, { kind: 'busy' }, { kind: 'off' }, OK)
    const again = m.enter()
    await vi.advanceTimersByTimeAsync(3000)
    await again
    expect(m.state).toMatchObject({ name: 'live', key: 'key2' })
    expect(deps.launch).toHaveBeenLastCalledWith('key2')
  })

  describe('a launch the page gave up on (bridge holds a key the page made earlier)', () => {
    // App mini cuma jawab kunci yang dia pegang; kunci lain → 409 (bentuk asli).
    const bridgeHolds = (held) => async (key) => (key === held ? OK : { kind: 'busy' })

    it('leave while starting → bridge comes up with key1 → re-enter reuses key1 and goes live', async () => {
      const { m, deps, talis } = setup()
      m.enter()
      await vi.advanceTimersByTimeAsync(3000)
      expect(m.state.name).toBe('starting')
      m.leave()
      deps.fetchStatus.mockImplementation(bridgeHolds('key1'))
      await m.enter()
      expect(m.state).toMatchObject({ name: 'live', key: 'key1' })
      expect(talis.map((t) => t.key)).toEqual(['key1'])
      expect(deps.launch).toHaveBeenCalledTimes(1)
    })

    it('bridge answers late, after the 15 s window → Nyalain reuses key1, no "tab lain", no second launch', async () => {
      const { m, deps, states } = setup()
      const first = m.enter()
      await vi.advanceTimersByTimeAsync(16000)
      await first
      expect(m.state.name).toBe('off')
      deps.fetchStatus.mockImplementation(bridgeHolds('key1'))
      await m.start()
      expect(m.state).toMatchObject({ name: 'live', key: 'key1' })
      expect(deps.launch).toHaveBeenCalledTimes(1)
      expect(states).not.toContain('busy')
    })

    it('bridge from the earlier launch wins the race while the new launch is polling → goes live on the earlier key', async () => {
      const { m, deps, states } = setup()
      const first = m.enter()
      await vi.advanceTimersByTimeAsync(16000)
      await first
      const second = m.start()
      await vi.advanceTimersByTimeAsync(0)
      expect(deps.launch).toHaveBeenLastCalledWith('key2')
      deps.fetchStatus.mockImplementation(bridgeHolds('key1'))
      await vi.advanceTimersByTimeAsync(1000)
      await second
      expect(m.state).toMatchObject({ name: 'live', key: 'key1' })
      expect(states).not.toContain('busy')
    })

    it('409 shortly after our own launch keeps waiting (bridge still coming up) instead of saying "tab lain"', async () => {
      const { m, deps } = setup()
      const first = m.enter()
      await vi.advanceTimersByTimeAsync(16000)
      await first
      // App mini kita lagi nyala tapi belum bisa ditanya; yang megang port masih nolak kunci kita.
      deps.fetchStatus.mockImplementation(async () => ({ kind: 'busy' }))
      const again = m.retry()
      await vi.advanceTimersByTimeAsync(5000)
      expect(m.state.name).toBe('checking')
      deps.fetchStatus.mockImplementation(bridgeHolds('key1'))
      await vi.advanceTimersByTimeAsync(1000)
      await again
      expect(m.state).toMatchObject({ name: 'live', key: 'key1' })
    })

    it('waits at most until the earlier launch is 60 s old, then it really is another tab', async () => {
      const { m, deps } = setup()
      const first = m.enter()
      await vi.advanceTimersByTimeAsync(16000)
      await first
      deps.fetchStatus.mockImplementation(async () => ({ kind: 'busy' }))
      const again = m.retry()
      await vi.advanceTimersByTimeAsync(40000)
      expect(m.state.name).toBe('checking')
      await vi.advanceTimersByTimeAsync(5000)
      await again
      expect(m.state.name).toBe('busy')
    })

    it('a genuine other-tab 409 with no recent launch from this page → busy straight away', async () => {
      const { m, deps } = setup()
      deps.fetchStatus.mockImplementation(async () => ({ kind: 'busy' }))
      await m.enter()
      expect(m.state.name).toBe('busy')
      expect(deps.fetchStatus).toHaveBeenCalledTimes(1)
      expect(deps.launch).not.toHaveBeenCalled()
    })

    it('a launch that went live is used up: after leaving, its key is not tried again', async () => {
      const { m, deps, queue } = setup({ statuses: [{ kind: 'off' }, OK] })
      const first = m.enter()
      await vi.advanceTimersByTimeAsync(1000)
      await first
      m.leave()
      await vi.advanceTimersByTimeAsync(10000)
      deps.fetchStatus.mockClear()
      queue.push({ kind: 'busy' })
      await m.enter()
      expect(deps.fetchStatus.mock.calls.map((c) => c[0])).toEqual(['key2'])
      expect(m.state.name).toBe('busy')
    })
  })

  it('retry from busy checks again with a fresh key', async () => {
    const { m, deps } = setup({ statuses: [{ kind: 'busy' }, { kind: 'busy' }] })
    await m.enter()
    await m.retry()
    expect(m.state.name).toBe('busy')
    expect(deps.fetchStatus.mock.calls.map((c) => c[0])).toEqual(['key1', 'key2'])
  })
})
