import { handleSessionExpired } from './sessionExpired.js'

function setup(status, path) {
  const auth = { status, markGuest: vi.fn(() => (auth.status = 'guest')) }
  const router = { currentRoute: { value: { path, fullPath: path } }, replace: vi.fn() }
  return { auth, router }
}

describe('handleSessionExpired', () => {
  it('sends a logged-in user back to login and remembers the page', () => {
    const { auth, router } = setup('authed', '/tabs/duit')
    handleSessionExpired(auth, router)
    expect(auth.markGuest).toHaveBeenCalledTimes(1)
    expect(router.replace).toHaveBeenCalledWith({ path: '/login', query: { redirect: '/tabs/duit' } })
  })

  it('does nothing for a wrong password on the login page (not logged in yet)', () => {
    const { auth, router } = setup('guest', '/login')
    handleSessionExpired(auth, router)
    expect(auth.markGuest).not.toHaveBeenCalled()
    expect(router.replace).not.toHaveBeenCalled()
  })

  it('redirects only once when several requests fail with 401 at the same time', () => {
    const { auth, router } = setup('authed', '/tabs/home')
    handleSessionExpired(auth, router)
    handleSessionExpired(auth, router)
    handleSessionExpired(auth, router)
    expect(router.replace).toHaveBeenCalledTimes(1)
  })
})
