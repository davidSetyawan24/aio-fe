import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import PinPad from './PinPad.vue'

const mounted = []
const make = (props = {}, active = ref(true)) => {
  const w = mount(PinPad, { props: { mode: 'unlock', ...props }, global: { provide: { pageActive: active } }, attachTo: document.body })
  mounted.push(w)
  return w
}
const press = async (w, digits) => {
  for (const d of digits) await w.find(`[data-k="${d}"]`).trigger('click')
}
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.useRealTimers()
})

describe('PinPad', () => {
  it('has no input element (the iOS keyboard must never open)', () => {
    const w = make()
    expect(w.find('input').exists()).toBe(false)
    expect(w.find('textarea').exists()).toBe(false)
  })

  it('shows the title per mode', () => {
    expect(make().text()).toContain('Data Pribadi kekunci')
    expect(make({ mode: 'create' }).text()).toContain('Bikin PIN dulu')
    expect(make({ mode: 'confirm' }).text()).toContain('Ulangi PIN-nya')
  })

  it('emits done once with six digits and ignores the seventh', async () => {
    vi.useFakeTimers()
    const w = make()
    await press(w, '123456')
    expect(w.emitted('done')).toEqual([['123456']])
    await press(w, '7')
    expect(w.emitted('done')).toHaveLength(1)
    vi.advanceTimersByTime(300)
    await w.vm.$nextTick()
    expect(w.findAll('.p-dots i.on')).toHaveLength(0)
    await press(w, '1')
    expect(w.findAll('.p-dots i.on')).toHaveLength(1)
  })

  it('deletes the last digit', async () => {
    const w = make()
    await press(w, '12')
    expect(w.findAll('.p-dots i.on')).toHaveLength(2)
    await w.find('[data-k="del"]').trigger('click')
    expect(w.findAll('.p-dots i.on')).toHaveLength(1)
  })

  it('takes laptop keyboard digits and backspace', async () => {
    const w = make()
    for (const key of '12') document.dispatchEvent(new KeyboardEvent('keydown', { key }))
    await w.vm.$nextTick()
    expect(w.findAll('.p-dots i.on')).toHaveLength(2)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }))
    await w.vm.$nextTick()
    expect(w.findAll('.p-dots i.on')).toHaveLength(1)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    await w.vm.$nextTick()
    expect(w.findAll('.p-dots i.on')).toHaveLength(1)
  })

  it('stops listening to the keyboard once unmounted', async () => {
    const w = make()
    w.unmount()
    mounted.pop()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }))
    expect(w.emitted('done')).toBeUndefined()
  })

  it('disables the keys while waiting and shows the countdown', async () => {
    const w = make({ waitSec: 42 })
    expect(w.findAll('.p-pad button[data-k]:not([data-k="del"])').every((b) => b.attributes('disabled') !== undefined)).toBe(true)
    expect(w.text()).toContain('Kebanyakan salah. Coba lagi 42 detik lagi.')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }))
    await w.vm.$nextTick()
    expect(w.findAll('.p-dots i.on')).toHaveLength(0)
  })

  it('shows the error and the forgot link only when unlocking', async () => {
    const w = make({ error: 'PIN salah. Sisa 4× lagi.' })
    expect(w.text()).toContain('PIN salah. Sisa 4× lagi.')
    await w.find('[data-test="forgot"]').trigger('click')
    expect(w.emitted('forgot')).toHaveLength(1)
    expect(make({ mode: 'create' }).find('[data-test="forgot"]').exists()).toBe(false)
  })

  it('ignores keys typed into an input elsewhere', async () => {
    const w = make()
    const input = document.createElement('input')
    document.body.appendChild(input)
    for (const key of '123456') input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
    await w.vm.$nextTick()
    expect(w.findAll('.p-dots i.on')).toHaveLength(0)
    expect(w.emitted('done')).toBeUndefined()
    input.remove()
  })

  it('ignores the keyboard while its page is not the active view', async () => {
    const active = ref(false)
    const w = make({}, active)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }))
    await w.vm.$nextTick()
    expect(w.findAll('.p-dots i.on')).toHaveLength(0)
    active.value = true
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }))
    await w.vm.$nextTick()
    expect(w.findAll('.p-dots i.on')).toHaveLength(1)
  })

  it('ignores composed keys from an input inside a shadow root or an ion-input host', async () => {
    const w = make()
    const host = document.createElement('div')
    const inner = document.createElement('input')
    host.attachShadow({ mode: 'open' }).appendChild(inner)
    const ion = document.createElement('ion-input')
    document.body.append(host, ion)
    for (const key of '123') inner.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true }))
    for (const key of '456') ion.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true }))
    await w.vm.$nextTick()
    expect(w.findAll('.p-dots i.on')).toHaveLength(0)
    expect(w.emitted('done')).toBeUndefined()
    host.remove()
    ion.remove()
  })
})
