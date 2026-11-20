import { activityErrors, activityPayload, levelFor, speedPreview, targetErrors, targetPayload, targetToForm } from './badanTarget.js'

const DAVID_ACT = { workType: 'stand_walk', workHours: 10, workDays: 7, gymPerWeek: 5, gymMinutes: 75, otherSport: null, notes: null, level: 'active', levelManual: false }
const target = { arah: 'cutting', pace: 'agresif', fat: 20, muscle: 55, weightMin: 65, weightMax: 69, startedOn: '2026-11-14' }

describe('targetToForm', () => {
  it('kosong: arah recomp, pace normal, aktivitas kosong', () => {
    const f = targetToForm(null, null)
    expect(f).toMatchObject({ arah: 'recomp', pace: 'normal', workType: '', workHours: '', workDays: '', gymPerWeek: '', gymMinutes: '', otherSport: '', notes: '', level: '', levelManual: false })
  })

  it('target lama tanpa pace → normal', () => {
    expect(targetToForm({ ...target, pace: null }, null).pace).toBe('normal')
  })

  it('isi dari target + aktivitas (angka jadi teks)', () => {
    const f = targetToForm(target, { ...DAVID_ACT, otherSport: 'futsal', levelManual: true, level: 'light' })
    expect(f).toMatchObject({ arah: 'cutting', pace: 'agresif', fat: '20', weightMax: '69', workType: 'stand_walk', workHours: '10', workDays: '7', gymPerWeek: '5', gymMinutes: '75', otherSport: 'futsal', notes: '', level: 'light', levelManual: true })
  })
})

describe('activityErrors', () => {
  it('kosong semua → lolos', () => {
    expect(activityErrors(targetToForm(null, null))).toEqual({})
  })

  it('lengkap → lolos', () => {
    expect(activityErrors(targetToForm(null, DAVID_ACT))).toEqual({})
  })

  it('keisi sebagian → kolom kosong "Wajib diisi."', () => {
    const f = { ...targetToForm(null, null), gymPerWeek: '5' }
    expect(activityErrors(f)).toEqual({ workType: 'Wajib diisi.', workHours: 'Wajib diisi.', workDays: 'Wajib diisi.', gymMinutes: 'Wajib diisi.' })
  })

  it('cuma catatan / pengali manual juga dianggap ngisi', () => {
    expect(activityErrors({ ...targetToForm(null, null), notes: 'jaga toko' }).workType).toBe('Wajib diisi.')
    expect(activityErrors({ ...targetToForm(null, null), level: 'light', levelManual: true }).workHours).toBe('Wajib diisi.')
  })

  it('angka ngaco / bukan bulat / di luar rentang → pesan kayak server', () => {
    const f = { ...targetToForm(null, DAVID_ACT), workHours: '17', workDays: 'abc', gymPerWeek: '2,5', gymMinutes: '301' }
    expect(activityErrors(f)).toEqual({
      workHours: 'Angkanya di luar rentang wajar (0–16).',
      workDays: 'Angkanya nggak valid.',
      gymPerWeek: 'Angkanya harus bulat.',
      gymMinutes: 'Angkanya di luar rentang wajar (0–300).',
    })
  })
})

describe('levelFor', () => {
  it('levelManual false → dipakai = saran', () => {
    expect(levelFor(targetToForm(null, DAVID_ACT))).toEqual({ suggested: 'active', used: 'active' })
    expect(levelFor({ ...targetToForm(null, DAVID_ACT), gymPerWeek: '6' })).toEqual({ suggested: 'very_active', used: 'very_active' })
  })

  it('levelManual true → dipakai = pilihan sendiri, saran tetep keitung', () => {
    expect(levelFor({ ...targetToForm(null, DAVID_ACT), level: 'light', levelManual: true })).toEqual({ suggested: 'active', used: 'light' })
  })

  it('isian belum lengkap → saran null', () => {
    expect(levelFor(targetToForm(null, null))).toEqual({ suggested: null, used: null })
    expect(levelFor({ ...targetToForm(null, DAVID_ACT), gymPerWeek: '' })).toEqual({ suggested: null, used: null })
  })
})

describe('activityPayload', () => {
  it('kosong semua → null', () => {
    expect(activityPayload(targetToForm(null, null))).toBeNull()
  })

  it('isian → body PUT (level = yang dipakai, teks di-trim, kosong → null)', () => {
    const f = { ...targetToForm(null, DAVID_ACT), otherSport: '  ', notes: ' jaga toko ', level: 'sedentary' }
    expect(activityPayload(f)).toEqual({ ...DAVID_ACT, notes: 'jaga toko', level: 'active' })
  })
})

describe('targetPayload', () => {
  it('cutting/bulking bawa pace, recomp/jaga nggak', () => {
    expect(targetPayload(targetToForm(target, null))).toEqual({ arah: 'cutting', pace: 'agresif', fat: 20, muscle: 55, weightMin: 65, weightMax: 69 })
    expect(targetPayload({ ...targetToForm(target, null), arah: 'recomp' })).toEqual({ arah: 'recomp', fat: 20, muscle: 55, weightMin: 65, weightMax: 69 })
  })

  it('targetErrors tetep jalan dengan isian aktivitas', () => {
    expect(targetErrors(targetToForm(target, DAVID_ACT))).toEqual({})
  })
})

describe('speedPreview', () => {
  const form = { ...targetToForm({ ...target, pace: 'normal' }, null) }

  it('cutting normal berat 74,9 → kisaran kg/minggu + nyampe 69 kg ±Feb 2027 (13 minggu)', () => {
    const p = speedPreview(form, 74.9, '2026-11-20')
    expect(p.lo).toBeCloseTo(0.3745, 4)
    expect(p.hi).toBeCloseTo(0.56175, 4)
    expect(p.pct).toEqual([0.5, 0.75])
    expect(p.reach).toEqual({ goal: 69, month: '2027-02', weeks: 13 })
  })

  it('kisaran kosong / arah nggak bener → tanpa nyampe', () => {
    expect(speedPreview({ ...form, weightMin: '', weightMax: '' }, 74.9, '2026-11-20').reach).toBeNull()
    expect(speedPreview({ ...form, weightMin: '75', weightMax: '78' }, 74.9, '2026-11-20').reach).toBeNull()
    expect(speedPreview({ ...form, arah: 'bulking', weightMin: '70', weightMax: '72' }, 74.9, '2026-11-20').reach).toBeNull()
  })

  it('bulking normal → goal = paling ringan', () => {
    const p = speedPreview({ ...form, arah: 'bulking', weightMin: '76', weightMax: '80' }, 74.9, '2026-11-20')
    expect(p.pct).toEqual([0.25, 0.5])
    expect(p.reach.goal).toBe(76)
  })

  it('belum ada berat → cuma persen', () => {
    expect(speedPreview(form, null, null)).toEqual({ pct: [0.5, 0.75], lo: null, hi: null, reach: null })
  })

  it('recomp → null', () => {
    expect(speedPreview({ ...form, arah: 'recomp' }, 74.9, '2026-11-20')).toBeNull()
  })
})
