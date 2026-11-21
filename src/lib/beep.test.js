import { beep, unlockAudio } from './beep.js'

describe('beep', () => {
  it('AudioContext yang nggak "running" (suspended / interrupted) di-resume pas unlock & beep', () => {
    const resume = vi.fn()
    const osc = () => ({ frequency: {}, connect: (n) => n, start: vi.fn(), stop: vi.fn() })
    const gain = () => ({ gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: (n) => n })
    class FakeCtx {
      constructor() { this.state = 'interrupted'; this.currentTime = 0; this.destination = {}; this.resume = resume }
      createOscillator = osc
      createGain = gain
    }
    window.AudioContext = FakeCtx
    unlockAudio()
    expect(resume).toHaveBeenCalledTimes(1)
    beep()
    expect(resume).toHaveBeenCalledTimes(2)
    delete window.AudioContext
  })

  it('resume ditolak (iOS) → penolakannya ditangkep (nggak jadi unhandled rejection), bip tetep dicoba', async () => {
    vi.resetModules()
    const fresh = await import('./beep.js')
    const caught = vi.fn()
    const resume = vi.fn(() => ({ catch: caught }))
    const start = vi.fn()
    class FakeCtx {
      constructor() { this.state = 'suspended'; this.currentTime = 0; this.destination = {}; this.resume = resume }
      createOscillator = () => ({ frequency: {}, connect: (n) => n, start, stop: vi.fn() })
      createGain = () => ({ gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: (n) => n })
    }
    window.AudioContext = FakeCtx
    fresh.unlockAudio()
    fresh.beep()
    delete window.AudioContext
    expect(caught).toHaveBeenCalledTimes(2)
    expect(start).toHaveBeenCalledTimes(3)
  })

  it('resume nggak balikin promise (Safari lama) → aman', async () => {
    vi.resetModules()
    const fresh = await import('./beep.js')
    class FakeCtx {
      constructor() { this.state = 'suspended'; this.currentTime = 0; this.destination = {}; this.resume = () => undefined }
      createOscillator = () => ({ frequency: {}, connect: (n) => n, start: vi.fn(), stop: vi.fn() })
      createGain = () => ({ gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: (n) => n })
    }
    window.AudioContext = FakeCtx
    expect(() => fresh.unlockAudio()).not.toThrow()
    delete window.AudioContext
  })
})
