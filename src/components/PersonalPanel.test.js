import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PersonalPanel from './PersonalPanel.vue'

vi.mock('@ionic/vue', async (importOriginal) => ({ ...(await importOriginal()) }))

function mountPanel(props) {
  const pinia = createPinia()
  setActivePinia(pinia)
  return mount(PersonalPanel, { props: { open: true, view: 'bio', id: null, formKey: 1, ...props }, global: { plugins: [pinia], stubs: { teleport: true } }, attachTo: document.body })
}

describe('PersonalPanel', () => {
  it('shows the form of its view only while open and is hidden for assistive tech otherwise', () => {
    const w = mountPanel({ open: false })
    expect(w.find('[data-test="panel"]').attributes('aria-hidden')).toBe('true')
    expect(w.find('form').exists()).toBe(false)
    w.unmount()
  })

  it('closes from the x, the scrim and Esc', async () => {
    const w = mountPanel()
    await w.find('.pp-x').trigger('click')
    await w.find('.pp-scrim').trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(w.emitted('close')).toHaveLength(3)
    w.unmount()
  })

  it('ignores Esc while a confirmation (alert) is open and after unmount', () => {
    const w = mountPanel()
    const alert = document.createElement('ion-alert')
    document.body.appendChild(alert)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(w.emitted('close')).toBeUndefined()
    alert.remove()
    w.unmount()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(w.emitted('close')).toBeUndefined()
  })
})
