import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { setWalletApi } from '@/stores/wallet.js'
import WalletFormPage from './WalletFormPage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
const toast = vi.hoisted(() => ({ present: vi.fn() }))
const toastCreate = vi.hoisted(() => vi.fn())
const sheet = vi.hoisted(() => ({ present: vi.fn(), onDidDismiss: vi.fn() }))
const sheetCreate = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  toastController: { create: toastCreate },
  actionSheetController: { create: sheetCreate },
}))

const bcaCard = { id: 4, kind: 'cc', bank: 'BCA', name: 'BCA Card', expMonth: 8, expYear: 2028, creditLimit: 20_000_000, statementDay: 5, dueDay: 25, favorite: false }
const cash = { id: 1, kind: 'cash', bank: null, name: 'Cash', favorite: true }

let api
async function mountForm(path) {
  api = {
    get: vi.fn(async () => ({ sources: [cash, bcaCard] })),
    post: vi.fn(async (url, body) => ({ source: { id: 9, ...body } })),
    patch: vi.fn(async (url, body) => ({ source: { ...bcaCard, ...body } })),
    del: vi.fn(async () => null),
  }
  setWalletApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/tabs/menu/kartu/tambah', component: WalletFormPage },
      { path: '/tabs/menu/kartu/:id', component: WalletFormPage },
      { path: '/tabs/profil/device/:id', component: { render: () => null } },
    ],
  })
  router.push(path)
  await router.isReady()
  const w = mount(WalletFormPage, { global: { plugins: [pinia, router] } })
  await flushPromises()
  w.router = router
  return w
}
function type(w, test, value) {
  const el = w.find(`[data-test="${test}"]`).element
  el.value = value
  el.dispatchEvent(new Event('ionInput'))
}
const save = async (w) => {
  await w.find('form').trigger('submit')
  await flushPromises()
}

beforeEach(() => {
  ionRouter.back.mockClear()
  toastCreate.mockReset().mockResolvedValue(toast)
  sheet.onDidDismiss.mockReset().mockResolvedValue({ data: 'delete' })
  sheetCreate.mockReset().mockResolvedValue(sheet)
})

describe('WalletFormPage — tambah', () => {
  it('adds a savings account', async () => {
    const w = await mountForm('/tabs/menu/kartu/tambah')
    await w.find('[data-bank="Jago"]').trigger('click')
    type(w, 'name', 'Jago Utama')
    type(w, 'exp', '0929')
    await w.find('[data-test="fav"]').trigger('click')
    await save(w)
    expect(api.post).toHaveBeenCalledWith('/payment-sources', { kind: 'debit', bank: 'Jago', name: 'Jago Utama', expMonth: 9, expYear: 2029, favorite: true })
    expect(ionRouter.back).toHaveBeenCalled()
    expect(toastCreate).toHaveBeenCalledWith(expect.objectContaining({ message: 'Jago Utama ditambah.' }))
  })

  it('formats the expiry and the limit while typing', async () => {
    const w = await mountForm('/tabs/menu/kartu/tambah')
    await w.find('[data-kind="cc"]').trigger('click')
    type(w, 'exp', '0828')
    type(w, 'limit', '20000000')
    await flushPromises()
    expect(w.find('[data-test="exp"]').element.value).toBe('08/28')
    expect(w.find('[data-test="limit"]').element.value).toBe('Rp20.000.000')
  })

  it('needs the card details before saving a credit card', async () => {
    const w = await mountForm('/tabs/menu/kartu/tambah')
    await w.find('[data-kind="cc"]').trigger('click')
    await w.find('[data-bank="BCA"]').trigger('click')
    type(w, 'name', 'BCA Card')
    await save(w)
    expect(w.find('.error').text()).toBe('Limit kartu kredit wajib diisi.')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('saves a credit card with numbers', async () => {
    const w = await mountForm('/tabs/menu/kartu/tambah')
    await w.find('[data-kind="cc"]').trigger('click')
    await w.find('[data-bank="BNI"]').trigger('click')
    type(w, 'name', 'BNI Gold')
    type(w, 'exp', '07/28')
    type(w, 'limit', '25000000')
    type(w, 'stmt', '28')
    type(w, 'due', '18')
    await save(w)
    expect(api.post).toHaveBeenCalledWith('/payment-sources', {
      kind: 'cc', bank: 'BNI', name: 'BNI Gold', expMonth: 7, expYear: 2028, creditLimit: 25_000_000, statementDay: 28, dueDay: 18, favorite: false,
    })
  })

  it('takes another bank name from "Lainnya"', async () => {
    const w = await mountForm('/tabs/menu/kartu/tambah')
    await w.find('[data-bank="Lainnya"]').trigger('click')
    type(w, 'other-bank', 'Seabank')
    type(w, 'name', 'Sea')
    await save(w)
    expect(api.post).toHaveBeenCalledWith('/payment-sources', expect.objectContaining({ bank: 'Seabank', name: 'Sea' }))
  })

  it('rejects a wrong expiry', async () => {
    const w = await mountForm('/tabs/menu/kartu/tambah')
    await w.find('[data-bank="Jago"]').trigger('click')
    type(w, 'name', 'Jago')
    type(w, 'exp', '13/28')
    await save(w)
    expect(w.find('.error').text()).toBe('Expired formatnya BB/TT, bulan 01–12.')
  })
})

describe('WalletFormPage — ubah', () => {
  it('fills the form and saves only the changes', async () => {
    const w = await mountForm('/tabs/menu/kartu/4')
    expect(w.find('h1').text()).toContain('BCA Card.')
    expect(w.find('[data-kind="cc"]').exists()).toBe(false)
    expect(w.find('[data-test="exp"]').element.value).toBe('08/28')
    expect(w.find('[data-test="limit"]').element.value).toBe('Rp20.000.000')
    type(w, 'limit', '30000000')
    await save(w)
    expect(api.patch).toHaveBeenCalledWith('/payment-sources/4', expect.objectContaining({ creditLimit: 30_000_000, name: 'BCA Card' }))
    expect(api.patch.mock.calls[0][1]).not.toHaveProperty('kind')
  })

  it('deletes after confirming', async () => {
    const w = await mountForm('/tabs/menu/kartu/4')
    await w.find('[data-test="delete"]').trigger('click')
    await flushPromises()
    expect(sheetCreate).toHaveBeenCalledWith(expect.objectContaining({ header: 'Hapus BCA Card?' }))
    expect(api.del).toHaveBeenCalledWith('/payment-sources/4')
    expect(ionRouter.back).toHaveBeenCalled()
  })

  it('moves to the next field on the keyboard "next" key', async () => {
    const w = await mountForm('/tabs/menu/kartu/tambah')
    const name = w.find('[data-test="name"]').element
    const exp = w.find('[data-test="exp"]').element
    exp.setFocus = vi.fn()
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    name.dispatchEvent(enter)
    expect(enter.defaultPrevented).toBe(true)
    expect(exp.setFocus).toHaveBeenCalled()
  })
})

// Review 14/11: Ionic nyimpen halaman yang ketumpuk tetep hidup, jadi route global bisa ganti ke halaman lain
// (mis. profil/device/4) sementara form ini masih ada. Form harus tetep pakai id-nya sendiri.
describe('WalletFormPage — route lain', () => {
  it('keeps the add form empty when another page with an id opens', async () => {
    const w = await mountForm('/tabs/menu/kartu/tambah')
    await w.router.push('/tabs/profil/device/4')
    await flushPromises()
    expect(w.find('[data-test="name"]').element.value).toBe('')
    expect(w.find('[data-kind="cc"]').exists()).toBe(true)
  })

  it('keeps unsaved edits when the route changes elsewhere', async () => {
    const w = await mountForm('/tabs/menu/kartu/4')
    type(w, 'name', 'BCA Utama')
    await w.router.push('/tabs/profil/device/1')
    await flushPromises()
    expect(w.find('[data-test="name"]').element.value).toBe('BCA Utama')
  })
})
