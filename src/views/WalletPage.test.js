import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { setWalletApi } from '@/stores/wallet.js'
import WalletPage from './WalletPage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
const toastCreate = vi.hoisted(() => vi.fn(async () => ({ present: vi.fn() })))
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  toastController: { create: toastCreate },
  onIonViewWillEnter: (fn) => fn(),
}))

const sources = [
  { id: 1, kind: 'cash', bank: null, name: 'Cash', favorite: true },
  { id: 2, kind: 'debit', bank: 'Jago', name: 'Jago Utama', expMonth: 9, expYear: 2029, favorite: true },
  { id: 3, kind: 'debit', bank: 'BCA', name: 'BCA Pribadi', favorite: false },
  { id: 4, kind: 'cc', bank: 'BCA', name: 'BCA Card', expMonth: 8, expYear: 2028, creditLimit: 20_000_000, statementDay: 5, dueDay: 25, favorite: false },
]
let api
async function mountPage() {
  api = { get: vi.fn(async () => ({ sources })), patch: vi.fn(async (url, body) => ({ source: body })), post: vi.fn(async (url, body) => ({ source: { id: 9, ...body } })) }
  setWalletApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/tabs/menu/kartu', component: WalletPage }] })
  router.push('/tabs/menu/kartu')
  await router.isReady()
  const w = mount(WalletPage, { global: { plugins: [pinia, router], stubs: { teleport: true } } })
  await flushPromises()
  return w
}

beforeEach(() => ionRouter.push.mockClear())

describe('WalletPage', () => {
  it('shows the summary, starred chips and Cash', async () => {
    const w = await mountPage()
    expect(w.find('h1').text()).toBe('Dompet lo.3 kartu & rekening')
    expect(w.findAll('.stat b').map((s) => s.text())).toEqual(['2', '1', 'Rp20jt'])
    expect(w.findAll('[data-test="fav"]').map((f) => f.text())).toEqual(['💵Cash', 'JGJago Utama'])
    expect(w.find('[data-test="cash"]').text()).toContain('Cash')
  })

  it('groups per bank with savings first and card details', async () => {
    const w = await mountPage()
    expect(w.findAll('.bank-name').map((b) => b.text())).toEqual(['Jago', 'BCA'])
    const bca = w.findAll('[data-test="bank"]')[1]
    expect(bca.findAll('[data-test="source"]').map((r) => r.find('.title').text())).toEqual(['BCA Pribadi', 'BCA Card'])
    expect(bca.text()).toContain('Limit Rp20jt')
    expect(bca.text()).toContain('cetak tgl 5')
    expect(bca.text()).toContain('jatuh tempo tgl 25')
  })

  it('stars a source with one tap', async () => {
    const w = await mountPage()
    await w.find('[data-test="star-3"]').trigger('click')
    await flushPromises()
    expect(api.patch).toHaveBeenCalledWith('/payment-sources/3', { favorite: true })
    expect(w.find('[data-test="star-3"]').classes()).toContain('on')
  })

  it('opens the form to add or edit', async () => {
    const w = await mountPage()
    await w.find('[data-test="add"]').trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/kartu/tambah')
    await w.findAll('[data-test="source"]')[0].trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/kartu/2')
  })
})

describe('WalletPage — PC (layar lebar)', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  })
  afterEach(() => {
    delete window.matchMedia
  })

  it('shows the summary card, savings on the left and credit cards as big cards', async () => {
    const w = await mountPage()
    expect(w.find('[data-test="pc"]').exists()).toBe(true)
    expect(w.find('[data-test="phone"]').exists()).toBe(false)
    expect(w.findAll('[data-test="sum"] .v').map((v) => v.text())).toEqual(['Rp20jt', '2', '1', expect.any(String)])
    expect(w.findAll('[data-test="saving"]').map((r) => r.find('.title').text())).toEqual(['Cash', 'Jago Utama', 'BCA Pribadi'])
    const cards = w.findAll('[data-test="bigcc"]')
    expect(cards).toHaveLength(1)
    expect(cards[0].text()).toContain('BCA Card')
    expect(cards[0].text()).toContain('Rp20jt')
    expect(cards[0].text()).toContain('EXP 08/28')
    expect(cards[0].text()).toContain('cetak tgl 5')
  })

  it('opens the form in a side panel instead of a new page, and closes it after saving', async () => {
    const w = await mountPage()
    await w.find('[data-test="bigcc"]').trigger('click')
    await flushPromises()
    expect(ionRouter.push).not.toHaveBeenCalled()
    const panel = w.find('[data-test="panel"]')
    expect(panel.classes()).toContain('show')
    expect(panel.text()).toContain('BCA Card')
    await panel.find('form').trigger('submit')
    await flushPromises()
    expect(api.patch).toHaveBeenCalledWith('/payment-sources/4', expect.objectContaining({ name: 'BCA Card' }))
    expect(w.find('[data-test="panel"]').classes()).not.toContain('show')
    expect(toastCreate).toHaveBeenCalledWith(expect.objectContaining({ message: 'Disimpan.' }))
  })

  it('opens an empty form in the panel from Tambah', async () => {
    const w = await mountPage()
    await w.find('[data-test="pc-add"]').trigger('click')
    await flushPromises()
    expect(ionRouter.push).not.toHaveBeenCalled()
    expect(w.find('[data-test="panel"]').text()).toContain('Tambah baru')
  })

  // Review 15/11: Esc buat batalin konfirmasi Hapus jangan ikut nutup panel (isian yang belum disimpen ilang).
  it('keeps the panel open when Esc only cancels a confirmation on top of it', async () => {
    const w = await mountPage()
    await w.find('[data-test="pc-add"]').trigger('click')
    const confirm = document.createElement('ion-action-sheet')
    document.body.appendChild(confirm)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    confirm.remove()
    expect(w.find('[data-test="panel"]').classes()).toContain('show')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(w.find('[data-test="panel"]').classes()).not.toContain('show')
  })

  it('stars a card from the big card without opening the panel', async () => {
    const w = await mountPage()
    await w.find('[data-test="bigcc"] [data-test="star-4"]').trigger('click')
    await flushPromises()
    expect(api.patch).toHaveBeenCalledWith('/payment-sources/4', { favorite: true })
    expect(w.find('[data-test="panel"]').classes()).not.toContain('show')
  })
})
