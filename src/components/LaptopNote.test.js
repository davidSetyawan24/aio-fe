import { mount } from '@vue/test-utils'
import LaptopNote from './LaptopNote.vue'

const KEY = 'aio-invoice-laptop-note'
const media = (matches) => (window.matchMedia = vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() })))

beforeEach(() => {
  localStorage.clear()
  media(false)
})
afterEach(() => vi.restoreAllMocks())

describe('LaptopNote', () => {
  it('tampil di layar kecil', () => {
    const w = mount(LaptopNote)
    expect(w.text()).toContain('Lebih enak di laptop')
  })

  it('ditutup: hilang dan diingat', async () => {
    const w = mount(LaptopNote)
    await w.find('[data-test="close"]').trigger('click')
    expect(w.text()).not.toContain('Lebih enak di laptop')
    expect(localStorage.getItem(KEY)).toBe('closed')
    expect(mount(LaptopNote).text()).not.toContain('Lebih enak di laptop')
  })

  it('localStorage error: tetep tampil, nggak crash', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('x') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('x') })
    const w = mount(LaptopNote)
    expect(w.text()).toContain('Lebih enak di laptop')
    await w.find('[data-test="close"]').trigger('click')
    expect(w.text()).not.toContain('Lebih enak di laptop')
  })

  it('nggak dirender di layar lebar', () => {
    media(true)
    expect(mount(LaptopNote).text()).not.toContain('Lebih enak di laptop')
  })
})
