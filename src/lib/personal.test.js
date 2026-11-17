import {
  ADDRESS_FIELDS, BIO_FIELDS, DOC_TYPES, DOC_TYPE_ORDER, REMINDER_HOURS, UNITS,
  addressLine, copyValue, displayNumber, docSub, docTitle, dueList, farText, reminderError, reminderText, sortDocs, stateText,
} from './personal.js'

const date = (over) => ({ key: 'expiry', on: '2027-07-24', reminders: [], state: 'ok', daysLeft: 250, lateDays: 0, ...over })
const doc = (id, type, dates = [], label = null) => ({ id, type, label, values: ['x'], dates })

describe('document types', () => {
  it('keeps the agreed order', () => {
    expect(DOC_TYPE_ORDER).toEqual(['ktp', 'kk', 'npwp', 'bpjsk', 'bpjstk', 'sima', 'simc', 'paspor', 'visa', 'stnk', 'lain'])
    expect(Object.keys(DOC_TYPES)).toEqual(DOC_TYPE_ORDER)
  })

  it('has the same fields, dates and default reminders as the server', () => {
    const view = (t) => ({ name: t.name, emoji: t.emoji, tint: t.tint, fields: t.fields, dates: t.dates.map((d) => ({ key: d.key, name: d.name, optional: Boolean(d.optional), reminders: d.reminders.map((r) => `${r.n} ${r.unit} ${r.time}`) })) })
    const one = (n, unit) => `${n} ${unit} 09:00`
    expect(view(DOC_TYPES.ktp)).toEqual({ name: 'KTP', emoji: '🪪', tint: '#DCEBFF', fields: ['NIK'], dates: [] })
    expect(DOC_TYPES.ktp.note).toBe('Berlaku seumur hidup')
    expect(view(DOC_TYPES.kk)).toMatchObject({ name: 'Kartu Keluarga', emoji: '👪', tint: '#FFE9D6', fields: ['Nomor KK'], dates: [] })
    expect(view(DOC_TYPES.npwp)).toMatchObject({ name: 'NPWP', emoji: '🧾', tint: '#E4F7C4', fields: ['Nomor NPWP'] })
    expect(view(DOC_TYPES.bpjsk)).toMatchObject({ name: 'BPJS Kesehatan', emoji: '🏥', tint: '#D8F3EE', fields: ['Nomor kartu'] })
    expect(view(DOC_TYPES.bpjstk)).toMatchObject({ name: 'BPJS Ketenagakerjaan', emoji: '👷', tint: '#FFF3B8', fields: ['Nomor KPJ'] })
    expect(view(DOC_TYPES.sima)).toEqual({ name: 'SIM A', emoji: '🚗', tint: '#F3E1FF', fields: ['Nomor SIM'], dates: [{ key: 'expiry', name: 'Berlaku s.d.', optional: false, reminders: [one(1, 'month'), one(1, 'week')] }] })
    expect(view(DOC_TYPES.simc)).toEqual({ name: 'SIM C', emoji: '🛵', tint: '#FFE0E6', fields: ['Nomor SIM'], dates: [{ key: 'expiry', name: 'Berlaku s.d.', optional: false, reminders: [one(1, 'month'), one(1, 'week')] }] })
    expect(view(DOC_TYPES.paspor)).toEqual({ name: 'Paspor', emoji: '🛂', tint: '#DCEBFF', fields: ['Nomor paspor'], dates: [{ key: 'expiry', name: 'Berlaku s.d.', optional: false, reminders: [one(8, 'month'), one(6, 'month')] }] })
    expect(view(DOC_TYPES.visa)).toEqual({ name: 'Visa', emoji: '✈️', tint: '#E9E4FF', fields: ['Nomor visa'], dates: [{ key: 'expiry', name: 'Berlaku s.d.', optional: false, reminders: [one(1, 'month'), one(2, 'week')] }] })
    expect(DOC_TYPES.visa.labelHint).toBe('Negara, mis. Jepang')
    expect(view(DOC_TYPES.stnk)).toEqual({
      name: 'STNK', emoji: '🏍️', tint: '#ECEBE6', fields: ['Plat nomor', 'Nomor rangka', 'Nomor mesin'],
      dates: [
        { key: 'tax', name: 'Pajak tahunan', optional: false, reminders: [one(1, 'month'), one(1, 'week')] },
        { key: 'stnk', name: 'STNK 5 tahun', optional: false, reminders: [one(2, 'month')] },
      ],
    })
    expect(DOC_TYPES.stnk.labelHint).toBe('mis. Motor / Mobil')
    expect(view(DOC_TYPES.lain)).toEqual({ name: 'Lainnya', emoji: '📎', tint: '#ECEBE6', fields: ['Nomor'], dates: [{ key: 'expiry', name: 'Berlaku s.d.', optional: true, reminders: [one(1, 'month')] }] })
    expect(DOC_TYPES.lain.custom).toBe(true)
  })

  it('lists bio, address fields, hours and units', () => {
    expect(BIO_FIELDS.map(([k]) => k)).toEqual(['name', 'birthPlace', 'birthDate', 'gender', 'bloodType', 'religion', 'maritalStatus', 'occupation', 'nationality', 'motherName', 'phone', 'email'])
    expect(BIO_FIELDS[9]).toEqual(['motherName', 'Nama ibu kandung'])
    expect(ADDRESS_FIELDS).toEqual([['street', 'Jalan & nomor'], ['rtRw', 'RT / RW'], ['village', 'Kelurahan / Desa'], ['district', 'Kecamatan'], ['city', 'Kota / Kabupaten'], ['province', 'Provinsi'], ['postalCode', 'Kode pos']])
    expect(REMINDER_HOURS).toEqual(['09:00', '12:00', '15:00', '18:00', '21:00'])
    expect(UNITS).toEqual([['day', 'hari'], ['week', 'minggu'], ['month', 'bulan']])
  })
})

describe('copyValue & displayNumber', () => {
  it('strips spaces, dashes and dots from numbers only', () => {
    expect(copyValue('3275 0124 0797 0001')).toBe('3275012407970001')
    expect(copyValue('12.345.678.9-012.000')).toBe('123456789012000')
    expect(copyValue('B 1234 XYZ')).toBe('B 1234 XYZ')
    expect(copyValue('Jl. Melati No. 5')).toBe('Jl. Melati No. 5')
    expect(copyValue('003 / 007')).toBe('003 / 007')
  })

  it('groups long digit strings by four', () => {
    expect(displayNumber('3275012407970001')).toBe('3275 0124 0797 0001')
    expect(displayNumber('C1234567')).toBe('C1234567')
    expect(displayNumber('0001234567890')).toBe('0001 2345 6789 0')
  })
})

describe('texts', () => {
  it('describes a date state', () => {
    expect(stateText(date({ state: 'late', lateDays: 3, daysLeft: -3 }))).toBe('Udah lewat 3 hari')
    expect(stateText(date({ state: 'soon', daysLeft: 0 }))).toBe('Habis hari ini')
    expect(stateText(date({ state: 'soon', daysLeft: 17 }))).toBe('Habis 17 hari lagi')
    expect(stateText(date({ state: 'soon', daysLeft: 45 }))).toBe('Habis 45 hari lagi')
    expect(stateText(date({ state: 'soon', daysLeft: 210 }))).toBe('Habis 7 bulan lagi')
    expect(stateText(date({ state: 'ok' }))).toBe('s.d. 24 Jul 2027')
  })

  it('says how far away a date is', () => {
    expect(farText(730)).toBe('2 tahun lagi')
    expect(farText(210)).toBe('7 bulan lagi')
  })

  it('writes reminders', () => {
    expect(reminderText({ n: 8, unit: 'month', time: '09:00' })).toBe('8 bulan sebelum · 09.00')
    expect(reminderText({ n: 2, unit: 'week', time: '18:00' })).toBe('2 minggu sebelum · 18.00')
    expect(reminderText({ n: 0, unit: 'day', time: '09:00' })).toBe('Hari H · 09.00')
  })

  it('builds titles and subtitles', () => {
    expect(docTitle(doc(1, 'stnk', [], 'Motor'))).toBe('STNK')
    expect(docSub(doc(1, 'stnk', [], 'Motor'))).toBe('Motor')
    expect(docTitle(doc(2, 'lain', [], 'Asuransi'))).toBe('Asuransi')
    expect(docSub(doc(2, 'lain', [], 'Asuransi'))).toBe('')
    expect(docTitle(doc(3, 'lain', []))).toBe('Lainnya')
  })

  it('joins an address, skipping empty parts', () => {
    const a = { street: 'Jl. Melati Raya No. 5', rtRw: '003 / 007', village: 'Jatiwaringin', district: 'Pondok Gede', city: 'Kota Bekasi', province: 'Jawa Barat', postalCode: '17411' }
    expect(addressLine(a)).toBe('Jl. Melati Raya No. 5, RT 003/RW 007, Kel. Jatiwaringin, Kec. Pondok Gede, Kota Bekasi, Jawa Barat 17411')
    expect(addressLine({ ...a, rtRw: '', village: '', postalCode: '' })).toBe('Jl. Melati Raya No. 5, Kec. Pondok Gede, Kota Bekasi, Jawa Barat')
  })
})

describe('sortDocs & dueList', () => {
  const ktp = doc(1, 'ktp')
  const simc = doc(2, 'simc', [date({ state: 'soon', daysLeft: 17 })])
  const paspor = doc(3, 'paspor', [date({ state: 'ok' })])
  const stnk = doc(4, 'stnk', [date({ key: 'tax', state: 'late', lateDays: 3, daysLeft: -3 }), date({ key: 'stnk', state: 'ok' })], 'Motor')

  it('puts late first, then soon, then type order', () => {
    expect(sortDocs([ktp, paspor, simc, stnk]).map((d) => d.id)).toEqual([4, 2, 1, 3])
  })

  it('lists due dates, most late first, with titles', () => {
    const list = dueList([ktp, paspor, simc, stnk])
    expect(list.map((x) => x.title)).toEqual(['Pajak STNK · Motor', 'SIM C'])
    expect(list[0].doc.id).toBe(4)
    expect(list[0].date.key).toBe('tax')
  })
})

describe('reminderError', () => {
  const list = [{ n: 1, unit: 'month', time: '09:00' }]
  it('allows a fresh one', () => expect(reminderError(list, { n: 1, unit: 'week', time: '09:00' })).toBeNull())
  it('rejects empty numbers', () => expect(reminderError(list, { n: '', unit: 'week', time: '09:00' })).toBe('Isi angkanya dulu.'))
  it('rejects too big numbers', () => {
    expect(reminderError([], { n: 25, unit: 'month', time: '09:00' })).toBe('Maksimal 24 bulan.')
    expect(reminderError([], { n: 105, unit: 'week', time: '09:00' })).toBe('Maksimal 104 minggu.')
    expect(reminderError([], { n: 731, unit: 'day', time: '09:00' })).toBe('Maksimal 730 hari.')
  })
  it('allows day zero but not week zero', () => {
    expect(reminderError([], { n: 0, unit: 'day', time: '09:00' })).toBeNull()
    expect(reminderError([], { n: 0, unit: 'week', time: '09:00' })).toBe('Minimal 1 minggu.')
  })
  it('answers with a message instead of throwing on an unknown unit or hour', () => {
    expect(reminderError([], { n: 1, unit: 'year', time: '09:00' })).toBe('Satuannya nggak dikenal.')
    expect(reminderError([], { n: 1, unit: 'week', time: '10:00' })).toBe('Jamnya nggak dikenal.')
    expect(reminderError([], { n: 1, unit: undefined, time: '09:00' })).toBe('Satuannya nggak dikenal.')
  })
  it('rejects duplicates', () => expect(reminderError(list, { n: '1', unit: 'month', time: '09:00' })).toBe('Pengingat itu udah ada.'))
  it('rejects a fourth', () => {
    const three = [{ n: 1, unit: 'day', time: '09:00' }, { n: 2, unit: 'day', time: '09:00' }, { n: 3, unit: 'day', time: '09:00' }]
    expect(reminderError(three, { n: 4, unit: 'day', time: '09:00' })).toBe('Maksimal 3 pengingat.')
  })
})
