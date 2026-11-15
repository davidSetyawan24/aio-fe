import { createPinia, setActivePinia } from 'pinia'
import { setSplitBillsApi, useSplitBillsStore } from './splitBills.js'

const bill = { id: 7, place: 'Sushi Tei', people: [], items: [], shares: [] }
const summary = { outstanding: 0, waitingCount: 0, unpaidPeople: [], bills: [] }

let api
beforeEach(() => {
  setActivePinia(createPinia())
  api = {
    get: vi.fn(async (url) => (url === '/split-bills' ? summary : { bill })),
    post: vi.fn(async (url) => (url === '/split-bills/scan' ? { items: [] } : { bill })),
    put: vi.fn(async () => ({ bill: { ...bill, place: 'Baru' } })),
    patch: vi.fn(async () => ({ bill: { ...bill, place: 'Lunas' } })),
    del: vi.fn(async () => null),
  }
  setSplitBillsApi(api)
})

describe('splitBills store', () => {
  it('loads the list and one bill', async () => {
    const store = useSplitBillsStore()
    await store.load()
    expect(store.summary).toEqual(summary)
    await store.loadOne(7)
    expect(api.get).toHaveBeenCalledWith('/split-bills/7')
    expect(store.byId(7)).toEqual(bill)
  })

  it('creates, updates, marks paid and removes — refreshing the list behind the scenes', async () => {
    const store = useSplitBillsStore()
    expect(await store.create({ place: 'x' })).toEqual(bill)
    expect(api.post).toHaveBeenCalledWith('/split-bills', { place: 'x' })
    await store.update(7, { place: 'Baru' })
    expect(api.put).toHaveBeenCalledWith('/split-bills/7', { place: 'Baru' })
    await store.setPaid(7, 'andi', true)
    expect(api.patch).toHaveBeenCalledWith('/split-bills/7/people/andi', { paid: true })
    expect(store.byId(7).place).toBe('Lunas')
    await store.remove(7)
    expect(api.del).toHaveBeenCalledWith('/split-bills/7')
    expect(store.byId(7)).toBeDefined()
    store.forget(7)
    expect(store.byId(7)).toBeUndefined()
    expect(api.get.mock.calls.filter(([u]) => u === '/split-bills').length).toBeGreaterThanOrEqual(4)
  })

  it('sends a receipt photo as form data with a long timeout', async () => {
    const store = useSplitBillsStore()
    const file = new Blob(['x'], { type: 'image/jpeg' })
    await store.scan(file)
    const [url, body, opts] = api.post.mock.calls[0]
    expect(url).toBe('/split-bills/scan')
    expect(body).toBeInstanceOf(FormData)
    expect(body.get('photo')).toBeTruthy()
    expect(opts).toEqual({ timeout: 60000 })
  })
})
