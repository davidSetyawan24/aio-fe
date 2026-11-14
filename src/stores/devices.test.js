import { createPinia, setActivePinia } from 'pinia'
import { displayName, setDevicesApi, useDevicesStore } from './devices.js'

const iphone = { id: 1, name: null, kind: 'iPhone', browser: 'Safari', createdAt: '2026-11-01T00:00:00Z', lastUsedAt: '2026-11-14T00:00:00Z', current: true }
const ipad = { id: 2, name: 'iPad kerja', kind: 'iPad', browser: 'Safari', createdAt: '2026-11-02T00:00:00Z', lastUsedAt: '2026-11-13T00:00:00Z', current: false }

function fakeApi() {
  return {
    get: vi.fn(async () => ({ devices: [iphone, ipad] })),
    patch: vi.fn(async (url, body) => ({ device: { ...ipad, name: body.name || null } })),
    del: vi.fn(async () => null),
  }
}

beforeEach(() => setActivePinia(createPinia()))

describe('devices store', () => {
  it('loads the list', async () => {
    const api = fakeApi()
    setDevicesApi(api)
    const store = useDevicesStore()
    await store.load()
    expect(api.get).toHaveBeenCalledWith('/auth/devices')
    expect(store.items).toEqual([iphone, ipad])
    expect(store.byId(2)).toEqual(ipad)
  })

  it('renames and updates the item in place', async () => {
    const api = fakeApi()
    setDevicesApi(api)
    const store = useDevicesStore()
    await store.load()
    const updated = await store.rename(2, 'iPad rumah')
    expect(api.patch).toHaveBeenCalledWith('/auth/devices/2', { name: 'iPad rumah' })
    expect(updated.name).toBe('iPad rumah')
    expect(store.byId(2).name).toBe('iPad rumah')
  })

  it('kills a device and drops it from the list', async () => {
    const api = fakeApi()
    setDevicesApi(api)
    const store = useDevicesStore()
    await store.load()
    await store.kill(2)
    expect(api.del).toHaveBeenCalledWith('/auth/devices/2')
    expect(store.items).toEqual([iphone])
  })
})

describe('displayName', () => {
  it('uses the custom name, or the kind', () => {
    expect(displayName(ipad)).toBe('iPad kerja')
    expect(displayName(iphone)).toBe('iPhone')
  })
})
