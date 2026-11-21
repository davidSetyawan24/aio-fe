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
})
