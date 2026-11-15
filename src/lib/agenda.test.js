import {
  addDays,
  dayTitle,
  defaultReminders,
  mapsUrl,
  monthCells,
  rangeFor,
  stripAround,
  relLabel,
  reminderKey,
  reminderLabel,
  repeatLabel,
  shortDate,
  weekDates,
  weekStart,
} from './agenda.js'

const TODAY = '2026-11-15' // Minggu

describe('agenda lib', () => {
  it('counts dates without time zone surprises', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31')
  })

  it('starts the week on Monday', () => {
    expect(weekStart('2026-11-15')).toBe('2026-11-09')
    expect(weekStart('2026-11-09')).toBe('2026-11-09')
    expect(weekDates('2026-11-12')).toEqual(['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'])
  })

  it('asks the server for the range each view shows', () => {
    expect(rangeFor('day', TODAY, false)).toEqual({ from: '2026-11-09', to: '2026-11-15' })
    expect(rangeFor('week', TODAY, true)).toEqual({ from: '2026-11-09', to: '2026-11-15' })
    // Bulan (dan Hari di PC, karena ada kalender kecil): 6 minggu penuh dari Senin sebelum tgl 1.
    expect(rangeFor('month', TODAY, false)).toEqual({ from: '2026-10-26', to: '2026-12-06' })
    expect(rangeFor('day', TODAY, true)).toEqual({ from: '2026-10-26', to: '2026-12-06' })
    // HP: strip 7 hari mulai dari stripStart (hari ini di tengah)
    expect(rangeFor('day', TODAY, false, '2026-11-12')).toEqual({ from: '2026-11-12', to: '2026-11-18' })
    expect(rangeFor('week', TODAY, false, '2026-11-12')).toEqual({ from: '2026-11-09', to: '2026-11-15' })
  })

  it('lists the month grid, dropping a last week that is all next month', () => {
    const cells = monthCells('2026-10-01') // 1 Okt = Kamis, 31 Okt = Sabtu
    expect(cells[0]).toBe('2026-09-28')
    expect(cells.at(-1)).toBe('2026-11-01')
    expect(cells).toHaveLength(35)
    expect(monthCells('2026-11-01').at(-1)).toBe('2026-12-06') // 30 Nov = Senin → 6 minggu
    expect(monthCells('2027-02-01')).toHaveLength(28) // 1 Feb = Senin, 28 hari
  })

  it('names days the way the screen says them', () => {
    expect(dayTitle('2026-11-15')).toBe('Minggu, 15 Nov')
    expect(shortDate('2026-11-21')).toBe('Sab 21 Nov')
    expect(relLabel('2026-11-15', TODAY)).toBe('Hari ini')
    expect(relLabel('2026-11-16', TODAY)).toBe('Besok')
    expect(relLabel('2026-11-14', TODAY)).toBe('Kemarin')
    expect(relLabel('2026-11-21', TODAY)).toBe('Sab 21 Nov')
  })

  it('labels reminders', () => {
    expect(reminderLabel({ type: 'before', minutes: 0 })).toBe('Pas mulai')
    expect(reminderLabel({ type: 'before', minutes: 30 })).toBe('30 mnt sebelum')
    expect(reminderLabel({ type: 'before', minutes: 60 })).toBe('1 jam sebelum')
    expect(reminderLabel({ type: 'before', minutes: 150 })).toBe('2 jam 30 mnt sebelum')
    expect(reminderLabel({ type: 'before', minutes: 1440 })).toBe('1 hari sebelum')
    expect(reminderLabel({ type: 'day', offset: 0, time: '08:00' })).toBe('Hari itu 08:00')
    expect(reminderLabel({ type: 'day', offset: -1, time: '20:00' })).toBe('H-1 20:00')
    expect(reminderKey({ type: 'day', offset: -1, time: '20:00' })).toBe('day:-1:20:00')
  })

  it('fills one reminder by default, by kind of event', () => {
    expect(defaultReminders(false)).toEqual([{ type: 'before', minutes: 30 }])
    expect(defaultReminders(true)).toEqual([{ type: 'day', offset: -1, time: '20:00' }])
  })

  it('labels repeats', () => {
    expect(repeatLabel({ freq: 'none', days: [], until: null })).toBe('')
    expect(repeatLabel({ freq: 'weekly', days: [0, 1, 4], until: null })).toBe('Tiap Sen, Kam, Min')
    expect(repeatLabel({ freq: 'monthly', days: [], until: '2027-03-31' })).toBe('Tiap bulan s.d. Rab 31 Mar')
    expect(repeatLabel({ freq: 'daily', days: [], until: null })).toBe('Tiap hari')
    expect(repeatLabel({ freq: 'yearly', days: [], until: null })).toBe('Tiap tahun')
  })

  it('links a typed location to a Google Maps search', () => {
    expect(mapsUrl('Fairmont Jakarta, Senayan')).toBe('https://www.google.com/maps/search/?api=1&query=Fairmont%20Jakarta%2C%20Senayan')
  })
})

describe('stripAround', () => {
  it('7 hari dengan tanggal itu di tengah (3 ke belakang, 3 ke depan)', () => {
    expect(stripAround('2026-11-15')).toEqual(['2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18'])
    expect(stripAround('2026-03-01')[0]).toBe('2026-02-26')
  })
})
