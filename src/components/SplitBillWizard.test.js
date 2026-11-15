import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { computeShares } from '@/lib/splitBill.js'
import { setSplitBillsApi } from '@/stores/splitBills.js'
import SplitBillWizard from './SplitBillWizard.vue'

const toastCreate = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({ ...(await importOriginal()), toastController: { create: toastCreate } }))
vi.mock('@/lib/imageResize.js', () => ({ resizeForUpload: async (f) => f }))

const read = {
  place: 'Sushi Tei', spentOn: '2026-11-14',
  items: [{ name: 'Salmon Sashimi', qty: 1, price: 68000 }, { name: 'Ocha', qty: 4, price: 8000 }],
  discount: 10000, service: 4500, tax: 9450, other: 0, total: 103950, matches: true, difference: 0,
}

let api
const mounted = []
async function mountWizard(props = {}) {
  api = {
    get: vi.fn(async () => ({ outstanding: 0, waitingCount: 0, unpaidPeople: [], bills: [] })),
    post: vi.fn(async (url, body) => (url === '/split-bills/scan' ? read : { bill: { id: 9, ...body } })),
    put: vi.fn(async (url, body) => ({ bill: { id: 4, ...body } })),
  }
  setSplitBillsApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  const w = mount(SplitBillWizard, { props, global: { plugins: [pinia], stubs: { teleport: true } }, attachTo: document.body })
  mounted.push(w)
  await flushPromises()
  return w
}
async function type(w, sel, text) {
  const el = w.find(sel)
  el.element.value = text
  await el.trigger('input')
}
async function addPeople(w, ...names) {
  for (const n of names) {
    await type(w, '[data-test="person-name"]', n)
    await w.find('[data-test="add-person"]').trigger('submit')
  }
}
async function photo(w) {
  const input = w.find('[data-test="photo"]')
  Object.defineProperty(input.element, 'files', { value: [new File(['x'], 'struk.jpg', { type: 'image/jpeg' })], configurable: true })
  await input.trigger('change')
  await flushPromises()
}
const next = (w) => w.find('[data-test="next"]')
const chips = (w) => w.findAll('[data-test="chip-name"]').map((c) => c.text())

beforeEach(() => toastCreate.mockReset().mockResolvedValue({ present: vi.fn() }))
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  document.body.innerHTML = ''
})

describe('SplitBillWizard ① siapa aja', () => {
  it('starts with "Gue" that cannot be removed, adds and removes friends, refuses a duplicate name', async () => {
    const w = await mountWizard()
    expect(chips(w)).toEqual(['Gue'])
    expect(w.find('[data-test="chip"]').text()).toContain('lo')
    expect(next(w).attributes('disabled')).toBeDefined()
    await addPeople(w, 'Andi', '  Sinta ', '')
    expect(chips(w)).toEqual(['Gue', 'Andi', 'Sinta'])
    await addPeople(w, 'andi')
    expect(w.find('[role="alert"]').text()).toBe('Andi udah ada.')
    await w.findAll('[data-test="remove-person"]')[1].trigger('click')
    expect(chips(w)).toEqual(['Gue', 'Andi'])
    expect(next(w).attributes('disabled')).toBeUndefined()
  })
})

describe('SplitBillWizard ② struk', () => {
  async function toStep2() {
    const w = await mountWizard()
    await addPeople(w, 'Andi', 'Sinta')
    await next(w).trigger('click')
    return w
  }

  it('reads the photo once even when it fires twice, then fills place, date, items and charges', async () => {
    const w = await toStep2()
    const input = w.find('[data-test="photo"]')
    Object.defineProperty(input.element, 'files', { value: [new File(['x'], 'struk.jpg', { type: 'image/jpeg' })], configurable: true })
    await input.trigger('change')
    await input.trigger('change')
    await flushPromises()
    expect(api.post.mock.calls.filter(([u]) => u === '/split-bills/scan')).toHaveLength(1)
    expect(w.find('[data-test="place"]').element.value).toBe('Sushi Tei')
    expect(w.find('[data-test="date"]').element.value).toBe('2026-11-14')
    expect(w.findAll('[data-test="item"]').map((r) => r.text())).toEqual(['1×Salmon SashimiRp68.000', '4×Ocha@ Rp8.000Rp32.000'])
    expect(w.find('[data-test="match"]').text()).toContain('total cocok sama struk')
    expect(w.find('[data-test="charge-discount"]').text()).toContain('−Rp10.000')
    expect(w.find('[data-test="grand"]').text()).toContain('Rp103.950')
  })

  it('warns when the total does not add up', async () => {
    const w = await toStep2()
    api.post.mockImplementationOnce(async () => ({ ...read, matches: false, difference: 50 }))
    await photo(w)
    expect(w.find('[data-test="match"]').text()).toBe('Beda Rp50 sama total struk, cek lagi ya')
  })

  it('shows the server message when reading fails and still lets you type items', async () => {
    const w = await toStep2()
    api.post.mockRejectedValueOnce({ status: 502, message: 'Struknya nggak kebaca, coba foto lagi atau ketik sendiri ya.' })
    await photo(w)
    expect(w.find('[role="alert"]').text()).toBe('Struknya nggak kebaca, coba foto lagi atau ketik sendiri ya.')
    await w.find('[data-test="manual"]').trigger('click')
    expect(w.find('[role="alert"]').exists()).toBe(false)
    expect(next(w).attributes('disabled')).toBeDefined()
    await w.find('[data-test="add-item"]').trigger('click')
    await type(w, '[data-test="sheet-name"]', 'Nasi goreng')
    await type(w, '[data-test="sheet-qty"]', '2')
    await type(w, '[data-test="sheet-price"]', '25000')
    expect(w.find('[data-test="sheet-price"]').element.value).toBe('25.000')
    await w.find('[data-test="sheet-save"]').trigger('click')
    expect(w.findAll('[data-test="item"]').map((r) => r.text())).toEqual(['2×Nasi goreng@ Rp25.000Rp50.000'])
    expect(next(w).attributes('disabled')).toBeUndefined()
  })

  it('edits and deletes an item, and changes a charge', async () => {
    const w = await toStep2()
    await photo(w)
    await w.findAll('[data-test="item"]')[1].trigger('click')
    await type(w, '[data-test="sheet-price"]', '9000')
    await w.find('[data-test="sheet-save"]').trigger('click')
    expect(w.findAll('[data-test="item"]')[1].text()).toContain('Rp36.000')
    await w.findAll('[data-test="item"]')[0].trigger('click')
    await w.find('[data-test="sheet-delete"]').trigger('click')
    expect(w.findAll('[data-test="item"]')).toHaveLength(1)
    await w.find('[data-test="charge-service"]').trigger('click')
    await type(w, '[data-test="sheet-price"]', '0')
    await w.find('[data-test="sheet-save"]').trigger('click')
    expect(w.find('[data-test="charge-service"]').text()).toContain('Rp0')
  })
})

describe('SplitBillWizard ③ bagi item', () => {
  async function toStep3() {
    const w = await mountWizard()
    await addPeople(w, 'Andi', 'Sinta')
    await next(w).trigger('click')
    await photo(w)
    await next(w).trigger('click')
    return w
  }

  it('assigns items to the picked person, shares items between people, and shows live totals', async () => {
    const w = await toStep3()
    expect(w.find('[data-test="save"]').attributes('disabled')).toBeDefined()
    expect(w.find('[data-test="dock"]').text()).toContain('2 item belum ada yang punya')
    await w.find('[data-test="who"][data-index="1"]').trigger('click')
    await w.find('[data-test="assign"][data-index="0"]').trigger('click')
    await w.find('[data-test="rest"]').trigger('click')
    expect(w.find('[data-test="dock"]').text()).toContain('Semua item udah ada yang punya 🎉')
    const draft = w.vm.draft()
    const expected = computeShares(draft).shares.map((s) => s.total)
    expect(w.findAll('[data-test="who"]').map((c) => c.find('.n').text())).toEqual(expected.map((n) => `Rp${n.toLocaleString('id-ID')}`))
    await w.find('[data-test="assign"][data-index="0"]').trigger('click')
    expect(w.find('[data-test="save"]').attributes('disabled')).toBeDefined()
  })

  it('saves once even when tapped twice and hands the bill back', async () => {
    const w = await toStep3()
    await w.find('[data-test="rest"]').trigger('click')
    await w.find('[data-test="save"]').trigger('click')
    await w.find('[data-test="save"]').trigger('click')
    await flushPromises()
    const saves = api.post.mock.calls.filter(([u]) => u === '/split-bills')
    expect(saves).toHaveLength(1)
    const body = saves[0][1]
    expect(body).toMatchObject({ place: 'Sushi Tei', spentOn: '2026-11-14', discount: 10000, service: 4500, tax: 9450, other: 0 })
    expect(body.people.map((p) => [p.name, p.me])).toEqual([['Gue', true], ['Andi', false], ['Sinta', false]])
    expect(body.items.every((it) => it.who.length === 3)).toBe(true)
    expect(w.emitted('saved')[0][0].id).toBe(9)
  })
})

describe('SplitBillWizard — ubah', () => {
  it('starts filled from the saved bill, keeps ids, and saves with PUT', async () => {
    const bill = {
      id: 4, place: 'Kopi', emoji: '☕', spentOn: '2026-11-12', discount: 0, service: 0, tax: 0, other: 0,
      people: [{ id: 'me', name: 'Gue', me: true, paid: true }, { id: 'p1', name: 'Andi', me: false, paid: true }],
      items: [{ id: 'i1', name: 'Kopi susu', qty: 2, price: 24000, who: ['me', 'p1'] }],
    }
    const w = await mountWizard({ bill })
    expect(chips(w)).toEqual(['Gue', 'Andi'])
    await next(w).trigger('click')
    expect(w.findAll('[data-test="item"]')).toHaveLength(1)
    await next(w).trigger('click')
    await w.find('[data-test="save"]').trigger('click')
    await flushPromises()
    expect(api.put).toHaveBeenCalledWith('/split-bills/4', expect.objectContaining({ place: 'Kopi', people: [{ id: 'me', name: 'Gue', me: true }, { id: 'p1', name: 'Andi', me: false }] }))
  })
})
