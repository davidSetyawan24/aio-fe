import { badgeText, dayGroup, timeLabel } from './notifTime.js'

const now = new Date(2026, 10, 14, 10, 0) // Sabtu 14 Nov 2026

describe('dayGroup', () => {
  it('groups by calendar day', () => {
    expect(dayGroup(new Date(2026, 10, 14, 0, 1), now)).toBe('Hari ini')
    expect(dayGroup(new Date(2026, 10, 13, 23, 0), now)).toBe('Kemarin')
    expect(dayGroup(new Date(2026, 10, 9, 8, 0), now)).toBe('Minggu ini')
    expect(dayGroup(new Date(2026, 10, 1, 8, 0), now)).toBe('Lebih lama')
  })
})

describe('timeLabel', () => {
  it('shows the clock for today and yesterday, the weekday this week, the date after that', () => {
    expect(timeLabel(new Date(2026, 10, 14, 8, 5), now)).toBe('08.05')
    expect(timeLabel(new Date(2026, 10, 13, 19, 30), now)).toBe('19.30')
    expect(timeLabel(new Date(2026, 10, 11, 14, 0), now)).toBe('Rab')
    expect(timeLabel(new Date(2026, 10, 3, 14, 0), now)).toBe('3 Nov')
  })
})

describe('badgeText', () => {
  it('hides zero and caps at 9+', () => {
    expect(badgeText(0)).toBe('')
    expect(badgeText(3)).toBe('3')
    expect(badgeText(9)).toBe('9')
    expect(badgeText(12)).toBe('9+')
  })
})
