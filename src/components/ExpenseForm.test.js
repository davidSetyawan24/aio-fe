import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { setCategoriesApi, useCategoriesStore } from '@/stores/categories.js'
import { setExpensesApi } from '@/stores/expenses.js'
import { setWalletApi } from '@/stores/wallet.js'
import ExpenseForm from './ExpenseForm.vue'

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

const makan = { id: 1, name: 'Makan', emoji: '🍜', tint: '#FFE9D6' }
const ngopi = { id: 2, name: 'Ngopi', emoji: '☕', tint: '#FFF3B8' }
const cash = { id: 1, kind: 'cash', bank: null, name: 'Cash', favorite: true }
const jago = { id: 3, kind: 'debit', bank: 'Jago', name: 'Jago Utama', favorite: true }
const bni = { id: 5, kind: 'cc', bank: 'BNI', name: 'BNI Gold', favorite: false }
const summary = { today: '2026-11-14', todayTotal: 68000, todayCount: 3, monthTotal: 900000, last7Days: [], lastSourceId: 3 }

let apis
const mounted = []
let pinia
async function mountForm(props = {}) {
  let catList = [makan, ngopi]
  apis = {
    categories: {
      get: vi.fn(async () => ({ categories: catList })),
      post: vi.fn(),
      patch: vi.fn(),
      del: vi.fn(),
    },
    wallet: { get: vi.fn(async () => ({ sources: [cash, jago, bni] })) },
    expenses: {
      get: vi.fn(async (url) => {
        if (url === '/expenses/summary') return summary
        if (url === '/expenses/suggestions') return { suggestions: [{ note: 'Kopi Kenangan', categoryId: 2 }, { note: 'Superindo', categoryId: null }] }
        return { month: '2026-11', expenses: [] }
      }),
      post: vi.fn(async (url, body) => ({ expense: { id: 9, ...body, spentOn: body.spentOn } })),
      patch: vi.fn(async (url, body) => ({ expense: { id: 7, spentOn: '2026-11-10', ...body } })),
      del: vi.fn(async () => null),
    },
    setCats: (list) => (catList = list),
  }
  setCategoriesApi(apis.categories)
  setWalletApi(apis.wallet)
  setExpensesApi(apis.expenses)
  pinia = createPinia()
  setActivePinia(pinia)
  const w = mount(ExpenseForm, { props, global: { plugins: [pinia], stubs: { teleport: true } }, attachTo: document.body })
  mounted.push(w)
  await flushPromises()
  return w
}
async function typeAmount(w, text) {
  const el = w.find('[data-test="amount"]')
  el.element.value = text
  await el.trigger('input')
}
async function typeNote(w, text) {
  const el = w.find('[data-test="note"]')
  el.element.value = text
  await el.trigger('input')
}
const saveBtn = (w) => w.find('[data-test="save"]')
const submit = async (w) => {
  await w.find('form').trigger('submit')
  await flushPromises()
}

beforeEach(() => {
  ionRouter.push.mockClear()
  toastCreate.mockReset().mockResolvedValue(toast)
  sheet.onDidDismiss.mockReset().mockResolvedValue({ data: 'delete' })
  sheetCreate.mockReset().mockResolvedValue(sheet)
})
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  document.body.innerHTML = ''
})

describe('ExpenseForm — catat', () => {
  it('keeps Simpan off until there is an amount and a category', async () => {
    const w = await mountForm()
    expect(saveBtn(w).attributes('disabled')).toBeDefined()
    await typeAmount(w, '18000')
    expect(saveBtn(w).attributes('disabled')).toBeDefined()
    await w.find('[data-cat="2"]').trigger('click')
    expect(saveBtn(w).attributes('disabled')).toBeUndefined()
    await typeAmount(w, 'abc')
    expect(saveBtn(w).attributes('disabled')).toBeDefined()
  })

  it('formats the amount while typing, also from pasted text', async () => {
    const w = await mountForm()
    await typeAmount(w, 'Rp 18,000')
    expect(w.find('[data-test="amount"]').element.value).toBe('18.000')
    await typeAmount(w, '12345678901')
    expect(w.find('[data-test="amount"]').element.value).toBe('1.234.567.890')
  })

  it('never lets the browser block Simpan with its own (English) format check', async () => {
    const w = await mountForm()
    await typeAmount(w, '27000')
    expect(w.find('form').attributes('novalidate')).toBeDefined()
    expect(w.find('[data-test="amount"]').attributes('pattern')).toBeUndefined()
    expect(w.find('[data-test="amount"]').element.checkValidity()).toBe(true)
  })

  it('picks the last used source and shows how much went out today', async () => {
    const w = await mountForm()
    expect(w.find('[data-src="3"]').classes()).toContain('on')
    expect(w.find('[data-test="today-hint"]').text()).toBe('hari ini udah keluar Rp68.000')
  })

  it('fills the note and its category from a suggestion', async () => {
    const w = await mountForm()
    await typeNote(w, 'kop')
    const chips = w.findAll('[data-test="suggestion"]')
    expect(chips.map((c) => c.text())).toEqual(['☕Kopi Kenangan'])
    await chips[0].trigger('click')
    expect(w.find('[data-test="note"]').element.value).toBe('Kopi Kenangan')
    expect(w.find('[data-cat="2"]').classes()).toContain('on')
  })

  it('records the expense for today (server decides the date), with note, category and source', async () => {
    const w = await mountForm()
    await typeAmount(w, '18000')
    await typeNote(w, '  Kopi Kenangan ')
    await w.find('[data-cat="2"]').trigger('click')
    await submit(w)
    expect(apis.expenses.post).toHaveBeenCalledWith('/expenses', { amount: 18000, note: 'Kopi Kenangan', categoryId: 2, sourceId: 3 })
    expect(w.emitted('saved')[0][1]).toBe(false)
    expect(toastCreate).toHaveBeenCalledWith(expect.objectContaining({ message: 'Kecatet · Rp18.000 ☕ Ngopi' }))
  })

  it('sends an empty note as null and lets another source be picked from Lainnya', async () => {
    const w = await mountForm()
    await typeAmount(w, '5000')
    await w.find('[data-cat="1"]').trigger('click')
    expect(w.find('[data-src="5"]').exists()).toBe(false)
    await w.find('[data-test="more-src"]').trigger('click')
    await w.find('[data-pick="5"]').trigger('click')
    expect(w.find('[data-src="5"]').classes()).toContain('on')
    await submit(w)
    expect(apis.expenses.post).toHaveBeenCalledWith('/expenses', expect.objectContaining({ note: null, sourceId: 5 }))
  })

  it('puts the source sheet on the page body so it covers the screen, not the bottom of the form', async () => {
    await mountForm()
    const real = mount(ExpenseForm, { global: { plugins: [pinia] }, attachTo: document.body })
    await flushPromises()
    const sheetEl = document.body.querySelector(':scope > .sheet')
    expect(sheetEl).not.toBeNull()
    expect(real.element.contains(sheetEl)).toBe(false)
    real.unmount()
  })

  it('reloads today\'s numbers when the app comes back to the foreground', async () => {
    await mountForm()
    const before = apis.expenses.get.mock.calls.filter((c) => c[0] === '/expenses/summary').length
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()
    expect(apis.expenses.get.mock.calls.filter((c) => c[0] === '/expenses/summary').length).toBe(before + 1)
  })

  it('keeps Simpan off after a successful save, so a late tap during the back animation adds nothing', async () => {
    const w = await mountForm()
    await typeAmount(w, '18000')
    await w.find('[data-cat="2"]').trigger('click')
    await submit(w)
    expect(saveBtn(w).attributes('disabled')).toBeDefined()
    await submit(w)
    expect(apis.expenses.post).toHaveBeenCalledTimes(1)
  })

  it('counts the save as done even if refreshing the lists afterwards fails', async () => {
    const w = await mountForm()
    const get = apis.expenses.get.getMockImplementation()
    apis.expenses.get.mockImplementation(async (url) => {
      if (url === '/expenses/suggestions') throw new Error('putus')
      return get(url)
    })
    await typeAmount(w, '18000')
    await w.find('[data-cat="2"]').trigger('click')
    await submit(w)
    expect(w.emitted('saved')).toBeTruthy()
    expect(w.find('[role="alert"]').exists()).toBe(false)
  })

  it('records only once when Simpan is tapped twice', async () => {
    const w = await mountForm()
    await typeAmount(w, '18000')
    await w.find('[data-cat="2"]').trigger('click')
    w.find('form').trigger('submit')
    w.find('form').trigger('submit')
    await flushPromises()
    expect(apis.expenses.post).toHaveBeenCalledTimes(1)
  })

  it('"Simpan & catat lagi" clears amount, note and category but keeps date and source', async () => {
    const w = await mountForm()
    const date = w.find('[data-test="date"]')
    date.element.value = '2026-11-12'
    await date.trigger('change')
    await w.find('[data-test="more-src"]').trigger('click')
    await w.find('[data-pick="5"]').trigger('click')
    await typeAmount(w, '18000')
    await typeNote(w, 'Fore')
    await w.find('[data-cat="2"]').trigger('click')
    await w.find('[data-test="again"]').trigger('click')
    await flushPromises()
    expect(apis.expenses.post).toHaveBeenCalledWith('/expenses', expect.objectContaining({ spentOn: '2026-11-12', sourceId: 5 }))
    expect(w.emitted('saved')[0][1]).toBe(true)
    expect(w.find('[data-test="amount"]').element.value).toBe('')
    expect(w.find('[data-test="note"]').element.value).toBe('')
    expect(w.find('[data-cat="2"]').classes()).not.toContain('on')
    expect(date.element.value).toBe('2026-11-12')
    expect(w.find('[data-src="5"]').classes()).toContain('on')
    expect(w.find('[data-test="date-chip"]').classes()).toContain('past')
  })

  it('opens the new-category form and picks the new category on return, keeping what was typed', async () => {
    const w = await mountForm()
    await typeAmount(w, '75000')
    await typeNote(w, 'Bioskop')
    await w.find('[data-test="new-cat"]').trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/kategori/tambah?from=catat')
    const hiburan = { id: 11, name: 'Hiburan', emoji: '🎬', tint: '#FFE0E6' }
    apis.setCats([makan, ngopi, hiburan])
    const cats = useCategoriesStore()
    await cats.load()
    cats.justCreatedId = 11
    await w.vm.pickJustCreated()
    await flushPromises()
    expect(w.find('[data-cat="11"]').classes()).toContain('on')
    expect(w.find('[data-test="amount"]').element.value).toBe('75.000')
    expect(w.find('[data-test="note"]').element.value).toBe('Bioskop')
  })
})

describe('ExpenseForm — kategori baru', () => {
  it('ignores a category made elsewhere (not via Baru on this screen)', async () => {
    const w = await mountForm()
    await w.find('[data-cat="1"]').trigger('click')
    useCategoriesStore().justCreatedId = 2
    await w.vm.pickJustCreated()
    await flushPromises()
    expect(w.find('[data-cat="1"]').classes()).toContain('on')
  })
})

describe('ExpenseForm — ubah', () => {
  const old = {
    id: 7, spentOn: '2026-11-10', amount: 18000, note: 'Fore',
    category: { id: 4, name: 'Kopi lama', emoji: '☕', tint: '#FFF3B8', archived: true },
    source: { id: 3, name: 'Jago Utama', kind: 'debit', bank: 'Jago', archived: false },
  }

  it('fills the form, keeps a hidden category selectable, and sends only what changed', async () => {
    const w = await mountForm({ expense: old })
    expect(w.find('[data-test="amount"]').element.value).toBe('18.000')
    expect(w.find('[data-cat="4"]').classes()).toContain('on')
    expect(w.find('[data-test="again"]').exists()).toBe(false)
    await typeAmount(w, '20000')
    await submit(w)
    expect(apis.expenses.patch).toHaveBeenCalledWith('/expenses/7', { amount: 20000 })
    expect(toastCreate).toHaveBeenCalledWith(expect.objectContaining({ message: 'Disimpen.' }))
  })

  it('deletes after confirming', async () => {
    const w = await mountForm({ expense: old })
    await w.find('[data-test="delete"]').trigger('click')
    await flushPromises()
    expect(sheetCreate).toHaveBeenCalledWith(expect.objectContaining({ header: 'Hapus catatan ini?' }))
    expect(apis.expenses.del).toHaveBeenCalledWith('/expenses/7')
    expect(w.emitted('deleted')).toBeTruthy()
  })

  it('says a past-date expense does not count for today', async () => {
    const w = await mountForm({ expense: old })
    expect(w.find('[data-test="today-hint"]').text()).toBe('catatan tanggal lain · nggak masuk hitungan hari ini')
  })
})
