import {
  addMonth,
  DEFAULT_REMINDERS,
  dueChip,
  dueDate,
  firstPeriod,
  monthLabel,
  needsPaidAnswer,
  reminderLabel,
  scheduleText,
  shortDue,
  sortReminders,
} from './bayarRutin.js'

const TODAY = '2026-11-15'

describe('bayarRutin lib', () => {
  it('labels reminders like the mockup and sorts them furthest first', () => {
    expect(reminderLabel({ offset: 3, time: '09:00' })).toBe('H-3 · 09.00')
    expect(reminderLabel({ offset: 0, time: '21:00' })).toBe('Hari H · 21.00')
    expect(sortReminders([{ offset: 0, time: '09:00' }, { offset: 3, time: '12:00' }, { offset: 3, time: '09:00' }])).toEqual([
      { offset: 3, time: '09:00' },
      { offset: 3, time: '12:00' },
      { offset: 0, time: '09:00' },
    ])
    expect(DEFAULT_REMINDERS).toEqual([{ offset: 3, time: '09:00' }, { offset: 0, time: '09:00' }])
  })

  it('describes the schedule and due dates', () => {
    expect(scheduleText({ freq: 'monthly', day: 12, month: null })).toBe('Tiap bulan tgl 12')
    expect(scheduleText({ freq: 'yearly', day: 12, month: 3 })).toBe('Tiap tahun 12 Mar')
    expect(shortDue('2026-11-12')).toBe('12 Nov')
    expect(monthLabel('2026-11')).toBe('November 2026')
    expect(addMonth('2026-12', 1)).toBe('2027-01')
    expect(addMonth('2026-01', -1)).toBe('2025-12')
  })

  it('picks the chip for each row', () => {
    expect(dueChip({ status: 'paid' })).toEqual({ text: 'Lunas', tone: 'green' })
    expect(dueChip({ status: 'late', lateDays: 3 })).toEqual({ text: 'Telat 3 hari', tone: 'red' })
    expect(dueChip({ status: 'open', daysLeft: 0 })).toEqual({ text: 'Hari ini', tone: 'amber' })
    expect(dueChip({ status: 'open', daysLeft: 1 })).toEqual({ text: 'Besok', tone: 'amber' })
    expect(dueChip({ status: 'open', daysLeft: 3 })).toEqual({ text: '3 hari lagi', tone: 'amber' })
    expect(dueChip({ status: 'open', daysLeft: 4 })).toBeNull()
  })

  it('computes due dates and the first period the same way as the server', () => {
    expect(dueDate(31, '2026-02')).toBe('2026-02-28')
    expect(dueDate(31, '2028-02')).toBe('2028-02-29')
    expect(dueDate(12, '2026-11')).toBe('2026-11-12')
    expect(firstPeriod('monthly', null, TODAY)).toBe('2026-11')
    expect(firstPeriod('yearly', 11, TODAY)).toBe('2026-11')
    expect(firstPeriod('yearly', 3, TODAY)).toBe('2027-03')
  })

  it('asks "udah lunas?" only when this month is a period whose due date passed', () => {
    const ask = (freq, day, month) => needsPaidAnswer({ freq, day, month, startMonth: firstPeriod(freq, month, TODAY) }, TODAY)
    expect(ask('monthly', 12, null)).toBe(true)
    expect(ask('monthly', 15, null)).toBe(false)
    expect(ask('monthly', 20, null)).toBe(false)
    expect(ask('yearly', 2, 11)).toBe(true)
    expect(ask('yearly', 12, 3)).toBe(false)
  })
})
