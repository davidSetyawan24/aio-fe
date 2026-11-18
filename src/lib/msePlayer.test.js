import { codecs, hevcSupported, playCamera } from './msePlayer.js'

// Jawaban go2rtc asli (dicoba pakai kamera beneran 18/11).
const MIME_KECIL = 'video/mp4; codecs="avc1.42001E"'
const MIME_TAJEM = 'video/mp4; codecs="hvc1.1.6.L153.B0"'

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
  serverBinary(n = 8) { this.onmessage?.({ data: new ArrayBuffer(n) }) }
}

class FakeSourceBuffer {
  constructor(mime) {
    this.mime = mime
    this.updating = false
    this.appended = []
    this.removed = []
    this.ranges = []
    this.buffered = { get length() { return 0 }, start: () => 0, end: () => 0 }
    this.setRange(null)
  }
  setRange(range) {
    this.ranges = range ? [range] : []
    const ranges = this.ranges
    this.buffered = { length: ranges.length, start: (i) => ranges[i][0], end: (i) => ranges[i][1] }
  }
  appendBuffer(buf) { this.appended.push(buf); this.updating = true }
  remove(a, b) { this.removed.push([a, b]); this.updating = true }
  finish() { this.updating = false; this.onupdateend?.() }
}

let supported
class FakeMediaSource {
  static all = []
  static isTypeSupported(type) { return supported(type) }
  constructor() {
    this.readyState = 'closed'
    this.buffers = []
    FakeMediaSource.all.push(this)
  }
  addSourceBuffer(mime) {
    const sb = new FakeSourceBuffer(mime)
    this.buffers.push(sb)
    return sb
  }
  open() { this.readyState = 'open'; this.onsourceopen?.() }
}

const video = () => ({ src: '', currentTime: 0, play: vi.fn(async () => {}), removeAttribute: vi.fn(), load: vi.fn() })

beforeEach(() => {
  supported = (type) => !type.includes('hvc1')
  vi.stubGlobal('WebSocket', FakeWS)
  vi.stubGlobal('MediaSource', FakeMediaSource)
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:ms'), revokeObjectURL: vi.fn() })
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  FakeWS.all = []
  FakeMediaSource.all = []
})

describe('codecs', () => {
  it('asks for H.264 only when the browser cannot play H.265', () => {
    expect(codecs()).toBe('avc1.42001E,avc1.640029,avc1.64002A,avc1.640033')
    expect(hevcSupported()).toBe(false)
  })

  it('adds H.265 when supported', () => {
    supported = () => true
    expect(codecs()).toBe('avc1.42001E,avc1.640029,avc1.64002A,avc1.640033,hvc1.1.6.L153.B0')
    expect(hevcSupported()).toBe(true)
  })

  it('no MediaSource at all → nothing supported', () => {
    vi.stubGlobal('MediaSource', undefined)
    expect(hevcSupported()).toBe(false)
  })
})

describe('playCamera', () => {
  function start(q = 'kecil') {
    const v = video()
    const onState = vi.fn()
    const player = playCamera(v, { key: 'K', cam: 'kamera1', q, onState })
    return { v, onState, player, ws: FakeWS.all.at(-1) }
  }

  it('opens /ws for the camera and asks with the supported codecs', () => {
    const { ws } = start()
    expect(ws.url).toBe('ws://127.0.0.1:1985/ws?k=K&cam=kamera1&q=kecil')
    expect(ws.binaryType).toBe('arraybuffer')
    ws.serverOpen()
    expect(JSON.parse(ws.sent[0])).toEqual({ type: 'mse', value: 'avc1.42001E,avc1.640029,avc1.64002A,avc1.640033' })
  })

  it('creates a source buffer with go2rtc mime, appends data in order and goes live once', () => {
    const { v, ws, onState } = start()
    ws.serverOpen()
    ws.serverText({ type: 'mse', value: MIME_KECIL })
    const ms = FakeMediaSource.all[0]
    expect(v.src).toBe('blob:ms')
    ws.serverBinary(10) // datang sebelum sourceopen → diantri
    ms.open()
    const sb = ms.buffers[0]
    expect(sb.mime).toBe(MIME_KECIL)
    expect(sb.appended).toHaveLength(1)
    expect(onState).toHaveBeenCalledWith('live')
    ws.serverBinary(20)
    ws.serverBinary(30)
    expect(sb.appended).toHaveLength(1) // lagi updating → nunggu
    sb.finish()
    expect(sb.appended.map((b) => b.byteLength)).toEqual([10, 20])
    sb.finish()
    expect(sb.appended.map((b) => b.byteLength)).toEqual([10, 20, 30])
    expect(onState.mock.calls.filter(([s]) => s === 'live')).toHaveLength(1)
    expect(v.play).toHaveBeenCalled()
  })

  it('socket closes before any data → error', () => {
    const { ws, onState } = start()
    ws.serverOpen()
    ws.serverClose()
    expect(onState).toHaveBeenCalledWith('error')
    expect(onState).not.toHaveBeenCalledWith('live')
  })

  it('go2rtc error message → error', () => {
    const { ws, onState } = start()
    ws.serverOpen()
    ws.serverText({ type: 'error', value: 'streams: dial tcp 192.168.1.7:8554: i/o timeout' })
    expect(onState).toHaveBeenCalledWith('error')
    expect(ws.closed).toBe(true)
  })

  it('the camera dying mid-stream is an error too', () => {
    const { ws, onState } = start()
    ws.serverOpen()
    ws.serverText({ type: 'mse', value: MIME_KECIL })
    FakeMediaSource.all[0].open()
    ws.serverBinary()
    ws.serverClose()
    expect(onState.mock.calls.map(([s]) => s)).toEqual(['live', 'error'])
  })

  it('sharp stream waiting > 4 s for a keyframe is not an error; 15 s without data is', async () => {
    vi.useFakeTimers()
    supported = () => true
    const { ws, onState } = start('tajem')
    ws.serverOpen()
    ws.serverText({ type: 'mse', value: MIME_TAJEM })
    FakeMediaSource.all[0].open()
    await vi.advanceTimersByTimeAsync(14999)
    expect(onState).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(onState).toHaveBeenCalledWith('error')
    expect(ws.closed).toBe(true)
  })

  it('first data in time cancels the 15 s timer', async () => {
    vi.useFakeTimers()
    const { ws, onState } = start()
    ws.serverOpen()
    ws.serverText({ type: 'mse', value: MIME_KECIL })
    FakeMediaSource.all[0].open()
    await vi.advanceTimersByTimeAsync(6000)
    ws.serverBinary()
    await vi.advanceTimersByTimeAsync(30000)
    expect(onState.mock.calls.map(([s]) => s)).toEqual(['live'])
  })

  it('a mime the browser cannot play → error', () => {
    const { ws, onState } = start()
    ws.serverOpen()
    ws.serverText({ type: 'mse', value: MIME_KECIL })
    const ms = FakeMediaSource.all[0]
    ms.addSourceBuffer = () => { throw new DOMException('nope', 'NotSupportedError') }
    ms.open()
    expect(onState).toHaveBeenCalledWith('error')
  })

  it('drops buffer more than 10 s behind and jumps back to the live edge', () => {
    const { v, ws } = start()
    ws.serverOpen()
    ws.serverText({ type: 'mse', value: MIME_KECIL })
    FakeMediaSource.all[0].open()
    ws.serverBinary()
    const sb = FakeMediaSource.all[0].buffers[0]
    v.currentTime = 20
    sb.setRange([0, 21])
    sb.finish()
    expect(sb.removed).toEqual([[0, 17]])
    sb.setRange([17, 21])
    sb.finish()
    expect(sb.removed).toHaveLength(1)
    sb.setRange([17, 30])
    ws.serverBinary()
    sb.finish()
    expect(v.currentTime).toBeCloseTo(29.5)
  })

  it('stop closes the socket, releases the video and stays quiet', async () => {
    vi.useFakeTimers()
    const { v, ws, onState, player } = start()
    ws.serverOpen()
    ws.serverText({ type: 'mse', value: MIME_KECIL })
    FakeMediaSource.all[0].open()
    player.stop()
    expect(ws.closed).toBe(true)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:ms')
    expect(v.removeAttribute).toHaveBeenCalledWith('src')
    ws.onclose?.({})
    ws.onmessage?.({ data: new ArrayBuffer(4) })
    await vi.advanceTimersByTimeAsync(20000)
    expect(onState).not.toHaveBeenCalled()
  })
})
