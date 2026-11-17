import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { setPersonalApi, usePersonalStore } from '@/stores/personal.js'
import PersonalDocForm from './PersonalDocForm.vue'

vi.mock('@ionic/vue', async (importOriginal) => ({ ...(await importOriginal()) }))

const rem = (n, unit) => ({ n, unit, time: '09:00' })
const view = (over) => ({ id: 7, type: 'simc', label: null, values: ['970787654321'], dates: [{ key: 'expiry', on: '2027-07-24', reminders: [rem(1, 'month')], state: 'ok', daysLeft: 250, lateDays: 0 }], ...over })

let api, store
function mountForm(props = {}) {
  api = { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() }
  setPersonalApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  store = usePersonalStore()
  store.documents = [view()]
  return mount(PersonalDocForm, { props: { docId: null, ...props }, global: { plugins: [pinia] }, attachTo: document.body })
}

describe('PersonalDocForm (new)', () => {
  it('starts with the 11-type grid and its captions', () => {
    const w = mountForm()
    const tiles = w.findAll('[data-test^="type-"]').filter((t) => t.attributes('data-test') !== 'type-grid')
    expect(tiles).toHaveLength(11)
    expect(w.find('[data-test="type-ktp"]').text()).toContain('cuma nomor')
    expect(w.find('[data-test="type-paspor"]').text()).toContain('ada masa berlaku')
    expect(w.find('[data-test="type-stnk"]').text()).toContain('2 tanggal')
    expect(w.find('[data-test="type-lain"]').text()).toContain('bebas')
  })

  it('fills the default reminders for the picked type', async () => {
    const w = mountForm()
    await w.find('[data-test="type-paspor"]').trigger('click')
    expect(w.findAll('[data-test="rem-chip"]').map((c) => c.text())).toEqual(['8 bulan sebelum · 09.00', '6 bulan sebelum · 09.00'])
    expect(w.find('[data-test="type-grid"]').exists()).toBe(false)
  })

  it('goes back to the grid with Ganti jenis', async () => {
    const w = mountForm()
    await w.find('[data-test="type-ktp"]').trigger('click')
    await w.find('[data-test="change-type"]').trigger('click')
    expect(w.find('[data-test="type-grid"]').exists()).toBe(true)
  })

  it('needs a name for Lainnya and the first number for the rest', async () => {
    const w = mountForm()
    await w.find('[data-test="type-lain"]').trigger('click')
    await w.find('form').trigger('submit')
    expect(w.find('[data-test="form-error"]').text()).toContain('Isi nama dokumennya dulu.')
    expect(w.find('[data-test="form-error"]').text()).toContain('Isi Nomor-nya dulu.')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('needs the date of a required date, and shows the STNK hint', async () => {
    const w = mountForm()
    await w.find('[data-test="type-stnk"]').trigger('click')
    expect(w.text()).toContain('lembar pengesahan pajak tahunan STNK')
    await w.find('[data-test="val-0"]').setValue('B 1234 XYZ')
    await w.find('form').trigger('submit')
    expect(w.find('[data-test="form-error"]').text()).toContain('Isi tanggal "Pajak tahunan" dulu.')
  })

  it('saves and says it was added', async () => {
    const w = mountForm()
    await w.find('[data-test="type-simc"]').trigger('click')
    await w.find('[data-test="val-0"]').setValue(' 970787654321 ')
    await w.find('[data-test="date-0"]').setValue('2027-07-24')
    api.post.mockResolvedValue({ document: view({ id: 8 }) })
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(api.post).toHaveBeenCalledWith('/personal/documents', {
      type: 'simc', values: ['970787654321'], dates: [{ key: 'expiry', on: '2027-07-24', reminders: [rem(1, 'month'), rem(1, 'week')] }],
    })
    expect(w.emitted('done')[0]).toEqual(['SIM C ditambahin ✓', { docId: 8 }])
  })

  it('names a custom document by its own name', async () => {
    const w = mountForm()
    await w.find('[data-test="type-lain"]').trigger('click')
    await w.find('[data-test="label"]').setValue('Kartu gym')
    await w.find('[data-test="val-0"]').setValue('123')
    api.post.mockResolvedValue({ document: view({ id: 9, type: 'lain', label: 'Kartu gym', dates: [] }) })
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(api.post.mock.calls[0][1]).toEqual({ type: 'lain', label: 'Kartu gym', values: ['123'], dates: [] })
    expect(w.emitted('done')[0][0]).toBe('Kartu gym ditambahin ✓')
  })

  it('shows what the server says per field and stays editable', async () => {
    const w = mountForm()
    await w.find('[data-test="type-ktp"]').trigger('click')
    await w.find('[data-test="val-0"]').setValue('1')
    api.post.mockRejectedValue(Object.assign(new Error('Data tidak valid.'), { status: 422, fields: { 'values.0': ['NIK-nya kurang.'] } }))
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.find('[data-test="form-error"]').text()).toBe('NIK-nya kurang.')
    expect(w.emitted('done')).toBeUndefined()
  })

  it('ignores a second tap while saving', async () => {
    const w = mountForm()
    await w.find('[data-test="type-ktp"]').trigger('click')
    await w.find('[data-test="val-0"]').setValue('1')
    api.post.mockReturnValue(new Promise(() => {}))
    await w.find('form').trigger('submit')
    await w.find('form').trigger('submit')
    expect(api.post).toHaveBeenCalledTimes(1)
    expect(w.vm.busy).toBe(true)
  })

  it('moves to the next field with Enter', async () => {
    const w = mountForm()
    await w.find('[data-test="type-stnk"]').trigger('click')
    await w.find('[data-test="label"]').trigger('keydown.enter')
    expect(document.activeElement).toBe(w.find('[data-test="val-0"]').element)
  })
})

describe('PersonalDocForm (edit)', () => {
  it('cannot change the type and keeps the data', () => {
    const w = mountForm({ docId: 7 })
    expect(w.find('[data-test="type-grid"]').exists()).toBe(false)
    expect(w.find('[data-test="change-type"]').exists()).toBe(false)
    expect(w.find('[data-test="val-0"]').element.value).toBe('970787654321')
    expect(w.find('[data-test="date-0"]').element.value).toBe('2027-07-24')
    expect(w.text()).toContain('Ubah SIM C')
  })

  it('saves with PUT and says Kesimpen', async () => {
    const w = mountForm({ docId: 7 })
    await w.find('[data-test="val-0"]').setValue('111')
    api.put.mockResolvedValue({ document: view({ values: ['111'] }) })
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(api.put.mock.calls[0][0]).toBe('/personal/documents/7')
    expect(api.put.mock.calls[0][1].type).toBe('simc')
    expect(w.emitted('done')[0]).toEqual(['Kesimpen ✓', { docId: 7 }])
  })

  it('says so when the document is gone', () => {
    const w = mountForm({ docId: 404 })
    expect(w.text()).toContain('Dokumennya nggak ketemu')
  })
})
