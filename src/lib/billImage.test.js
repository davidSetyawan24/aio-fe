import { saveMode } from './billImage.js'

describe('saveMode', () => {
  it('downloads straight away on a Mac (mouse), shares on iPhone/iPad (touch)', () => {
    expect(saveMode({ touch: false, canShare: true })).toBe('download')
    expect(saveMode({ touch: true, canShare: true })).toBe('share')
  })

  it('downloads when the browser cannot share a file', () => {
    expect(saveMode({ touch: true, canShare: false })).toBe('download')
  })
})
