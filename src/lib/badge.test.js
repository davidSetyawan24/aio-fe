import { syncBadge } from './badge.js'

describe('syncBadge', () => {
  it('ada yang belum dibaca → angka di ikon; 0 → dihapus', async () => {
    const nav = { setAppBadge: vi.fn(async () => {}), clearAppBadge: vi.fn(async () => {}) }
    await syncBadge(3, nav)
    expect(nav.setAppBadge).toHaveBeenCalledWith(3)
    await syncBadge(0, nav)
    expect(nav.clearAppBadge).toHaveBeenCalledTimes(1)
  })
  it('browser tanpa badge / error → diem', async () => {
    await expect(syncBadge(2, {})).resolves.toBeUndefined()
    await expect(syncBadge(2, { setAppBadge: async () => { throw new Error('ditolak') } })).resolves.toBeUndefined()
  })
})
