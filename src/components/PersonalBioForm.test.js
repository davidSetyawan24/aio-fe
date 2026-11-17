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
  it('shows all 12 fields, filled from the store', () => {
    const w = mountForm()
    expect(w.findAll('[data-test^="bio-"]')).toHaveLength(12)
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
  })

  it('shows a server error and stays', async () => {
    const w = mountForm()
    api.put.mockRejectedValue(Object.assign(new Error('x'), { status: 500 }))
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.find('[data-test="form-error"]').exists()).toBe(true)
    expect(w.emitted('done')).toBeUndefined()
  })
})
