import { APPLY_FALLBACK_MS, CHECK_EVERY_MS, createApplier, watchForUpdates } from './appUpdate.js'

function fakeDoc(state = 'visible') {
  const doc = new EventTarget()
  doc.visibilityState = state
  doc.show = (s) => {
    doc.visibilityState = s
    doc.dispatchEvent(new Event('visibilitychange'))
  }
  return doc
}

function fakeInterval() {
  const t = { calls: [], cleared: [] }
  t.set = vi.fn((fn, ms) => {
    t.calls.push({ fn, ms })
    return 42
  })
  t.clear = vi.fn((id) => t.cleared.push(id))
  return t
}

describe('watchForUpdates', () => {
  it('ngecek sekali pas mulai, tiap balik keliatan, dan tiap 30 menit pas keliatan', () => {
    const registration = { update: vi.fn(() => Promise.resolve()) }
    const doc = fakeDoc()
    const t = fakeInterval()
    watchForUpdates({ registration, doc, setIntervalFn: t.set, clearIntervalFn: t.clear })
    expect(registration.update).toHaveBeenCalledTimes(1)
    expect(t.calls[0].ms).toBe(CHECK_EVERY_MS)
    expect(CHECK_EVERY_MS).toBe(1_800_000)

    doc.visibilityState = 'hidden'
    t.calls[0].fn()
    expect(registration.update).toHaveBeenCalledTimes(1)
    doc.visibilityState = 'visible'
    t.calls[0].fn()
    expect(registration.update).toHaveBeenCalledTimes(2)

    doc.show('visible')
    expect(registration.update).toHaveBeenCalledTimes(3)
    doc.show('hidden')
    expect(registration.update).toHaveBeenCalledTimes(3)
  })

  it('interval cuma satu, stop ngebersihin', () => {
    const registration = { update: vi.fn(() => Promise.resolve()) }
    const doc = fakeDoc()
    const t = fakeInterval()
    const stop = watchForUpdates({ registration, doc, setIntervalFn: t.set, clearIntervalFn: t.clear })
    doc.show('visible')
    doc.show('visible')
    expect(t.set).toHaveBeenCalledTimes(1)
    stop()
    expect(t.clear).toHaveBeenCalledWith(42)
    doc.show('visible')
    expect(registration.update).toHaveBeenCalledTimes(3)
  })

  it('update gagal (offline) nggak bikin error', async () => {
    const registration = { update: vi.fn(() => Promise.reject(new Error('offline'))) }
    const t = fakeInterval()
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)
    watchForUpdates({ registration, doc: fakeDoc(), setIntervalFn: t.set, clearIntervalFn: t.clear })
    await new Promise((r) => setTimeout(r, 0))
    process.off('unhandledRejection', unhandled)
    expect(unhandled).not.toHaveBeenCalled()
  })
})

describe('createApplier', () => {
  it('apply: updateSW(true) sekali + cadangan reload 5 detik, tap dobel diabaikan', () => {
    const updateSW = vi.fn(() => Promise.resolve())
    const reload = vi.fn()
    const timers = []
    const setTimeoutFn = vi.fn((fn, ms) => timers.push({ fn, ms }))
    const apply = createApplier({ updateSW, reload, setTimeoutFn })
    apply()
    apply()
    expect(updateSW).toHaveBeenCalledTimes(1)
    expect(updateSW).toHaveBeenCalledWith(true)
    expect(setTimeoutFn).toHaveBeenCalledTimes(1)
    expect(timers[0].ms).toBe(APPLY_FALLBACK_MS)
    expect(APPLY_FALLBACK_MS).toBe(5000)
    expect(reload).not.toHaveBeenCalled()
    timers[0].fn()
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
