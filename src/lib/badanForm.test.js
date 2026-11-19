import { blankForm, dateLabel, formErrors, fromRead, fromWeighing, parseNum, timeLabel, toPayload } from './badanForm.js'

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

describe('labels', () => {
  it('writes the date long and the year only when it is not this year; time with a dot', () => {
    expect(dateLabel('2026-11-19', TODAY)).toBe('19 November')
    expect(dateLabel('2025-11-17', TODAY)).toBe('17 November 2025')
    expect(dateLabel('', TODAY)).toBe('Pilih tanggal')
    expect(timeLabel('06:42')).toBe('06.42')
  })
})

describe('forms', () => {
  it('blank manual form uses today and the current time, empty numbers', () => {
    const f = blankForm({ date: TODAY, minutes: 7 * 60 + 15 })
    expect(f.date).toBe('2026-11-19')
    expect(f.time).toBe('07:15')
    expect(f.values.weight).toBe('')
    expect(f.bodyType).toBe('')
  })
  it('fromWeighing keeps ISO date / HH:MM and writes numbers with their decimals', () => {
    const f = fromWeighing(weighing)
    expect(f.date).toBe('2026-11-17')
    expect(f.time).toBe('06:12')
    expect(f.values.weight).toBe('75,10')
    expect(f.values.bmr).toBe('1.650')
    expect(f.values.score).toBe('56')
    expect(f.bodyType).toBe('thick_set')
  })
  it('fromRead fills numbers and falls back to now for the time', () => {
    const f = fromRead({ weight: 74.9, bone: 2.83, bodyType: 'thick_set' }, { date: TODAY, minutes: 6 * 60 + 42 })
    expect(f.values.weight).toBe('74,90')
    expect(f.values.fat).toBe('')
    expect(f.time).toBe('06:42')
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
    f.date = '2026-11-20'
    expect(formErrors(f, TODAY).date).toBe('Tanggalnya belum kejadian.')
    f.date = ''
    expect(formErrors(f, TODAY).date).toBe('Tanggalnya belum diisi.')
    f.date = '2026-11-19'
    f.time = ''
    expect(formErrors(f, TODAY).time).toBe('Jamnya belum diisi.')
    f.time = '07:15'
    expect(formErrors(f, TODAY)).toEqual({})
  })
  it('rentang desimal ditulis pakai koma', () => {
    const f = blankForm({ date: TODAY, minutes: 600 })
    f.values.weight = '74,9'
    f.values.bone = '12'
    expect(formErrors(f, TODAY).bone).toBe('Di luar rentang wajar (0,5–10).')
  })
  it('visceral, BMR, skor harus bulat (pesan di kolomnya)', () => {
    const f = blankForm({ date: TODAY, minutes: 600 })
    f.values.weight = '74,9'
    f.values.visceral = '10,5'
    f.values.bmr = '1650,5'
    f.values.score = '56.5'
    const e = formErrors(f, TODAY)
    expect(e.visceral).toBe('Angkanya harus bulat.')
    expect(e.bmr).toBe('Angkanya harus bulat.')
    expect(e.score).toBe('Angkanya harus bulat.')
    f.values.visceral = '10'
    f.values.bmr = '1.650'
    f.values.score = '56'
    expect(formErrors(f, TODAY)).toEqual({})
  })
  it('BMR ditulis pakai titik ribuan & kebaca balik jadi angka yang sama', () => {
    const f = fromRead({ bmr: 1650, weight: 74.9 }, { date: TODAY, minutes: 600 })
    expect(f.values.bmr).toBe('1.650')
    expect(toPayload(f, 'scan').bmr).toBe(1650)
  })
  it('builds the payload: numbers or null, date, time, source', () => {
    const f = blankForm({ date: TODAY, minutes: 7 * 60 + 15 })
    f.values.weight = '74,9'
    f.values.bmr = '1.650'
    f.bodyType = 'skinny'
    const p = toPayload(f, 'manual')
    expect(p).toMatchObject({ weighedOn: '2026-11-19', weighedAt: '07:15', weight: 74.9, fat: null, bmr: 1650, bodyType: 'skinny', source: 'manual' })
    f.bodyType = ''
    expect(toPayload(f, 'manual').bodyType).toBeNull()
  })
})
