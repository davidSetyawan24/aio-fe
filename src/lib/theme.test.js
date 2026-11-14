import { applyTheme, readThemePref, resolveTheme, saveThemePref, setStatusBarColor, statusBarColor, THEME_KEY } from './theme.js'

const memoryStorage = (initial = {}) => {
  const data = { ...initial }
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => (data[k] = String(v)), data }
}
const brokenStorage = { getItem: () => { throw new Error('private mode') }, setItem: () => { throw new Error('private mode') } }

describe('readThemePref', () => {
  it('reads a saved choice', () => {
    expect(readThemePref(memoryStorage({ [THEME_KEY]: 'dark' }))).toBe('dark')
    expect(readThemePref(memoryStorage({ [THEME_KEY]: 'light' }))).toBe('light')
  })

  it('falls back to system when nothing or junk is saved', () => {
    expect(readThemePref(memoryStorage())).toBe('system')
    expect(readThemePref(memoryStorage({ [THEME_KEY]: 'ungu' }))).toBe('system')
  })

  it('falls back to system when storage throws', () => {
    expect(readThemePref(brokenStorage)).toBe('system')
    expect(readThemePref(undefined)).toBe('system')
  })
})

describe('saveThemePref', () => {
  it('saves the choice and swallows storage errors', () => {
    const s = memoryStorage()
    saveThemePref(s, 'dark')
    expect(s.data[THEME_KEY]).toBe('dark')
    expect(() => saveThemePref(brokenStorage, 'dark')).not.toThrow()
  })
})

describe('resolveTheme', () => {
  it('follows the device only for system', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
})

describe('statusBarColor', () => {
  it('matches the app background, but login/splash stay dark', () => {
    expect(statusBarColor('light', false)).toBe('#F3F2EE')
    expect(statusBarColor('dark', false)).toBe('#0B0B0A')
    expect(statusBarColor('light', true)).toBe('#070807')
  })
})

describe('applyTheme / setStatusBarColor', () => {
  beforeEach(() => {
    document.documentElement.className = ''
    document.head.innerHTML = '<meta name="theme-color" content="#070807">'
  })

  it('switches the dark classes and native color scheme', () => {
    applyTheme(document, 'dark')
    const html = document.documentElement
    expect(html.classList.contains('theme-dark')).toBe(true)
    expect(html.classList.contains('ion-palette-dark')).toBe(true)
    expect(html.style.colorScheme).toBe('dark')
    applyTheme(document, 'light')
    expect(html.classList.contains('theme-dark')).toBe(false)
    expect(html.classList.contains('ion-palette-dark')).toBe(false)
    expect(html.style.colorScheme).toBe('light')
  })

  it('sets the theme-color meta', () => {
    setStatusBarColor(document, '#F3F2EE')
    expect(document.querySelector('meta[name="theme-color"]').content).toBe('#F3F2EE')
  })
})
