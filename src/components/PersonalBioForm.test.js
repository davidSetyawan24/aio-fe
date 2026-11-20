import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { setPersonalApi, usePersonalStore } from '@/stores/personal.js'
import PersonalBioForm from './PersonalBioForm.vue'

let api, store
function mountForm(bio) {
  api = { get: vi.fn(), post: vi.fn(), put: vi.fn(async (u, b) => ({ bio: b })), del: vi.fn() }
  setPersonalApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  store = usePersonalStore()
  store.bio = bio ?? { fields: { name: 'David Setyawan' }, extra: [{ label: 'Tinggi badan', value: '172 cm' }] }
  return mount(PersonalBioForm, { global: { plugins: [pinia] }, attachTo: document.body })
}

describe('PersonalBioForm', () => {
  it('shows all 13 fields, filled from the store', () => {
    const w = mountForm()
    expect(w.findAll('[data-test^="bio-"]')).toHaveLength(12)
    expect(w.findAll('[data-test^="gender-"]')).toHaveLength(2)
    expect(w.find('[data-test="bio-birthDate"]').attributes('type')).toBe('date')
    expect(w.find('[data-test="bio-height"]').attributes('inputmode')).toBe('numeric')
    expect(w.text()).toContain('Tinggi')
    expect(w.text()).toContain('cm')
    expect(w.find('[data-test="bio-name"]').element.value).toBe('David Setyawan')
    expect(w.find('[data-test="bio-email"]').element.value).toBe('')
    expect(w.text()).toContain('Yang dikosongin nggak ditampilin.')
  })

  it('allows empty fields and saves, dropping half-filled extras', async () => {
    const w = mountForm()
    await w.find('[data-test="bio-name"]').setValue('')
    await w.find('[data-test="extra-add"]').trigger('click')
    await w.find('[data-test="extra-label-1"]').setValue('Hobi')
    await w.find('form').trigger('submit')
    await flushPromises()
    const body = api.put.mock.calls[0][1]
    expect(api.put.mock.calls[0][0]).toBe('/personal/bio')
    expect(body.fields.name).toBe('')
    expect(body.extra).toEqual([{ label: 'Tinggi badan', value: '172 cm' }])
    expect(w.emitted('done')[0]).toEqual(['Biodata kesimpen ✓'])
  })

  it('adds and removes extras and stops at 20', async () => {
    const w = mountForm({ fields: {}, extra: [] })
    for (let i = 0; i < 20; i += 1) await w.find('[data-test="extra-add"]').trigger('click')
    expect(w.findAll('[data-test^="extra-label-"]')).toHaveLength(20)
    expect(w.find('[data-test="extra-add"]').exists()).toBe(false)
    expect(w.text()).toContain('Maksimal 20 data lain.')
    await w.find('[data-test="extra-remove-3"]').trigger('click')
    expect(w.findAll('[data-test^="extra-label-"]')).toHaveLength(19)
    expect(w.find('[data-test="extra-add"]').exists()).toBe(true)
  })

  it('bounds field length', async () => {
    const w = mountForm()
    await w.find('[data-test="bio-name"]').setValue('x'.repeat(101))
    await w.find('form').trigger('submit')
    expect(w.find('[data-test="form-error"]').text()).toBe('Nama lengkap maksimal 100 karakter.')
    expect(api.put).not.toHaveBeenCalled()
  })

  it('moves on with Enter', async () => {
    const w = mountForm()
    await w.find('[data-test="bio-name"]').trigger('keydown.enter')
    expect(document.activeElement).toBe(w.find('[data-test="bio-birthPlace"]').element)
    // Tanggal lahir & jenis kelamin dipilih pakai tap, Enter langsung lompat ke Tinggi.
    await w.find('[data-test="bio-birthPlace"]').trigger('keydown.enter')
    expect(document.activeElement).toBe(w.find('[data-test="bio-height"]').element)
    await w.find('[data-test="bio-height"]').trigger('keydown.enter')
    expect(document.activeElement).toBe(w.find('[data-test="bio-bloodType"]').element)
  })

  it('shows a server error and stays', async () => {
    const w = mountForm()
    api.put.mockRejectedValue(Object.assign(new Error('x'), { status: 500 }))
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.find('[data-test="form-error"]').exists()).toBe(true)
    expect(w.emitted('done')).toBeUndefined()
  })

  it('reads an old free-text birth date and gender into the picker', () => {
    const w = mountForm({ fields: { birthDate: '24 Juni 1995', gender: 'Pria' }, extra: [] })
    expect(w.find('[data-test="bio-birthDate"]').element.value).toBe('1995-06-24')
    expect(w.find('[data-test="birth-text"]').text()).toBe('24 Juni 1995')
    expect(w.find('[data-test="birth-hint"]').exists()).toBe(false)
    expect(w.find('[data-test="gender-male"]').attributes('aria-pressed')).toBe('true')
    expect(w.find('[data-test="gender-female"]').attributes('aria-pressed')).toBe('false')
  })

  it('leaves an unreadable old birth date empty with a hint, until a date is picked', async () => {
    const w = mountForm({ fields: { birthDate: 'pas lebaran', gender: 'cowok' }, extra: [] })
    expect(w.find('[data-test="bio-birthDate"]').element.value).toBe('')
    expect(w.find('[data-test="birth-text"]').text()).toBe('Pilih tanggal')
    expect(w.find('[data-test="birth-hint"]').text()).toBe('Tanggal lahir lama ("pas lebaran") nggak kebaca, pilih ulang ya.')
    expect(w.find('[data-test="gender-male"]').attributes('aria-pressed')).toBe('false')
    expect(w.find('[data-test="gender-female"]').attributes('aria-pressed')).toBe('false')
    await w.find('[data-test="bio-birthDate"]').setValue('1995-06-24')
    expect(w.find('[data-test="birth-hint"]').exists()).toBe(false)
    expect(w.find('[data-test="birth-text"]').text()).toBe('24 Juni 1995')
  })

  it('picks a gender, tapping it again clears it', async () => {
    const w = mountForm({ fields: {}, extra: [] })
    await w.find('[data-test="gender-female"]').trigger('click')
    expect(w.find('[data-test="gender-female"]').attributes('aria-pressed')).toBe('true')
    await w.find('[data-test="gender-male"]').trigger('click')
    expect(w.find('[data-test="gender-male"]').attributes('aria-pressed')).toBe('true')
    expect(w.find('[data-test="gender-female"]').attributes('aria-pressed')).toBe('false')
    await w.find('[data-test="gender-male"]').trigger('click')
    expect(w.find('[data-test="gender-male"]').attributes('aria-pressed')).toBe('false')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(api.put.mock.calls[0][1].fields.gender).toBe('')
  })

  it('clears the birth date with the x button', async () => {
    const w = mountForm({ fields: { birthDate: '1995-06-24' }, extra: [] })
    await w.find('[data-test="birth-clear"]').trigger('click')
    expect(w.find('[data-test="bio-birthDate"]').element.value).toBe('')
    expect(w.find('[data-test="birth-clear"]').exists()).toBe(false)
  })

  it('rejects a height out of range and does not send', async () => {
    const w = mountForm({ fields: {}, extra: [] })
    await w.find('[data-test="bio-height"]').setValue('99')
    await w.find('form').trigger('submit')
    expect(w.find('[data-test="form-error"]').text()).toBe('Tinggi harus angka bulat 100–250 cm.')
    expect(api.put).not.toHaveBeenCalled()
  })

  it('sends height, birth date and gender in the agreed shape', async () => {
    const w = mountForm({ fields: { name: 'David' }, extra: [] })
    await w.find('[data-test="bio-height"]').setValue(' 166 ')
    await w.find('[data-test="bio-birthDate"]').setValue('1995-06-24')
    await w.find('[data-test="gender-male"]').trigger('click')
    await w.find('form').trigger('submit')
    await flushPromises()
    const body = api.put.mock.calls[0][1]
    expect(body.fields).toMatchObject({ name: 'David', height: '166', birthDate: '1995-06-24', gender: 'Laki-laki' })
    expect(Object.keys(body.fields)).toHaveLength(13)
  })

  it('shows a per-field server error (422)', async () => {
    const w = mountForm({ fields: {}, extra: [] })
    api.put.mockRejectedValue(Object.assign(new Error('Ada isian yang salah.'), { status: 422, fields: { 'fields.height': ['Tinggi harus angka bulat 100–250 cm.'] } }))
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.find('[data-test="form-error"]').text()).toBe('Tinggi harus angka bulat 100–250 cm.')
  })
})
