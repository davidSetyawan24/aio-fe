import { describe, expect, it } from 'vitest'
import { editTimes, nearestWibIso, prText, sessionDateLine, sessionName, volChip, weekRange, weekTitle, wibIso } from './gymReport.js'

describe('weekTitle / weekRange', () => {
  // 21 Nov 2026 = Sabtu → minggu ini mulai Senin 16 Nov
  it('Minggu ini / Minggu lalu / rentang tanggal', () => {
    expect(weekTitle('2026-11-16', '2026-11-21')).toBe('Minggu ini')
    expect(weekTitle('2026-11-09', '2026-11-21')).toBe('Minggu lalu')
    expect(weekTitle('2026-11-02', '2026-11-21')).toBe('2–8 Nov')
  })
  it('rentang lintas bulan nyebut bulan di dua sisi', () => {
    expect(weekRange('2026-10-26')).toBe('26 Okt–1 Nov')
    expect(weekRange('2026-11-09')).toBe('9–15 Nov')
  })
})

describe('sessionDateLine / sessionName', () => {
  it('tanggal & jam pakai WIB, termasuk lewat tengah malam', () => {
    expect(sessionDateLine('2026-11-23T11:05:00.000Z', '2026-11-23T12:17:00.000Z')).toBe('Sen, 23 Nov · 18.05–19.17')
    expect(sessionDateLine('2026-11-17T16:30:00.000Z', '2026-11-17T17:40:00.000Z')).toBe('Sel, 17 Nov · 23.30–00.40')
  })
  it('nama sesi = program + tanggal WIB', () => {
    expect(sessionName('push', '2026-11-16T03:00:00.000Z')).toBe('Push 16 Nov')
  })
})

describe('volChip', () => {
  const vs = { sessionId: 1, program: 'push', on: '2026-11-16' }
  it('naik → lime, turun / sama → netral, null → disembunyiin', () => {
    expect(volChip(6, vs)).toEqual({ text: '+6% vs Push 16 Nov', tone: 'up' })
    expect(volChip(-9, vs)).toEqual({ text: '-9% vs Push 16 Nov', tone: 'flat' })
    expect(volChip(0, vs)).toEqual({ text: '0% vs Push 16 Nov', tone: 'flat' })
    expect(volChip(null, null)).toBeNull()
    expect(volChip(5, null)).toBeNull()
  })
})

describe('prText', () => {
  it('beban & reps', () => {
    expect(prText({ kind: 'beban', set: [25, 8], prev: 22.5 })).toBe('beban terberat baru (sebelumnya 22,5 kg)')
    expect(prText({ kind: 'reps', set: [22.5, 10], prev: 8 })).toBe('reps terbanyak di 22,5 kg')
  })
})

describe('editTimes / wibIso', () => {
  it('jam WIB buat <input type=time> + tanggal aslinya', () => {
    expect(editTimes('2026-11-17T16:30:00.000Z', '2026-11-17T17:40:00.000Z')).toEqual({ startDate: '2026-11-17', start: '23:30', endDate: '2026-11-18', end: '00:40' })
  })
  it('wibIso balik ke ISO UTC', () => {
    expect(wibIso('2026-11-18', '00:40')).toBe('2026-11-17T17:40:00.000Z')
    expect(wibIso('2026-11-23', '18:05')).toBe('2026-11-23T11:05:00.000Z')
    expect(wibIso('2026-11-23', '')).toBeNull()
  })
})

describe('nearestWibIso (jam pilihan → tanggal WIB paling deket ke patokan, nggak lewat sekarang)', () => {
  const now = Date.parse('2026-11-23T18:20:00.000Z') // 24 Nov 01.20 WIB
  it('patokan 23.50 (D), sekarang 01.20 (D+1), pilih 00.10 → D+1 00.10', () => {
    expect(nearestWibIso('2026-11-23T16:50:00.000Z', '00:10', now)).toBe('2026-11-23T17:10:00.000Z')
  })
  it('patokan 00.15 (D+1), pilih 23.50 → D 23.50 (D+1 23.50 masih masa depan)', () => {
    expect(nearestWibIso('2026-11-23T17:15:00.000Z', '23:50', now)).toBe('2026-11-23T16:50:00.000Z')
  })
  it('patokan 00.15 (D+1), pilih 00.20 → D+1 00.20', () => {
    expect(nearestWibIso('2026-11-23T17:15:00.000Z', '00:20', now)).toBe('2026-11-23T17:20:00.000Z')
  })
  it('siang biasa: pilih 19.30 → hari yang sama', () => {
    expect(nearestWibIso('2026-11-23T12:17:00.000Z', '19:30', Date.parse('2026-11-23T14:00:00.000Z'))).toBe('2026-11-23T12:30:00.000Z')
  })
  it('semua kandidat masa depan → tetep yang paling deket', () => {
    expect(nearestWibIso('2026-11-23T12:17:00.000Z', '19:30', Date.parse('2026-11-01T00:00:00.000Z'))).toBe('2026-11-23T12:30:00.000Z')
  })
  it('jam kosong / ngaco → null', () => {
    expect(nearestWibIso('2026-11-23T12:17:00.000Z', '', now)).toBeNull()
    expect(nearestWibIso('2026-11-23T12:17:00.000Z', '7', now)).toBeNull()
  })
})
