import { AWAY_LIMIT_MS, installPersonalLock, leavesPersonal } from './personalLock.js'

describe('leavesPersonal', () => {
  it('stays inside Data Pribadi', () => {
    expect(leavesPersonal('/tabs/menu/data-pribadi/dokumen/3', '/tabs/menu/data-pribadi')).toBe(false)
    expect(leavesPersonal('/tabs/menu/data-pribadi', '/tabs/menu/data-pribadi/alamat/baru')).toBe(false)
    expect(leavesPersonal('/tabs/home', '/tabs/menu/data-pribadi?dokumen=3')).toBe(false)
  })
  it('leaves it', () => {
    expect(leavesPersonal('/tabs/menu/data-pribadi', '/tabs/home')).toBe(true)
    expect(leavesPersonal('/tabs/menu/data-pribadi/dokumen/3', '/tabs/menu')).toBe(true)
    expect(leavesPersonal('/tabs/menu/data-pribadi?x=1', '/tabs/menu/duit')).toBe(true)
  })
  it('ignores moves elsewhere', () => {
    expect(leavesPersonal('/tabs/home', '/tabs/uang')).toBe(false)
    expect(leavesPersonal('/tabs/menu/data-pribadi-lain', '/tabs/home')).toBe(false)
  })
})

describe('installPersonalLock', () => {
  function setup() {
    let hook
    const router = { afterEach: (fn) => { hook = fn; return () => { hook = null } } }
    const store = { lock: vi.fn() }
    const doc = new EventTarget()
    doc.visibilityState = 'visible'
    let t = 1000
    const now = () => t
    const off = installPersonalLock({ router, store, doc, now })
    const go = (from, to) => hook?.({ path: to }, { path: from })
    const vis = (state, advance = 0) => { t += advance; doc.visibilityState = state; doc.dispatchEvent(new Event('visibilitychange')) }
    return { store, go, vis, off, hooked: () => Boolean(hook) }
  }

  it('locks when leaving but not when moving inside', () => {
    const { store, go } = setup()
    go('/tabs/menu/data-pribadi', '/tabs/menu/data-pribadi/dokumen/1')
    expect(store.lock).not.toHaveBeenCalled()
    go('/tabs/menu/data-pribadi/dokumen/1', '/tabs/home')
    expect(store.lock).toHaveBeenCalledTimes(1)
  })

  it('stays open after 4 minutes away but locks after 6', () => {
    const { store, vis } = setup()
    vis('hidden')
    vis('visible', 4 * 60_000)
    expect(store.lock).not.toHaveBeenCalled()
    vis('hidden')
    vis('visible', 6 * 60_000)
    expect(store.lock).toHaveBeenCalledTimes(1)
    expect(AWAY_LIMIT_MS).toBe(300_000)
  })

  it('can be removed', () => {
    const { store, vis, off, hooked } = setup()
    off()
    expect(hooked()).toBe(false)
    vis('hidden')
    vis('visible', 10 * 60_000)
    expect(store.lock).not.toHaveBeenCalled()
  })
})
