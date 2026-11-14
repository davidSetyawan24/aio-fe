import { createPinia, setActivePinia } from 'pinia'
import { THEME_KEY } from '@/lib/theme.js'
import { useThemeStore } from './theme.js'

const memoryStorage = (initial = {}) => {
  const data = { ...initial }
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => (data[k] = String(v)), data }
}
/** matchMedia palsu yang bisa "ganti tema device". */
function fakeMedia(matches) {
  const listeners = []
  return {
    matches,
    addEventListener: (_, fn) => listeners.push(fn),
    flip(next) {
      this.matches = next
      listeners.forEach((fn) => fn({ matches: next }))
    },
  }
}
const isDark = () => document.documentElement.classList.contains('theme-dark')

beforeEach(() => {
  setActivePinia(createPinia())
  document.documentElement.className = ''
})

describe('theme store', () => {
  it('applies the saved choice right away on init', () => {
    const theme = useThemeStore()
    theme.init({ storage: memoryStorage({ [THEME_KEY]: 'dark' }), media: fakeMedia(false), doc: document })
    expect(theme.pref).toBe('dark')
    expect(isDark()).toBe(true)
  })

  it('saves and applies a new choice', () => {
    const storage = memoryStorage()
    const theme = useThemeStore()
    theme.init({ storage, media: fakeMedia(false), doc: document })
    expect(theme.pref).toBe('system')
    theme.setPref('dark')
    expect(storage.data[THEME_KEY]).toBe('dark')
    expect(theme.resolved).toBe('dark')
    expect(isDark()).toBe(true)
  })

  it('follows the device live when set to system', () => {
    const media = fakeMedia(false)
    const theme = useThemeStore()
    theme.init({ storage: memoryStorage(), media, doc: document })
    expect(isDark()).toBe(false)
    media.flip(true)
    expect(theme.resolved).toBe('dark')
    expect(isDark()).toBe(true)
  })

  it('keeps a manual choice when the device changes', () => {
    const media = fakeMedia(false)
    const theme = useThemeStore()
    theme.init({ storage: memoryStorage({ [THEME_KEY]: 'light' }), media, doc: document })
    media.flip(true)
    expect(theme.resolved).toBe('light')
    expect(isDark()).toBe(false)
  })
})

describe('theme store — blocked storage', () => {
  // Review 14/11: Safari "Block All Cookies" bikin AKSES ke window.localStorage aja udah throw (SecurityError).
  // Kalau nggak ditangkep, init() throw → app nggak pernah di-mount → layar kosong.
  it('falls back to system instead of crashing when touching localStorage throws', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage')
    Object.defineProperty(window, 'localStorage', { configurable: true, get: () => { throw new Error('SecurityError') } })
    try {
      const theme = useThemeStore()
      expect(() => theme.init({ media: fakeMedia(true), doc: document })).not.toThrow()
      expect(theme.pref).toBe('system')
      expect(isDark()).toBe(true)
      expect(() => theme.setPref('light')).not.toThrow()
    } finally {
      Object.defineProperty(window, 'localStorage', original)
    }
  })
})
