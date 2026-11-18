import { isSkipWaiting } from './swMessages.js'

describe('isSkipWaiting', () => {
  it('cuma bener buat pesan SKIP_WAITING', () => {
    expect(isSkipWaiting({ type: 'SKIP_WAITING' })).toBe(true)
    expect(isSkipWaiting({ type: 'lain' })).toBe(false)
    expect(isSkipWaiting(null)).toBe(false)
    expect(isSkipWaiting(undefined)).toBe(false)
  })
})
