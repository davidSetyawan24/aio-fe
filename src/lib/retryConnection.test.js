import { retryConnection } from './retryConnection.js'

function setup(statusAfterCheck, fullPath) {
  const [path, qs] = fullPath.split('?')
  const auth = { status: 'offline', check: vi.fn(async () => { auth.status = statusAfterCheck }) }
  const router = {
    currentRoute: { value: { path, fullPath, meta: path === '/login' ? { public: true } : {}, query: Object.fromEntries(new URLSearchParams(qs ?? '')) } },
    replace: vi.fn(async () => {}),
  }
  return { auth, router }
}

describe('retryConnection (tombol "Coba lagi")', () => {
  it('sends a guest on a protected page to login once the server is back', async () => {
    const { auth, router } = setup('guest', '/tabs/agenda')
    await retryConnection(auth, router)
    expect(auth.check).toHaveBeenCalledTimes(1)
    expect(router.replace).toHaveBeenCalledWith({ path: '/login', query: { redirect: '/tabs/agenda' } })
  })

  it('moves a logged-in user off the login page', async () => {
    const { auth, router } = setup('authed', '/login?redirect=/tabs/duit')
    await retryConnection(auth, router)
    expect(router.replace).toHaveBeenCalledWith({ path: '/tabs/duit' })
  })

  it('stays put when the user may already be on this page', async () => {
    const { auth, router } = setup('authed', '/tabs/duit')
    await retryConnection(auth, router)
    expect(router.replace).not.toHaveBeenCalled()
  })

  it('stays on the offline screen when the server is still down', async () => {
    const { auth, router } = setup('offline', '/tabs/duit')
    await retryConnection(auth, router)
    expect(router.replace).not.toHaveBeenCalled()
  })
})
