import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'
import UangExpensePanel from './UangExpensePanel.vue'

const picked = vi.fn()
const busy = ref(null)
// Form aslinya berat (store + api) — di sini cukup kembarannya: expose busy + pickJustCreated, emit saved/deleted.
const FormStub = defineComponent({
  name: 'ExpenseForm',
  props: ['expense', 'eyebrow', 'newCategoryInline'],
  emits: ['saved', 'deleted', 'new-category'],
  setup(_, { expose }) {
    expose({ busy, pickJustCreated: picked })
    return () => h('div', { 'data-test': 'form' })
  },
})
const expense = { id: 7, note: 'Kopi Kenangan', category: { id: 2, name: 'Ngopi' } }
const mountPanel = (props = {}) =>
  mount(UangExpensePanel, {
    props: { open: true, expense, formKey: 1, ...props },
    global: { stubs: { teleport: true, ExpenseForm: FormStub } },
    attachTo: document.body,
  })
const esc = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

describe('UangExpensePanel', () => {
  beforeEach(() => { busy.value = null; picked.mockClear() })

  it('shows the note as title with "Ubah catatan", and the form', () => {
    const w = mountPanel()
    expect(w.find('[data-test="panel"]').classes()).toContain('show')
    expect(w.find('.panel-h1').text()).toContain('Kopi Kenangan')
    expect(w.find('.panel-h1').text()).toContain('Ubah catatan')
    expect(w.find('[data-test="form"]').exists()).toBe(true)
    w.unmount()
  })

  it('falls back to the category name without a note', () => {
    const w = mountPanel({ expense: { ...expense, note: '' } })
    expect(w.find('.panel-h1 b').text()).toBe('Ngopi')
    w.unmount()
  })

  it('closes with the X button and with Esc', async () => {
    const w = mountPanel()
    await w.find('[data-test="panel-close"]').trigger('click')
    esc()
    expect(w.emitted('close')).toHaveLength(2)
    w.unmount()
  })

  it('ignores Esc while an Ionic alert is open', () => {
    const w = mountPanel()
    const alert = document.createElement('ion-alert')
    document.body.appendChild(alert)
    esc()
    alert.remove()
    expect(w.emitted('close')).toBeUndefined()
    w.unmount()
  })

  it('refuses to close while the form is busy', async () => {
    const w = mountPanel()
    busy.value = 'save'
    await w.find('[data-test="panel-close"]').trigger('click')
    await w.find('.ue-scrim').trigger('click')
    esc()
    expect(w.emitted('close')).toBeUndefined()
    w.unmount()
  })

  it('forwards form events and pickJustCreated', async () => {
    const w = mountPanel()
    const form = w.findComponent(FormStub)
    form.vm.$emit('saved', { id: 7 }, false)
    form.vm.$emit('deleted')
    form.vm.$emit('new-category')
    expect(w.emitted('saved')[0]).toEqual([{ id: 7 }, false])
    expect(w.emitted('deleted')).toHaveLength(1)
    expect(w.emitted('new-category')).toHaveLength(1)
    await w.vm.pickJustCreated()
    expect(picked).toHaveBeenCalled()
    w.unmount()
  })

  it('renders no form while closed', () => {
    const w = mountPanel({ open: false })
    expect(w.find('[data-test="form"]').exists()).toBe(false)
    expect(w.find('[data-test="panel"]').classes()).not.toContain('show')
    w.unmount()
  })
})
