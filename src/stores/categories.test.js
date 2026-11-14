import { createPinia, setActivePinia } from 'pinia'
import { setCategoriesApi, useCategoriesStore } from './categories.js'

const makan = { id: 1, name: 'Makan', emoji: '🍜', tint: '#FFE9D6' }
const ngopi = { id: 2, name: 'Ngopi', emoji: '☕', tint: '#FFF3B8' }

function fakeApi() {
  return {
    get: vi.fn(async () => ({ categories: [makan, ngopi] })),
    post: vi.fn(async (url, body) => ({ category: { id: 9, ...body } })),
    patch: vi.fn(async (url, body) => ({ category: { ...makan, ...body } })),
    del: vi.fn(async () => null),
  }
}

beforeEach(() => setActivePinia(createPinia()))

describe('categories store', () => {
  it('loads the active categories', async () => {
    const api = fakeApi()
    setCategoriesApi(api)
    const store = useCategoriesStore()
    await store.load()
    expect(api.get).toHaveBeenCalledWith('/expense-categories')
    expect(store.items).toEqual([makan, ngopi])
    expect(store.loaded).toBe(true)
    expect(store.byId('2')).toEqual(ngopi)
  })

  it('adds, edits and hides, reloading the list each time', async () => {
    const api = fakeApi()
    setCategoriesApi(api)
    const store = useCategoriesStore()
    const created = await store.create({ name: 'Hiburan', emoji: '🎬', tint: '#FFE0E6' })
    expect(created).toEqual({ id: 9, name: 'Hiburan', emoji: '🎬', tint: '#FFE0E6' })
    expect(api.post).toHaveBeenCalledWith('/expense-categories', { name: 'Hiburan', emoji: '🎬', tint: '#FFE0E6' })
    await store.update(1, { name: 'Makan siang' })
    expect(api.patch).toHaveBeenCalledWith('/expense-categories/1', { name: 'Makan siang' })
    await store.remove(1)
    expect(api.del).toHaveBeenCalledWith('/expense-categories/1')
    expect(api.get).toHaveBeenCalledTimes(3)
  })

  it('remembers the newest category once, for the Catat screen to pick', async () => {
    setCategoriesApi(fakeApi())
    const store = useCategoriesStore()
    expect(store.takeJustCreated()).toBeNull()
    await store.create({ name: 'Hiburan', emoji: '🎬', tint: '#FFE0E6' })
    expect(store.takeJustCreated()).toBeNull()
    await store.create({ name: 'Hiburan', emoji: '🎬', tint: '#FFE0E6' }, { forCatat: true })
    expect(store.takeJustCreated()).toBe(9)
    expect(store.takeJustCreated()).toBeNull()
  })
})
