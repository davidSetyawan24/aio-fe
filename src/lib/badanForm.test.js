import { blankForm, formErrors, fromRead, fromWeighing, parseDate, parseNum, parseTime, toPayload } from './badanForm.js'

const TODAY = '2026-11-19'
const weighing = { id: 7, weighedOn: '2026-11-17', weighedAt: '06:12', weight: 75.1, fat: 25.6, muscle: 52.85, water: 51, visceral: 10, bone: 2.83, protein: 19.5, bmr: 1650, bmi: 27.2, score: 56, bodyType: 'thick_set', source: 'scan' }

describe('parseNum', () => {
  it('reads comma and dot decimals', () => {
    expect(parseNum('74,9')).toBe(74.9)
    expect(parseNum('74.90')).toBe(74.9)
    expect(parseNum('2,83')).toBe(2.83)
    expect(parseNum(' 74 ,9 ')).toBe(74.9)
  })
  it('treats dot + 3 digits as thousands only for bmr/score/visceral', () => {
    expect(parseNum('1.650', 'bmr')).toBe(1650)
    expect(parseNum('1.650')).toBe(1.65)
    expect(parseNum('1.650,5', 'bmr')).toBe(1650.5)
  })
  it('empty is null and junk is NaN', () => {
    expect(parseNum('')).toBeNull()
    expect(parseNum('   ')).toBeNull()
    expect(parseNum('abc')).toBeNaN()
  })
})

describe('parseDate / parseTime', () => {
  it('reads "19 November", "19 Nov", "19/11" with the current year', () => {
    expect(parseDate('19 November', 2026)).toBe('2026-11-19')
    expect(parseDate('3 nov', 2026)).toBe('2026-11-03')
    expect(parseDate('19/11', 2026)).toBe('2026-11-19')
    expect(parseDate('17 November 2025', 2026)).toBe('2025-11-17')
    expect(parseDate('31 Februari', 2026)).toBeNull()
    expect(parseDate('ngaco', 2026)).toBeNull()
  })
  it('reads 06.12 / 6:12 / 0612', () => {
    expect(parseTime('06.12')).toBe('06:12')
    expect(parseTime('6:12')).toBe('06:12')
    expect(parseTime('0612')).toBe('06:12')
    expect(parseTime('25.00')).toBeNull()
    expect(parseTime('')).toBeNull()
  })
})

describe('forms', () => {
  it('blank manual form uses today and the current time, empty numbers', () => {
    const f = blankForm({ date: TODAY, minutes: 7 * 60 + 15 })
    expect(f.date).toBe('19 November')
    expect(f.time).toBe('07.15')
    expect(f.values.weight).toBe('')
    expect(f.bodyType).toBe('')
  })
  it('fromWeighing writes numbers with their decimals and the year only when it is not this year', () => {
    const f = fromWeighing(weighing, TODAY)
    expect(f.date).toBe('17 November')
    expect(f.time).toBe('06.12')
    expect(f.values.weight).toBe('75,10')
    expect(f.values.bmr).toBe('1650')
    expect(f.bodyType).toBe('thick_set')
    expect(fromWeighing({ ...weighing, weighedOn: '2025-11-17' }, TODAY).date).toBe('17 November 2025')
  })
  it('fromRead fills numbers and falls back to now for the time', () => {
    const f = fromRead({ weight: 74.9, bone: 2.83, bodyType: 'thick_set' }, { date: TODAY, minutes: 6 * 60 + 42 })
    expect(f.values.weight).toBe('74,90')
    expect(f.values.fat).toBe('')
    expect(f.time).toBe('06.42')
    expect(f.bodyType).toBe('thick_set')
  })
  it('requires weight, range-checks, rejects a future date and a bad time', () => {
    const f = blankForm({ date: TODAY, minutes: 600 })
    expect(formErrors(f, TODAY).weight).toBe('Beratnya wajib diisi.')
    f.values.weight = '10'
    expect(formErrors(f, TODAY).weight).toBe('Di luar rentang wajar (20–300).')
    f.values.weight = '74,9'
    f.values.fat = '90'
    expect(formErrors(f, TODAY).fat).toBe('Di luar rentang wajar (1–75).')
    f.values.fat = 'x'
    expect(formErrors(f, TODAY).fat).toBe('Isi angka aja ya.')
    f.values.fat = ''
    f.date = '20 November'
    expect(formErrors(f, TODAY).date).toBe('Tanggalnya belum kejadian.')
    f.date = 'ngaco'
    expect(formErrors(f, TODAY).date).toBe('Tanggalnya nggak kebaca. Contoh: 19 November.')
    f.date = '19 November'
    f.time = '25.00'
    expect(formErrors(f, TODAY).time).toBe('Jamnya nggak kebaca. Contoh: 07.15.')
    f.time = '07.15'
    expect(formErrors(f, TODAY)).toEqual({})
  })
  it('builds the payload: numbers or null, ISO date, HH:MM, source', () => {
    const f = blankForm({ date: TODAY, minutes: 7 * 60 + 15 })
    f.values.weight = '74,9'
    f.values.bmr = '1.650'
    f.bodyType = 'skinny'
    const p = toPayload(f, 'manual', TODAY)
    expect(p).toMatchObject({ weighedOn: '2026-11-19', weighedAt: '07:15', weight: 74.9, fat: null, bmr: 1650, bodyType: 'skinny', source: 'manual' })
    f.bodyType = ''
    expect(toPayload(f, 'manual', TODAY).bodyType).toBeNull()
  })
})
