import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ApiError } from '@/lib/api.js'
import { PASSWORD_CHANGED_MESSAGE } from '@/lib/passwordChange.js'
import { setAuthApi, useAuthStore } from '@/stores/auth.js'
import ChangePasswordPage from './ChangePasswordPage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
const toast = vi.hoisted(() => ({ present: vi.fn() }))
const toastCreate = vi.hoisted(() => vi.fn())

vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  toastController: { create: toastCreate },
}))

const david = { id: 1, username: 'david', name: 'David Setyawan' }

let api
async function mountPage(post = async () => null) {
  api = { get: vi.fn(), post: vi.fn(post) }
  setAuthApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  auth.user = david
  auth.status = 'authed'
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/tabs/profil/password', component: ChangePasswordPage }] })
  router.push('/tabs/profil/password')
  await router.isReady()
  const wrapper = mount(ChangePasswordPage, { global: { plugins: [pinia, router] } })
  return { wrapper, auth }
}

/** Ngetik ke ion-input: set value lalu kirim event ionInput (yang dipakai v-model Ionic Vue). */
function type(wrapper, index, value) {
  const el = wrapper.findAll('ion-input')[index].element
  el.value = value
  el.dispatchEvent(new Event('ionInput'))
}
const values = (wrapper) => wrapper.findAll('ion-input').map((f) => f.element.value)
async function fill(wrapper, current, next, confirm = next) {
  type(wrapper, 0, current)
  type(wrapper, 1, next)
  type(wrapper, 2, confirm)
  await flushPromises()
}
const submit = async (wrapper) => {
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

beforeEach(() => {
  ionRouter.back.mockClear()
  ionRouter.navigate.mockClear()
  toast.present.mockClear()
  toastCreate.mockReset().mockResolvedValue(toast)
})

describe('ChangePasswordPage', () => {
  it('uses three ion-inputs with password autocomplete', async () => {
    const { wrapper } = await mountPage()
    const fields = wrapper.findAll('ion-input')
    expect(fields).toHaveLength(3)
    expect(fields.map((f) => f.element.autocomplete)).toEqual(['current-password', 'new-password', 'new-password'])
    const user = wrapper.find('input[autocomplete="username"]')
    expect(user.element.value).toBe('david')
    expect(user.attributes('aria-hidden')).toBe('true')
    expect(user.attributes('tabindex')).toBe('-1')
  })

  it('shows a validation error without calling the server', async () => {
    const { wrapper } = await mountPage()
    await fill(wrapper, 'lama-123456', 'baru-123456', 'baru-beda-999')
    await submit(wrapper)
    expect(wrapper.find('.error').text()).toBe('Ulangi password-nya belum sama.')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('shows "Password lama salah." and stays logged in', async () => {
    const { wrapper, auth } = await mountPage(async () => {
      throw new ApiError('Password lama salah.', 422)
    })
    await fill(wrapper, 'salah-123456', 'baru-123456')
    await submit(wrapper)
    expect(wrapper.find('.error').text()).toBe('Password lama salah.')
    expect(auth.status).toBe('authed')
    expect(values(wrapper)).toEqual(['salah-123456', 'baru-123456', 'baru-123456'])
  })

  it('stays on the page when offline', async () => {
    const { wrapper } = await mountPage(async () => {
      throw new ApiError('Nggak bisa nyambung ke server.', 0)
    })
    await fill(wrapper, 'lama-123456', 'baru-123456')
    await submit(wrapper)
    expect(wrapper.find('.error').text()).toBe('Nggak bisa nyambung ke server.')
    expect(values(wrapper)).toEqual(['lama-123456', 'baru-123456', 'baru-123456'])
    expect(ionRouter.back).not.toHaveBeenCalled()
  })

  it('saves once, clears the fields, goes back and shows a toast', async () => {
    let finish
    const { wrapper } = await mountPage(() => new Promise((r) => (finish = r)))
    await fill(wrapper, 'lama-123456', 'baru-123456')
    wrapper.find('form').trigger('submit')
    wrapper.find('form').trigger('submit')
    await flushPromises()
    finish(null)
    await flushPromises()
    expect(api.post).toHaveBeenCalledTimes(1)
    expect(api.post).toHaveBeenCalledWith('/auth/password', { currentPassword: 'lama-123456', newPassword: 'baru-123456' })
    expect(values(wrapper)).toEqual(['', '', ''])
    expect(ionRouter.back).toHaveBeenCalled()
    expect(toastCreate).toHaveBeenCalledWith(expect.objectContaining({ message: PASSWORD_CHANGED_MESSAGE }))
    expect(toast.present).toHaveBeenCalled()
  })

  // Review 14/11: kolom ada di dalam <form>, jadi Enter/"next" di keyboard HP nge-submit form (implicit submission)
  // → muncul error "Password baru wajib diisi." padahal David cuma mau pindah kolom.
  it('moves to the next field on the keyboard "next" key instead of submitting', async () => {
    const { wrapper } = await mountPage()
    const inputs = wrapper.findAll('ion-input').map((f) => f.element)
    inputs.forEach((el) => (el.setFocus = vi.fn()))
    for (const i of [0, 1]) {
      const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
      inputs[i].dispatchEvent(enter)
      expect(enter.defaultPrevented, `field ${i}`).toBe(true)
      expect(inputs[i + 1].setFocus).toHaveBeenCalled()
    }
    await flushPromises()
    expect(wrapper.find('.error').exists()).toBe(false)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('submits once on the keyboard "done" key in the last field', async () => {
    const { wrapper } = await mountPage()
    await fill(wrapper, 'lama-123456', 'baru-123456')
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    wrapper.findAll('ion-input')[2].element.dispatchEvent(enter)
    await flushPromises()
    expect(enter.defaultPrevented).toBe(true)
    expect(api.post).toHaveBeenCalledTimes(1)
  })

  it('keeps the layout still when a field gets focus', async () => {
    const { wrapper } = await mountPage()
    const before = wrapper.find('form').classes()
    await wrapper.find('.fields').trigger('focusin')
    await wrapper.find('.fields').trigger('pointerdown')
    expect(wrapper.find('form').classes()).toEqual(before)
  })
})
