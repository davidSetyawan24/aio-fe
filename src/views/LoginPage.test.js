import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import LoginPage from './LoginPage.vue'

async function mountLogin() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/login', component: LoginPage }] })
  router.push('/login')
  await router.isReady()
  return mount(LoginPage, { global: { plugins: [createPinia(), router] } })
}

describe('LoginPage fields', () => {
  // Bug iPad/iPhone 14/11: keyboard nutupin form. Scroll assist Ionic cuma nyari `ion-input, ion-textarea`,
  // jadi kolom login WAJIB ion-input (bukan <input> biasa) biar halaman geser ke atas keyboard.
  it('uses ion-input for username and password so Ionic keeps them above the keyboard', async () => {
    const wrapper = await mountLogin()
    const fields = wrapper.findAll('ion-input')
    expect(fields).toHaveLength(2)
    expect(wrapper.find('form input').exists()).toBe(false)
    // Ionic Vue ngoper ini sebagai properti elemen (bukan atribut HTML).
    expect(fields[0].element.autocomplete).toBe('username')
    expect(fields[1].element.autocomplete).toBe('current-password')
  })
})

describe('LoginPage keyboard behaviour', () => {
  // Bug iPad 14/11 (ke-3): "mode ngetik" mindahin form ke atas, padahal Safari iOS juga geser halaman sendiri
  // ke kolom yang di-tap → dobel, form kelempar keluar layar, tap berkali-kali bikin loncat-loncat.
  // Aturan: fokus kolom TIDAK boleh ngubah layout. Geser ke atas keyboard diserahin ke iOS (native, mulus).
  it('keeps the layout still when a field gets focus', async () => {
    const wrapper = await mountLogin()
    const before = wrapper.find('.layout').classes()
    await wrapper.find('.fields').trigger('focusin')
    await wrapper.find('.fields').trigger('pointerdown')
    expect(wrapper.find('.layout').classes()).toEqual(before)
    expect(wrapper.find('.stage').exists()).toBe(true)
  })
})
