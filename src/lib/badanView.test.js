import { dDay, dayWord, deltaView, headerSub, jam, rangeScale, rowTitle } from './badanView.js'

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
