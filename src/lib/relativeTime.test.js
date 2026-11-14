import { activeLabel, formatDay } from './relativeTime.js'

const now = new Date(2026, 10, 14, 10, 0) // 14 Nov 2026, 10:00 waktu lokal

describe('activeLabel', () => {
  it('says "aktif sekarang" for this device', () => {
    expect(activeLabel(new Date(2026, 10, 1), now, true)).toBe('aktif sekarang')
  })
  it('counts calendar days, not 24-hour blocks', () => {
    expect(activeLabel(new Date(2026, 10, 14, 0, 5), now)).toBe('aktif hari ini')
    expect(activeLabel(new Date(2026, 10, 13, 23, 50), now)).toBe('aktif kemarin')
    expect(activeLabel(new Date(2026, 10, 11, 12, 0), now)).toBe('aktif 3 hari lalu')
    expect(activeLabel('2026-11-02T03:00:00.000Z', now)).toBe('aktif 12 hari lalu')
  })
  it('treats a future time (clock drift) as today', () => {
    expect(activeLabel(new Date(2026, 10, 15), now)).toBe('aktif hari ini')
  })
})

describe('formatDay', () => {
  it('formats like "14 Nov 2026"', () => {
    expect(formatDay(new Date(2026, 10, 14))).toBe('14 Nov 2026')
  })
})
