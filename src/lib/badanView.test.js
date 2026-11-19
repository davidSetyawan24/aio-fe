import { avgLabel, dDay, dayWord, deltaView, fmtU, headerSub, isBadanChild, jam, rangeScale, reachView, rowTitle, startOn } from './badanView.js'

describe('badanView', () => {
  it('hari relatif', () => {
    expect(dayWord('2026-11-19', '2026-11-19')).toBe('hari ini')
    expect(dayWord('2026-11-18', '2026-11-19')).toBe('kemarin')
    expect(dayWord('2026-11-16', '2026-11-19')).toBe('Sen, 16 Nov')
    expect(dDay('2026-11-17')).toBe('Sel, 17 Nov')
    expect(rowTitle('2026-11-19', '2026-11-19')).toBe('Hari ini')
  })
  it('sub header', () => {
    expect(headerSub('Cutting', '2026-11-19', '06:42', '2026-11-19')).toBe('Cutting · timbang terakhir hari ini, 06.42')
    expect(headerSub(null, '2026-11-18', '06:42', '2026-11-19')).toBe('timbang terakhir kemarin, 06.42')
    expect(jam('06:42')).toBe('06.42')
  })
  it('delta & skala', () => {
    expect(deltaView(null, 1)).toBeNull()
    expect(deltaView(-0.44, 1)).toEqual({ dir: 'down', text: '0,4' })
    expect(deltaView(0.01, 1).dir).toBe('flat')
    const s = rangeScale(73, 76, 74.5)
    expect(s.lo).toBe(72)
    expect(s.hi).toBe(77)
    expect(s.pos(72)).toBe(0)
  })
})

describe('dLong', () => {
  it('writes weekday and the full month name', async () => {
    const { dLong } = await import('./badanView.js')
    expect(dLong('2026-11-19')).toBe('Kamis, 19 November')
  })
})

describe('avgLabel (rata-rata dari < 3 timbangan nggak ngaku 7 hari)', () => {
  it('3+ → Rata-rata 7 hari, 2 → Rata-rata 2 timbangan, 1 → Timbangan terakhir', () => {
    expect(avgLabel(3)).toBe('Rata-rata 7 hari')
    expect(avgLabel(7)).toBe('Rata-rata 7 hari')
    expect(avgLabel(2)).toBe('Rata-rata 2 timbangan')
    expect(avgLabel(1)).toBe('Timbangan terakhir')
  })
})

describe('fmtU (kosong tanpa satuan)', () => {
  it('angka + satuan, kosong cuma "–"', () => {
    expect(fmtU(25.64, 1, '%')).toBe('25,6%')
    expect(fmtU(52.9, 1, ' kg')).toBe('52,9 kg')
    expect(fmtU(null, 1, '%')).toBe('–')
    expect(fmtU(undefined, 2, ' kg')).toBe('–')
  })
})

describe('startOn (tanggal timbangan yang dipakai buat nilai awal)', () => {
  const rows = [{ weighedOn: '2026-11-10' }, { weighedOn: '2026-11-18' }, { weighedOn: '2026-11-25' }]
  it('timbangan terakhir sebelum / pas mulai', () => {
    expect(startOn(rows, '2026-11-19')).toBe('2026-11-18')
    expect(startOn(rows, '2026-11-18')).toBe('2026-11-18')
  })
  it('belum ada sebelum mulai → timbangan pertama sesudahnya; kosong → tanggal mulai', () => {
    expect(startOn(rows, '2026-11-01')).toBe('2026-11-10')
    expect(startOn([], '2026-11-01')).toBe('2026-11-01')
  })
})

describe('reachView (Cutting/Bulking yang awalnya udah lewat goal)', () => {
  it('awal udah di bawah goal, sekarang naik lagi di atas kisaran → 0% & kurang = sekarang − goal', () => {
    const g = { mode: 'reach', state: 'progress', goal: 69, min: 65, max: 69, pct: 100, left: 0 }
    expect(reachView(g, 71.2)).toMatchObject({ pct: 0, left: expect.closeTo(2.2, 6) })
  })
  it('bulking kebalik juga', () => {
    const g = { mode: 'reach', state: 'progress', goal: 65, min: 65, max: 69, pct: 100, left: 0 }
    expect(reachView(g, 63.5)).toMatchObject({ pct: 0, left: 1.5 })
  })
  it('progres biasa / state lain / keep nggak diubah', () => {
    const g = { mode: 'reach', state: 'progress', goal: 69, min: 65, max: 69, pct: 40, left: 4.9 }
    expect(reachView(g, 73.9)).toBe(g)
    const inn = { mode: 'reach', state: 'in', goal: 69, min: 65, max: 69, pct: 100, left: 0 }
    expect(reachView(inn, 68)).toBe(inn)
    const keep = { mode: 'keep', inRange: true, min: 65, max: 69 }
    expect(reachView(keep, 67)).toBe(keep)
    expect(reachView(null, 67)).toBeNull()
  })
})

describe('isBadanChild', () => {
  it('halaman anak Badan aja', () => {
    expect(isBadanChild('/tabs/menu/badan/12')).toBe(true)
    expect(isBadanChild('/tabs/menu/badan/catat')).toBe(true)
    expect(isBadanChild('/tabs/menu/badan')).toBe(false)
    expect(isBadanChild('/tabs/menu')).toBe(false)
    expect(isBadanChild('/tabs/menu/badanx')).toBe(false)
    expect(isBadanChild(null)).toBe(false)
  })
})
