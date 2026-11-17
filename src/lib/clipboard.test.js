import { copyToClipboard } from './clipboard.js'

const setSecure = (v) => Object.defineProperty(globalThis, 'isSecureContext', { value: v, configurable: true })
const setClipboard = (c) => Object.defineProperty(navigator, 'clipboard', { value: c, configurable: true })

describe('copyToClipboard', () => {
  let exec
  beforeEach(() => {
    exec = vi.fn(() => true)
    document.execCommand = exec
  })
  afterEach(() => {
    setSecure(true)
    setClipboard(undefined)
  })

  it('uses the clipboard API on a secure page', async () => {
    const writeText = vi.fn(async () => {})
    setSecure(true)
    setClipboard({ writeText })
    expect(await copyToClipboard('3275')).toBe(true)
    expect(writeText).toHaveBeenCalledWith('3275')
    expect(exec).not.toHaveBeenCalled()
  })

  it('falls back to execCommand on an insecure page', async () => {
    const writeText = vi.fn()
    setSecure(false)
    setClipboard({ writeText })
    expect(await copyToClipboard('3275')).toBe(true)
    expect(writeText).not.toHaveBeenCalled()
    expect(exec).toHaveBeenCalledWith('copy')
    expect(document.querySelector('textarea')).toBeNull()
  })

  it('falls back when writeText rejects', async () => {
    setSecure(true)
    setClipboard({ writeText: vi.fn(async () => { throw new Error('nope') }) })
    expect(await copyToClipboard('x')).toBe(true)
    expect(exec).toHaveBeenCalledWith('copy')
  })

  it('reports false when nothing works', async () => {
    setSecure(false)
    exec.mockReturnValue(false)
    expect(await copyToClipboard('x')).toBe(false)
    exec.mockImplementation(() => { throw new Error('no') })
    expect(await copyToClipboard('x')).toBe(false)
  })
})
