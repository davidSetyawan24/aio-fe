import { mount } from '@vue/test-utils'
import BadanProfile from './BadanProfile.vue'

const ionRouter = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('@ionic/vue', async (importOriginal) => ({ ...(await importOriginal()), useIonRouter: () => ionRouter }))

const make = (profile) => mount(BadanProfile, { props: { profile } })

beforeEach(() => ionRouter.push.mockReset())

describe('BadanProfile', () => {
  it('lengkap: cuma barisnya, tanpa link', () => {
    const w = make({ height: 166, age: 31, gender: 'male' })
    expect(w.find('[data-test="profile-text"]').text()).toBe('Tinggi 166 cm · 31 tahun · Laki-laki')
    expect(w.find('[data-test="profile-link"]').exists()).toBe(false)
  })

  it('sebagian: yang ada ditulis + link Lengkapin ke tab Biodata Data Pribadi', async () => {
    const w = make({ height: null, age: 31, gender: 'male' })
    expect(w.find('[data-test="profile-text"]').text()).toBe('31 tahun · Laki-laki')
    const link = w.find('[data-test="profile-link"]')
    expect(link.text()).toBe('Lengkapin di Data Pribadi ›')
    await link.trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/data-pribadi?tab=bio')
  })

  it('kosong semua: teks "belum diisi" + link', () => {
    const w = make({ height: null, age: null, gender: null })
    expect(w.find('[data-test="profile-text"]').text()).toBe('Tinggi, umur & jenis kelamin belum diisi')
    expect(w.find('[data-test="profile-link"]').exists()).toBe(true)
    expect(w.text()).toBe('Tinggi, umur & jenis kelamin belum diisi · Lengkapin di Data Pribadi ›')
  })
})
