import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/lib/api.js'
import { isMainPage, setNotificationsApi, useNotificationsStore } from './notifications.js'

const n1 = { id: 1, type: 'keamanan', title: 'iPad baru login ke akun lo', body: 'x', link: '/tabs/profil', read: false, createdAt: '2026-11-14T01:00:00Z' }
const n2 = { id: 2, type: 'keamanan', title: 'Mac baru login ke akun lo', body: 'y', link: null, read: true, createdAt: '2026-11-13T01:00:00Z' }
const settings = { tagihan: true, todo: true, agenda: true, keamanan: true }

function fakeApi(overrides = {}) {
  return {
    get: vi.fn(async (url) => {
      if (url === '/notifications') return { items: [n1, n2], unread: 1 }
      if (url === '/notifications/unread-count') return { unread: 4 }
      if (url === '/notifications/settings') return { settings }
      throw new Error(url)
    }),
    post: vi.fn(async (url) => (url.endsWith('read-all') ? { unread: 0 } : { unread: 0 })),
    patch: vi.fn(async (url, body) => ({ settings: { ...settings, ...body } })),
    ...overrides,
  }
}

beforeEach(() => setActivePinia(createPinia()))

describe('notifications store', () => {
  it('refreshes the bell count', async () => {
    setNotificationsApi(fakeApi())
    const store = useNotificationsStore()
    await store.refreshCount()
    expect(store.unread).toBe(4)
  })

  it('loads the inbox', async () => {
    setNotificationsApi(fakeApi())
    const store = useNotificationsStore()
    await store.load()
    expect(store.items).toEqual([n1, n2])
    expect(store.unread).toBe(1)
    expect(store.loaded).toBe(true)
  })

  it('marks one as read and lowers the count', async () => {
    const api = fakeApi()
    setNotificationsApi(api)
    const store = useNotificationsStore()
    await store.load()
    await store.markRead(1)
    expect(api.post).toHaveBeenCalledWith('/notifications/1/read')
    expect(store.items[0].read).toBe(true)
    expect(store.unread).toBe(0)
  })

  it('skips the request for one already read', async () => {
    const api = fakeApi()
    setNotificationsApi(api)
    const store = useNotificationsStore()
    await store.load()
    await store.markRead(2)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('marks everything as read', async () => {
    const api = fakeApi()
    setNotificationsApi(api)
    const store = useNotificationsStore()
    await store.load()
    await store.markAllRead()
    expect(api.post).toHaveBeenCalledWith('/notifications/read-all')
    expect(store.items.every((n) => n.read)).toBe(true)
    expect(store.unread).toBe(0)
  })

  it('saves a setting right away and rolls back if it fails', async () => {
    const api = fakeApi({ patch: vi.fn(async () => { throw new ApiError('Nggak bisa nyambung ke server.', 0) }) })
    setNotificationsApi(api)
    const store = useNotificationsStore()
    await store.loadSettings()
    await expect(store.saveSetting('todo', false)).rejects.toThrow('Nggak bisa nyambung ke server.')
    expect(api.patch).toHaveBeenCalledWith('/notifications/settings', { todo: false })
    expect(store.settings.todo).toBe(true)
  })

  it('keeps the new setting when saving works', async () => {
    setNotificationsApi(fakeApi())
    const store = useNotificationsStore()
    await store.loadSettings()
    await store.saveSetting('keamanan', false)
    expect(store.settings.keamanan).toBe(false)
  })
})

describe('dari push & angka di ikon', () => {
  afterEach(() => {
    delete navigator.setAppBadge
    delete navigator.clearAppBadge
  })

  it('tap notif push → ditandain dibaca walau daftar belum dimuat; angka ikon ikut', async () => {
    navigator.setAppBadge = vi.fn(async () => {})
    navigator.clearAppBadge = vi.fn(async () => {})
    const api = fakeApi({ post: vi.fn(async () => ({ unread: 2 })) })
    setNotificationsApi(api)
    const store = useNotificationsStore()
    await store.readFromPush(5)
    expect(api.post).toHaveBeenCalledWith('/notifications/5/read')
    expect(store.unread).toBe(2)
    expect(navigator.setAppBadge).toHaveBeenLastCalledWith(2)
  })

  it('angka lonceng berubah → angka ikon ikut (0 = dihapus)', async () => {
    navigator.setAppBadge = vi.fn(async () => {})
    navigator.clearAppBadge = vi.fn(async () => {})
    setNotificationsApi(fakeApi())
    const store = useNotificationsStore()
    await store.refreshCount()
    expect(navigator.setAppBadge).toHaveBeenLastCalledWith(4)
    await store.markAllRead()
    expect(navigator.clearAppBadge).toHaveBeenCalled()
  })
})

describe('isMainPage', () => {
  it('only counts the tab root pages', () => {
    for (const p of ['/tabs/home', '/tabs/uang', '/tabs/agenda', '/tabs/menu', '/tabs/profil']) expect(isMainPage(p), p).toBe(true)
    for (const p of ['/tabs/profil/password', '/tabs/menu/tagihan', '/tabs/menu/duit', '/tabs/notifikasi', '/login']) expect(isMainPage(p), p).toBe(false)
  })
})
