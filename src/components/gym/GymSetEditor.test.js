import { mount } from '@vue/test-utils'
import GymSetEditor from './GymSetEditor.vue'

const mounted = []
function mountEditor(props = {}) {
  const w = mount(GymSetEditor, { props: { n: 2, weight: 22.5, reps: 8, prev: [22.5, 8], done: false, step: 2.5, ...props }, attachTo: document.body })
  mounted.push(w)
  return w
}
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

const btn = (w, t) => w.find(`[data-test="${t}"]`)
const off = (w, t) => btn(w, t).attributes('disabled') !== undefined
const last = (w, ev) => w.emitted(ev)?.at(-1)?.[0]

describe('GymSetEditor', () => {
  it('judul, patokan sesi lalu, label Centang set N', () => {
    const w = mountEditor()
    expect(w.text()).toContain('Set 2')
    expect(w.text()).toContain('sesi lalu 22,5 × 8')
    expect(btn(w, 'check').text()).toContain('Centang set 2')
    expect(off(w, 'check')).toBe(false)
    expect(w.find('[data-test="weight"]').element.value).toBe('22,5')
    expect(w.find('[data-test="reps"]').element.value).toBe('8')
  })

  it('tanpa patokan → "belum ada patokan", kolom kosong, − & ✓ mati', () => {
    const w = mountEditor({ weight: null, reps: null, prev: null })
    expect(w.text()).toContain('belum ada patokan')
    expect(w.find('[data-test="weight"]').element.value).toBe('')
    expect(off(w, 'weight-minus')).toBe(true)
    expect(off(w, 'reps-minus')).toBe(true)
    expect(off(w, 'weight-plus')).toBe(false)
    expect(off(w, 'check')).toBe(true)
  })

  it('− mati di 0, ✓ mati kalau salah satu kosong', async () => {
    const w = mountEditor({ weight: 0, reps: 8 })
    expect(off(w, 'weight-minus')).toBe(true)
    expect(off(w, 'reps-minus')).toBe(false)
    expect(off(w, 'check')).toBe(true)
    await w.find('[data-test="reps"]').setValue('')
    expect(off(w, 'reps-minus')).toBe(true)
  })

  it('− / + ikut langkah beban & 1 rep, nggak ada 22.499999', async () => {
    const w = mountEditor({ weight: 22.5, reps: 8, step: 2.5 })
    await btn(w, 'weight-plus').trigger('click')
    expect(last(w, 'change')).toEqual({ weight: 25, reps: 8 })
    expect(w.find('[data-test="weight"]').element.value).toBe('25')
    await btn(w, 'reps-minus').trigger('click')
    expect(last(w, 'change')).toEqual({ weight: 25, reps: 7 })
    const s = mountEditor({ weight: 2.2, reps: 8, step: 0.1 })
    await btn(s, 'weight-plus').trigger('click')
    expect(last(s, 'change')).toEqual({ weight: 2.3, reps: 8 })
    expect(s.find('[data-test="weight"]').element.value).toBe('2,3')
  })

  it('ketik koma 22,5 → emit angka; ketik ngaco → null & ✓ mati', async () => {
    const w = mountEditor({ weight: null, reps: null, prev: null })
    await w.find('[data-test="weight"]').setValue('22,5')
    expect(last(w, 'change')).toEqual({ weight: 22.5, reps: null })
    await w.find('[data-test="reps"]').setValue('10')
    expect(last(w, 'change')).toEqual({ weight: 22.5, reps: 10 })
    expect(off(w, 'check')).toBe(false)
    await w.find('[data-test="weight"]').setValue('abc')
    expect(last(w, 'change')).toEqual({ weight: null, reps: 10 })
    expect(off(w, 'check')).toBe(true)
  })

  it('tempel / ketik titik "22.5" → ditampilin "22,5", angka tetep 22.5', async () => {
    const w = mountEditor({ weight: null, reps: null, prev: null })
    await w.find('[data-test="weight"]').setValue('22.5')
    expect(w.find('[data-test="weight"]').element.value).toBe('22,5')
    expect(last(w, 'change')).toEqual({ weight: 22.5, reps: null })
  })

  it('beban kegedean / reps > 100 → ✓ mati, + mati di batas', async () => {
    const w = mountEditor({ weight: 999, reps: 100 })
    expect(off(w, 'weight-plus')).toBe(true)
    expect(off(w, 'reps-plus')).toBe(true)
    expect(off(w, 'check')).toBe(false)
    await w.find('[data-test="weight"]').setValue('1000')
    expect(off(w, 'check')).toBe(true)
  })

  it('kolom angka: keyboard angka, kepilih semua pas difokus', async () => {
    const w = mountEditor()
    const kg = w.find('[data-test="weight"]')
    expect(kg.attributes('inputmode')).toBe('decimal')
    expect(w.find('[data-test="reps"]').attributes('inputmode')).toBe('numeric')
    expect(kg.attributes('pattern')).toBeUndefined()
    kg.element.focus()
    await kg.trigger('focus')
    expect(kg.element.selectionStart).toBe(0)
    expect(kg.element.selectionEnd).toBe(4)
  })

  it('udah mulai ngetik sebelum pilihan diulang → ketikan nggak kepilih lagi', async () => {
    vi.useFakeTimers()
    try {
      const w = mountEditor()
      const kg = w.find('[data-test="weight"]')
      kg.element.focus()
      await kg.trigger('focus')
      kg.element.value = '2'
      kg.element.setSelectionRange(1, 1)
      await kg.trigger('input')
      vi.runAllTimers()
      expect(kg.element.selectionStart).toBe(1)
      expect(kg.element.selectionEnd).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('✓ → emit check dengan angka', async () => {
    const w = mountEditor()
    await btn(w, 'check').trigger('click')
    expect(last(w, 'check')).toEqual({ weight: 22.5, reps: 8 })
  })

  it('angka dari luar berubah (mis. digabung server) → kolom ikut', async () => {
    const w = mountEditor()
    await w.setProps({ weight: 30, reps: 6 })
    expect(w.find('[data-test="weight"]').element.value).toBe('30')
    expect(w.find('[data-test="reps"]').element.value).toBe('6')
  })

  it('set udah ✓ → "lagi dibenerin", Hapus set + Simpen (tanpa Centang)', async () => {
    const w = mountEditor({ n: 1, done: true })
    expect(w.text()).toContain('Set 1 · lagi dibenerin')
    expect(btn(w, 'check').exists()).toBe(false)
    expect(btn(w, 'remove').text()).toContain('Hapus set')
    expect(btn(w, 'save').text()).toContain('Simpen')
    await btn(w, 'weight-minus').trigger('click')
    await btn(w, 'save').trigger('click')
    expect(last(w, 'save')).toEqual({ weight: 20, reps: 8 })
    await btn(w, 'remove').trigger('click')
    expect(w.emitted('remove')).toHaveLength(1)
  })

  it('Simpen mati kalau angkanya nggak bener', async () => {
    const w = mountEditor({ done: true })
    await w.find('[data-test="reps"]').setValue('0')
    expect(off(w, 'save')).toBe(true)
  })

  it('lagi Selesai (disabled) → semua tombol mati', () => {
    const w = mountEditor({ disabled: true })
    for (const t of ['weight-minus', 'weight-plus', 'reps-minus', 'reps-plus', 'check']) expect(off(w, t), t).toBe(true)
    const d = mountEditor({ disabled: true, done: true })
    expect(off(d, 'save')).toBe(true)
    expect(off(d, 'remove')).toBe(true)
  })
})
