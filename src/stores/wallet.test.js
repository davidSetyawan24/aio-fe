import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/lib/api.js'
import { setWalletApi, useWalletStore } from './wallet.js'

const cash = { id: 1, kind: 'cash', bank: null, name: 'Cash', favorite: true }
const jago = { id: 2, kind: 'debit', bank: 'Jago', name: 'Jago Utama', favorite: false }

function fakeApi(overrides = {}) {
  return {
    get: vi.fn(async () => ({ sources: [cash, jago] })),
    post: vi.fn(async (url, body) => ({ source: { id: 9, ...body } })),
    patch: vi.fn(async (url, body) => ({ source: { ...jago, ...body } })),
    del: vi.fn(async () => null),
    ...overrides,
  }
}

beforeEach(() => setActivePinia(createPinia()))

describe('wallet store', () => {
  it('loads the sources', async () => {
    const api = fakeApi()
    setWalletApi(api)
    const store = useWalletStore()
    await store.load()
    expect(api.get).toHaveBeenCalledWith('/payment-sources')
    expect(store.items).toEqual([cash, jago])
    expect(store.byId(2)).toEqual(jago)
  })

  it('adds, edits and removes, then reloads the list in server order', async () => {
    const api = fakeApi()
    setWalletApi(api)
    const store = useWalletStore()
    await store.create({ kind: 'debit', bank: 'BCA', name: 'BCA Pribadi' })
    expect(api.post).toHaveBeenCalledWith('/payment-sources', { kind: 'debit', bank: 'BCA', name: 'BCA Pribadi' })
    await store.update(2, { name: 'Jago' })
    expect(api.patch).toHaveBeenCalledWith('/payment-sources/2', { name: 'Jago' })
    await store.remove(2)
    expect(api.del).toHaveBeenCalledWith('/payment-sources/2')
    expect(api.get).toHaveBeenCalledTimes(3)
  })

  it('stars right away and rolls back when saving fails', async () => {
    const api = fakeApi({ patch: vi.fn(async () => { throw new ApiError('Nggak bisa nyambung ke server.', 0) }) })
    setWalletApi(api)
    const store = useWalletStore()
    await store.load()
    const saving = store.toggleFavorite(2)
    expect(store.byId(2).favorite).toBe(true)
    await expect(saving).rejects.toThrow('Nggak bisa nyambung ke server.')
    expect(store.byId(2).favorite).toBe(false)
    expect(api.patch).toHaveBeenCalledWith('/payment-sources/2', { favorite: true })
  })
})

describe('wallet store — double tap', () => {
  // Review 14/11: tap ⭐ dobel ngirim dua PATCH barengan → bisa nyampe kebalik, layar & server beda.
  it('ignores a second star tap while the first is still saving', async () => {
    let finish
    const api = fakeApi({ patch: vi.fn(() => new Promise((r) => (finish = r))) })
    setWalletApi(api)
    const store = useWalletStore()
    await store.load()
    const first = store.toggleFavorite(2)
    await store.toggleFavorite(2)
    finish({ source: { ...jago, favorite: true } })
    await first
    expect(api.patch).toHaveBeenCalledTimes(1)
    expect(store.byId(2).favorite).toBe(true)
  })
})
