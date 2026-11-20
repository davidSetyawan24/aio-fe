import { addressErrors, bioErrors, blankAddress, blankDoc, blankBio, docErrors, docPayload, docToForm } from './personalForm.js'

describe('blankDoc', () => {
  it('fills default reminders for the type and keeps dates empty', () => {
    const f = blankDoc('paspor')
    expect(f.values).toEqual([''])
    expect(f.dates).toEqual([{ key: 'expiry', on: '', reminders: [{ n: 8, unit: 'month', time: '09:00' }, { n: 6, unit: 'month', time: '09:00' }] }])
  })
  it('has no dates for a number-only type and one slot per field', () => {
    expect(blankDoc('ktp').dates).toEqual([])
    expect(blankDoc('stnk').values).toEqual(['', '', ''])
    expect(blankDoc('stnk').dates.map((d) => d.key)).toEqual(['tax', 'stnk'])
  })
  it('does not share reminder objects with the type table', () => {
    const f = blankDoc('sima')
    f.dates[0].reminders[0].n = 99
    expect(blankDoc('sima').dates[0].reminders[0].n).toBe(1)
  })
})

describe('docErrors', () => {
  const ok = () => ({ ...blankDoc('simc'), values: ['970787654321'], dates: [{ key: 'expiry', on: '2027-07-24', reminders: [] }] })
  it('accepts a complete form', () => expect(docErrors('simc', ok())).toEqual([]))
  it('asks for the first number', () => expect(docErrors('simc', { ...ok(), values: [' '] })).toEqual(['Isi Nomor SIM-nya dulu.']))
  it('asks for the custom name and for required dates', () => {
    expect(docErrors('lain', { ...blankDoc('lain'), values: ['1'] })).toEqual(['Isi nama dokumennya dulu.'])
    const f = { ...ok(), dates: [{ key: 'expiry', on: '', reminders: [] }] }
    expect(docErrors('simc', f)).toEqual(['Isi tanggal "Berlaku s.d." dulu.'])
  })
  it('lets Lainnya skip its optional date', () => {
    expect(docErrors('lain', { ...blankDoc('lain'), label: 'Gym', values: ['1'] })).toEqual([])
  })
  it('bounds lengths', () => {
    expect(docErrors('simc', { ...ok(), values: ['1'.repeat(101)] })).toEqual(['Nomor SIM maksimal 100 karakter.'])
    expect(docErrors('visa', { ...blankDoc('visa'), values: ['1'], label: 'x'.repeat(41), dates: [{ key: 'expiry', on: '2027-01-01', reminders: [] }] })).toEqual(['Label maksimal 40 karakter.'])
  })
})

describe('docPayload / docToForm', () => {
  it('trims, drops an empty optional date and an empty label', () => {
    const f = { ...blankDoc('lain'), label: ' Gym ', values: [' 123 '] }
    expect(docPayload('lain', f)).toEqual({ type: 'lain', label: 'Gym', values: ['123'], dates: [] })
    expect(docPayload('ktp', { ...blankDoc('ktp'), values: ['1'] })).toEqual({ type: 'ktp', values: ['1'], dates: [] })
  })
  it('round-trips a view into a form', () => {
    const view = { id: 3, type: 'sima', label: null, values: ['9'], dates: [{ key: 'expiry', on: '2027-01-01', reminders: [{ n: 1, unit: 'month', time: '09:00' }], state: 'ok', daysLeft: 9, lateDays: 0 }] }
    expect(docToForm(view)).toEqual({ label: '', values: ['9'], dates: [{ key: 'expiry', on: '2027-01-01', reminders: [{ n: 1, unit: 'month', time: '09:00' }] }] })
  })
})

describe('docToForm with a missing optional date', () => {
  it('still gives the form an empty slot (with default reminders) for it', () => {
    const view = { id: 4, type: 'lain', label: 'Gym', values: ['1'], dates: [] }
    expect(docToForm(view).dates).toEqual([{ key: 'expiry', on: '', reminders: [{ n: 1, unit: 'month', time: '09:00' }] }])
  })
})

describe('addressErrors', () => {
  it('needs a name and bounds the fields', () => {
    expect(addressErrors({ ...blankAddress(), name: ' ' })).toEqual(['Kasih nama alamatnya dulu.'])
    expect(addressErrors({ ...blankAddress(), name: 'x'.repeat(41) })).toEqual(['Nama alamat maksimal 40 karakter.'])
    expect(addressErrors({ ...blankAddress(), name: 'Rumah', street: 'x'.repeat(201) })).toEqual(['Jalan & nomor maksimal 200 karakter.'])
    expect(addressErrors({ ...blankAddress(), name: 'Rumah', city: 'x'.repeat(101) })).toEqual(['Kota / Kabupaten maksimal 100 karakter.'])
    expect(addressErrors({ ...blankAddress(), name: 'Rumah' })).toEqual([])
  })
})

describe('bioErrors', () => {
  it('allows empty fields but caps lengths and extras', () => {
    expect(bioErrors(blankBio())).toEqual([])
    expect(bioErrors({ ...blankBio(), fields: { ...blankBio().fields, name: 'x'.repeat(101) } })).toEqual(['Nama lengkap maksimal 100 karakter.'])
    expect(bioErrors({ ...blankBio(), extra: Array.from({ length: 21 }, () => ({ label: 'a', value: 'b' })) })).toEqual(['Maksimal 20 data lain.'])
    expect(bioErrors({ ...blankBio(), extra: [{ label: 'x'.repeat(41), value: 'b' }] })).toEqual(['Label data lain maksimal 40 karakter.'])
  })
})

describe('bioErrors: tanggal lahir, jenis kelamin, tinggi', () => {
  const TODAY = '2026-11-20'
  const withFields = (over) => ({ ...blankBio(), fields: { ...blankBio().fields, ...over } })
  it('kosong selalu boleh, isi yang bener lolos', () => {
    expect(bioErrors(withFields({}), TODAY)).toEqual([])
    expect(bioErrors(withFields({ birthDate: '1995-06-24', gender: 'Laki-laki', height: '166' }), TODAY)).toEqual([])
    expect(bioErrors(withFields({ birthDate: TODAY, gender: 'Perempuan', height: '100' }), TODAY)).toEqual([])
    expect(bioErrors(withFields({ height: '250' }), TODAY)).toEqual([])
  })
  it('nolak yang ngaco, pesannya sama kayak server', () => {
    expect(bioErrors(withFields({ birthDate: '2026-11-21' }), TODAY)).toEqual(['Tanggal lahirnya nggak valid.'])
    expect(bioErrors(withFields({ birthDate: '1995-02-30' }), TODAY)).toEqual(['Tanggal lahirnya nggak valid.'])
    expect(bioErrors(withFields({ birthDate: '24 Juni 1995' }), TODAY)).toEqual(['Tanggal lahirnya nggak valid.'])
    expect(bioErrors(withFields({ gender: 'Pria' }), TODAY)).toEqual(['Pilih Laki-laki atau Perempuan.'])
    for (const h of ['99', '251', '166.5', '166 cm', 'abc', '-170']) {
      expect(bioErrors(withFields({ height: h }), TODAY)).toEqual(['Tinggi harus angka bulat 100–250 cm.'])
    }
  })
})

