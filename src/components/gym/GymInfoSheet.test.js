import { mount } from '@vue/test-utils'
import GymInfoSheet from './GymInfoSheet.vue'

const mounted = []
beforeEach(() => document.body.appendChild(document.createElement('ion-app')))
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  document.querySelectorAll('ion-app').forEach((e) => e.remove())
})
function mk(term, wide = false) {
  const w = mount(GymInfoSheet, { props: { term, wide }, attachTo: document.body })
  mounted.push(w)
  return w
}
const sheet = () => document.querySelector('[data-test="info-sheet"]')

describe('GymInfoSheet', () => {
  it.each([
    ['volume', 'Volume', '540 kg'],
    ['pr', 'PR (rekor pribadi)', 'beban terberat'],
    ['1rm', '1RM (perkiraan angkat maksimal)', 'rumus Epley'],
    ['po', 'Progressive overload', 'sedikit demi sedikit'],
  ])('%s → teks mockup', (term, title, bit) => {
    mk(term)
    expect(sheet().classList.contains('show')).toBe(true)
    expect(sheet().querySelector('h2').textContent).toBe(title)
    expect(sheet().textContent).toContain(bit)
    expect(sheet().textContent).toContain('Oke, paham')
  })

  it('term null → tertutup; Oke, paham / ✕ / scrim → close', async () => {
    const w = mk(null)
    expect(sheet().classList.contains('show')).toBe(false)
    await w.setProps({ term: 'pr' })
    sheet().querySelector('[data-test="info-ok"]').click()
    sheet().querySelector('[data-test="info-x"]').click()
    document.querySelector('.gy-scrim').click()
    expect(w.emitted('close')).toHaveLength(3)
  })

  it('wide → dialog', () => {
    mk('pr', true)
    expect(sheet().classList.contains('dialog')).toBe(true)
  })
})
