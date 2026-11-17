import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { setPersonalApi, usePersonalStore } from '@/stores/personal.js'
import PersonalAddressForm from './PersonalAddressForm.vue'

const sheetCreate = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({ ...(await importOriginal()), actionSheetController: { create: sheetCreate } }))

const ADDR = { id: 4, name: 'Rumah Bekasi', ktp: true, domicile: false, street: 'Jl. Melati', rtRw: '003 / 007', village: 'Jatiwaringin', district: 'Pondok Gede', city: 'Kota Bekasi', province: 'Jawa Barat', postalCode: '17411' }

let api, store
function mountForm(props = {}) {
  api = { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn(async () => null) }
  setPersonalApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  store = usePersonalStore()
  store.addresses = [{ ...ADDR }]
  return mount(PersonalAddressForm, { props: { addressId: null, ...props }, global: { plugins: [pinia] }, attachTo: document.body })
}

beforeEach(() => {
  sheetCreate.mockReset().mockResolvedValue({ present: vi.fn(), onDidDismiss: vi.fn(async () => ({ data: 'delete' })) })
})

describe('PersonalAddressForm', () => {
  it('needs a name', async () => {
    const w = mountForm()
    await w.find('form').trigger('submit')
    expect(w.find('[data-test="form-error"]').text()).toBe('Kasih nama alamatnya dulu.')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('ticks Sesuai KTP and Domisili independently and saves', async () => {
    const w = mountForm()
    await w.find('[data-test="f-name"]').setValue('Kantor')
    await w.find('[data-test="toggle-ktp"]').trigger('click')
    await w.find('[data-test="toggle-dom"]').trigger('click')
    await w.find('[data-test="toggle-ktp"]').trigger('click')
    expect(w.find('[data-test="toggle-ktp"]').classes()).not.toContain('on')
    expect(w.find('[data-test="toggle-dom"]').classes()).toContain('on')
    await w.find('[data-test="f-street"]').setValue(' Jl. Sudirman ')
    api.post.mockResolvedValue({ address: { ...ADDR, id: 5, name: 'Kantor' } })
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(api.post).toHaveBeenCalledWith('/personal/addresses', expect.objectContaining({ name: 'Kantor', ktp: false, domicile: true, street: 'Jl. Sudirman', rtRw: '' }))
    expect(w.emitted('done')[0]).toEqual(['Alamat kesimpen ✓'])
  })

  it('moves on with Enter: name → street → RT/RW → kode pos → kelurahan', async () => {
    const w = mountForm()
    const focus = () => document.activeElement
    await w.find('[data-test="f-name"]').trigger('keydown.enter')
    expect(focus()).toBe(w.find('[data-test="f-street"]').element)
    await w.find('[data-test="f-rtRw"]').trigger('keydown.enter')
    expect(focus()).toBe(w.find('[data-test="f-postalCode"]').element)
    await w.find('[data-test="f-postalCode"]').trigger('keydown.enter')
    expect(focus()).toBe(w.find('[data-test="f-village"]').element)
  })

  it('bounds the street at 200 characters', async () => {
    const w = mountForm()
    await w.find('[data-test="f-name"]').setValue('Rumah')
    await w.find('[data-test="f-street"]').setValue('x'.repeat(201))
    await w.find('form').trigger('submit')
    expect(w.find('[data-test="form-error"]').text()).toBe('Jalan & nomor maksimal 200 karakter.')
  })

  it('loads the address when editing, PUTs, and offers Hapus', async () => {
    const w = mountForm({ addressId: 4 })
    expect(w.find('[data-test="f-name"]').element.value).toBe('Rumah Bekasi')
    expect(w.find('[data-test="toggle-ktp"]').classes()).toContain('on')
    api.put.mockResolvedValue({ address: ADDR })
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(api.put.mock.calls[0][0]).toBe('/personal/addresses/4')
    expect(w.find('[data-test="delete"]').exists()).toBe(true)
  })

  it('confirms before deleting', async () => {
    const w = mountForm({ addressId: 4 })
    await w.find('[data-test="delete"]').trigger('click')
    await w.find('[data-test="delete"]').trigger('click')
    await flushPromises()
    expect(sheetCreate).toHaveBeenCalledTimes(1)
    expect(sheetCreate.mock.calls[0][0].header).toBe('Hapus alamat Rumah Bekasi?')
    expect(api.del).toHaveBeenCalledWith('/personal/addresses/4')
    expect(w.emitted('done')[0]).toEqual(['Alamat Rumah Bekasi dihapus'])
  })

  it('hides Hapus for a new address', () => {
    expect(mountForm().find('[data-test="delete"]').exists()).toBe(false)
  })
})
