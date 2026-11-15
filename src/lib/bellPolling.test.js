import { startBellPolling } from './bellPolling.js'

describe('startBellPolling', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('refreshes the bell every minute while the app is visible', () => {
    const doc = { visibilityState: 'visible' }
    const refresh = vi.fn()
    const stop = startBellPolling(refresh, { doc })
    vi.advanceTimersByTime(59_000)
    expect(refresh).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1_000)
    expect(refresh).toHaveBeenCalledTimes(1)
    doc.visibilityState = 'hidden'
    vi.advanceTimersByTime(120_000)
    expect(refresh).toHaveBeenCalledTimes(1)
    doc.visibilityState = 'visible'
    vi.advanceTimersByTime(60_000)
    expect(refresh).toHaveBeenCalledTimes(2)
    stop()
    vi.advanceTimersByTime(60_000)
    expect(refresh).toHaveBeenCalledTimes(2)
  })
})
