import { detectKind, DEVICE_KEY, getDeviceKey } from './device.js'

const memoryStorage = (initial = {}) => {
  const data = { ...initial }
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => (data[k] = String(v)), data }
}
const brokenStorage = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }

describe('getDeviceKey', () => {
  it('creates a random key once and keeps it', () => {
    const s = memoryStorage()
    const first = getDeviceKey(s)
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(s.data[DEVICE_KEY]).toBe(first)
    expect(getDeviceKey(s)).toBe(first)
  })

  it('reuses a saved key and replaces junk', () => {
    const good = 'a'.repeat(43)
    expect(getDeviceKey(memoryStorage({ [DEVICE_KEY]: good }))).toBe(good)
    expect(getDeviceKey(memoryStorage({ [DEVICE_KEY]: 'x' }))).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })

  it('still works when storage is blocked (same key for this app session)', () => {
    const a = getDeviceKey(brokenStorage)
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(getDeviceKey(brokenStorage)).toBe(a)
  })
})

describe('detectKind', () => {
  const nav = (userAgent, platform = '', maxTouchPoints = 0) => ({ userAgent, platform, maxTouchPoints })
  it('spots an iPad even though Safari pretends to be a Mac', () => {
    expect(detectKind(nav('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/18.1 Safari/605.1.15', 'MacIntel', 5))).toBe('iPad')
    expect(detectKind(nav('Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)', 'iPad', 5))).toBe('iPad')
  })
  it('names the other devices', () => {
    expect(detectKind(nav('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X)', 'iPhone', 5))).toBe('iPhone')
    expect(detectKind(nav('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/131', 'MacIntel', 0))).toBe('Mac')
    expect(detectKind(nav('Mozilla/5.0 (Linux; Android 14; Pixel 8)', 'Linux armv8l', 5))).toBe('Android')
    expect(detectKind(nav('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win32'))).toBe('Windows')
    expect(detectKind(nav('Mozilla/5.0 (X11; Linux x86_64)', 'Linux x86_64'))).toBe('Linux')
    expect(detectKind(nav('kulkas', ''))).toBe('Lainnya')
    expect(detectKind(undefined)).toBe('Lainnya')
  })
})
