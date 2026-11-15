import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { computeShares } from '@/lib/splitBill.js'
import { setSplitBillsApi, useSplitBillsStore } from '@/stores/splitBills.js'
import SplitBillDetail from './SplitBillDetail.vue'

const sheet = vi.hoisted(() => ({ present: vi.fn(), onDidDismiss: vi.fn() }))
const sheetCreate = vi.hoisted(() => vi.fn())
const toastCreate = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  actionSheetController: { create: sheetCreate },
  toastController: { create: toastCreate },
}))
const shareBillImage = vi.hoisted(() => vi.fn(async () => 'shared'))
vi.mock('@/lib/billImage.js', () => ({ shareBillImage }))

const input = {
  people: [
    { id: 'me', name: 'Gue', me: true },
    { id: 'andi', name: 'Andi', me: false },
    { id: 'sinta', name: 'Sinta', me: false },
  ],
  items: [
    { id: 'a', name: 'Pizza', qty: 1, price: 100000, who: ['me', 'andi', 'sinta'] },
    { id: 'b', name: 'Es teh', qty: 1, price: 10000, who: ['andi'] },
  ],
  discount: 0, service: 0, tax: 11000, other: 0,
}
const makeBill = (paidAndi = false) => {
  const c = computeShares(input)
  return {
    id: 7, place: 'Pizza Hut', emoji: '🍕', spentOn: '2026-11-14', ...input, ...c,
    people: input.people.map((p) => ({ ...p, paid: p.me || (p.id === 'andi' && paidAndi), paidAt: null })),
    outstanding: c.shares.filter((s) => s.personId !== 'me' && !(paidAndi && s.personId === 'andi')).reduce((a, s) => a + s.total, 0),
  }
}

let api
const mounted = []
async function mountDetail(bill = makeBill()) {
  api = { get: vi.fn(async () => ({ outstanding: 0, waitingCount: 0, unpaidPeople: [], bills: [] })), patch: vi.fn(async () => ({ bill: makeBill(true) })), del: vi.fn(async () => null) }
  setSplitBillsApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  useSplitBillsStore().keep(bill)
  const w = mount(SplitBillDetail, { props: { billId: 7 }, global: { plugins: [pinia] }, attachTo: document.body })
  mounted.push(w)
  await flushPromises()
  return w
}
const card = (w, id) => w.find(`[data-test="person"][data-person="${id}"]`)

beforeEach(() => {
  toastCreate.mockReset().mockResolvedValue({ present: vi.fn() })
  sheet.onDidDismiss.mockReset().mockResolvedValue({ data: 'delete' })
  sheetCreate.mockReset().mockResolvedValue(sheet)
  window.open = vi.fn()
})
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  document.body.innerHTML = ''
})

describe('SplitBillDetail', () => {
  it('shows what is still owed and each person\'s share', async () => {
    const w = await mountDetail()
    expect(w.find('[data-test="owed"]').text()).toBe('Rp84.332')
    expect(card(w, 'me').text()).toContain('lo yang bayar ke kasir')
    expect(card(w, 'me').text()).toContain('Rp36.668')
    expect(card(w, 'andi').text()).toContain('belum bayar')
    expect(card(w, 'andi').find('[data-test="total"]').text()).toBe('Rp47.666')
  })

  it('separates items from the charges, shows only charges that exist, and the rounding on "Gue"', async () => {
    const w = await mountDetail()
    const andi = card(w, 'andi')
    expect(andi.findAll('[data-test="line"]').map((l) => l.text())).toEqual(['Pizza (bagi 3)Rp33.333', 'Es tehRp10.000'])
    expect(andi.findAll('hr')).toHaveLength(2)
    expect(andi.findAll('[data-test="charge"]').map((l) => l.text())).toEqual(['🧾 PajakRp4.333'])
    expect(card(w, 'me').find('[data-test="rounding"]').text()).toBe('PembulatanRp2')
    expect(card(w, 'andi').find('[data-test="rounding"]').exists()).toBe(false)
  })

  it('marks a friend paid once, even when tapped twice', async () => {
    const w = await mountDetail()
    const btn = card(w, 'andi').find('[data-test="paid"]')
    await btn.trigger('click')
    await btn.trigger('click')
    await flushPromises()
    expect(api.patch).toHaveBeenCalledTimes(1)
    expect(api.patch).toHaveBeenCalledWith('/split-bills/7/people/andi', { paid: true })
    expect(card(w, 'andi').text()).toContain('udah bayar ✓')
    expect(card(w, 'me').find('[data-test="paid"]').exists()).toBe(false)
  })

  it('opens WhatsApp with the message ready, and shares the picture', async () => {
    const w = await mountDetail()
    await card(w, 'andi').find('[data-test="wa"]').trigger('click')
    const url = window.open.mock.calls[0][0]
    expect(url.startsWith('https://api.whatsapp.com/send?text=')).toBe(true)
    expect(decodeURIComponent(url.split('text=')[1])).toContain('Total lo: *Rp47.666*')
    await w.find('[data-test="image"]').trigger('click')
    expect(shareBillImage).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }))
  })

  it('says so when the picture could not be made', async () => {
    const w = await mountDetail()
    shareBillImage.mockRejectedValueOnce(new Error('canvas'))
    await w.find('[data-test="image"]').trigger('click')
    await flushPromises()
    expect(w.find('[role="alert"]').text()).toBe('Gambarnya gagal dibikin, coba lagi ya.')
  })

  it('asks before deleting, then tells the page; edit asks the page too', async () => {
    const w = await mountDetail()
    await w.find('[data-test="edit"]').trigger('click')
    expect(w.emitted('edit')).toHaveLength(1)
    await w.find('[data-test="delete"]').trigger('click')
    await flushPromises()
    expect(sheetCreate).toHaveBeenCalledWith(expect.objectContaining({ header: 'Hapus split bill ini?' }))
    expect(api.del).toHaveBeenCalledWith('/split-bills/7')
    expect(w.emitted('deleted')).toHaveLength(1)
  })

  it('says everything is settled once nobody owes', async () => {
    const bill = makeBill(true)
    bill.people = bill.people.map((p) => ({ ...p, paid: true }))
    bill.outstanding = 0
    const w = await mountDetail(bill)
    expect(w.find('[data-test="owed"]').text()).toBe('Lunas 🎉')
  })
})
