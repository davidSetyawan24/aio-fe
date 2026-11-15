import { dayPieces, firstScrollMinute, HOUR_LABELS, toMinutes } from './agendaTimeline.js'

const ev = (id, startTime, endTime, over = {}) => ({ id, title: `E${id}`, allDay: false, startTime, endTime, dayIndex: 1, dayCount: 1, ...over })
const cols = (timed) => Object.fromEntries(timed.map((t) => [t.event.id, [t.col, t.cols]]))

describe('agendaTimeline', () => {
  it('reads HH:MM as minutes and labels the hours', () => {
    expect(toMinutes('09:30')).toBe(570)
    expect(toMinutes('00:00')).toBe(0)
    expect(HOUR_LABELS).toHaveLength(24)
    expect(HOUR_LABELS[0]).toBe('00.00')
    expect(HOUR_LABELS[19]).toBe('19.00')
  })

  it('places a single event by its start and end', () => {
    const { allDay, timed } = dayPieces([ev(1, '10:00', '12:00')])
    expect(allDay).toEqual([])
    expect(timed).toEqual([{ event: expect.objectContaining({ id: 1 }), start: 600, end: 720, col: 0, cols: 1 }])
  })

  it('puts two clashing events side by side', () => {
    const { timed } = dayPieces([ev(1, '10:00', '12:00'), ev(2, '11:00', '13:00')])
    expect(cols(timed)).toEqual({ 1: [0, 2], 2: [1, 2] })
  })

  it('reuses a column in a chain where only neighbours clash', () => {
    // A 9–11 tabrak B 10–12, B tabrak C 11:30–13, A nggak tabrak C → C balik ke kolom 0
    const { timed } = dayPieces([ev(1, '09:00', '11:00'), ev(2, '10:00', '12:00'), ev(3, '11:30', '13:00')])
    expect(cols(timed)).toEqual({ 1: [0, 2], 2: [1, 2], 3: [0, 2] })
  })

  it('splits three at once into three columns, and keeps a later one full width', () => {
    const { timed } = dayPieces([ev(1, '09:00', '10:00'), ev(2, '09:00', '10:00'), ev(3, '09:30', '10:30'), ev(4, '15:00', '16:00')])
    expect(cols(timed)).toEqual({ 1: [0, 3], 2: [1, 3], 3: [2, 3], 4: [0, 1] })
  })

  it('treats end-before-start as a 30 minute event', () => {
    const { timed } = dayPieces([ev(1, '22:00', '22:00')])
    expect([timed[0].start, timed[0].end]).toEqual([1320, 1350])
  })

  it('cuts a timed multi-day event: first day to midnight, last day from midnight, middle days all day', () => {
    const first = dayPieces([ev(1, '20:00', '10:00', { dayIndex: 1, dayCount: 3 })])
    expect([first.timed[0].start, first.timed[0].end]).toEqual([1200, 1440])
    const middle = dayPieces([ev(1, '20:00', '10:00', { dayIndex: 2, dayCount: 3 })])
    expect(middle.timed).toEqual([])
    expect(middle.allDay.map((e) => e.id)).toEqual([1])
    const last = dayPieces([ev(1, '20:00', '10:00', { dayIndex: 3, dayCount: 3 })])
    expect([last.timed[0].start, last.timed[0].end]).toEqual([0, 600])
  })

  it('keeps all-day events out of the hours', () => {
    const { allDay, timed } = dayPieces([ev(1, null, null, { allDay: true }), ev(2, '08:00', '09:00')])
    expect(allDay.map((e) => e.id)).toEqual([1])
    expect(timed.map((t) => t.event.id)).toEqual([2])
  })

  it('scrolls to 07.00, or 30 minutes before an earlier first event', () => {
    expect(firstScrollMinute([[]])).toBe(420)
    expect(firstScrollMinute([dayPieces([ev(1, '10:00', '11:00')]).timed])).toBe(420)
    expect(firstScrollMinute([[], dayPieces([ev(1, '05:30', '06:00')]).timed])).toBe(300)
    expect(firstScrollMinute([dayPieces([ev(1, '00:10', '01:00')]).timed])).toBe(0)
  })
})
