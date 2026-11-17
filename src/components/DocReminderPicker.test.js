import { mount } from '@vue/test-utils'
import DocReminderPicker from './DocReminderPicker.vue'

const rem = (n, unit, time = '09:00') => ({ n, unit, time })

function mountPicker(modelValue) {
  const w = mount(DocReminderPicker, { props: { modelValue } })
  const last = () => w.emitted('update:modelValue').at(-1)[0]
  return { w, last }
}

describe('DocReminderPicker', () => {
  it('shows each reminder as a chip and counts them', () => {
    const { w } = mountPicker([rem(8, 'month'), rem(6, 'month')])
    expect(w.findAll('[data-test="rem-chip"]').map((c) => c.text())).toEqual(['8 bulan sebelum · 09.00', '6 bulan sebelum · 09.00'])
    expect(w.text()).toContain('2/3')
  })

  it('removes a reminder with its x', async () => {
    const { w, last } = mountPicker([rem(8, 'month'), rem(6, 'month')])
    await w.findAll('[data-test="rem-chip"]')[0].trigger('click')
    expect(last()).toEqual([rem(6, 'month')])
  })

  it('adds one from number + unit + hour', async () => {
    const { w, last } = mountPicker([])
    await w.find('[data-test="rem-add"]').trigger('click')
    await w.find('[data-test="rem-n"]').setValue('3')
    await w.find('[data-test="rem-unit-week"]').trigger('click')
    await w.find('[data-test="rem-time-18:00"]').trigger('click')
    await w.find('[data-test="rem-use"]').trigger('click')
    expect(last()).toEqual([rem(3, 'week', '18:00')])
    expect(w.find('[data-test="rem-use"]').exists()).toBe(false)
  })

  it('hides Tambah once there are three', () => {
    const { w } = mountPicker([rem(1, 'day'), rem(2, 'day'), rem(3, 'day')])
    expect(w.find('[data-test="rem-add"]').exists()).toBe(false)
    expect(w.text()).toContain('3/3')
  })

  it('refuses duplicates and more than 24 months with the shared messages', async () => {
    const { w } = mountPicker([rem(1, 'month')])
    await w.find('[data-test="rem-add"]').trigger('click')
    await w.find('[data-test="rem-use"]').trigger('click')
    expect(w.find('[data-test="rem-error"]').text()).toBe('Pengingat itu udah ada.')
    await w.find('[data-test="rem-n"]').setValue('25')
    await w.find('[data-test="rem-use"]').trigger('click')
    expect(w.find('[data-test="rem-error"]').text()).toBe('Maksimal 24 bulan.')
    expect(w.emitted('update:modelValue')).toBeUndefined()
  })
})
