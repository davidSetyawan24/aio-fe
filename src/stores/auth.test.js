import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/lib/api.js'
import { setAuthApi, useAuthStore } from './auth.js'

const david = { id: 1, username: 'david', name: 'David Setyawan' }

/** Api palsu: tiap method bisa diatur balikannya, dan jumlah panggilan kecatet. */
function fakeApi({ get, post } = {}) {
  return {
    get: vi.fn(get ?? (async () => ({ user: david }))),
    post: vi.fn(post ?? (async () => ({ user: david }))),
  }
}

beforeEach(() => setActivePinia(createPinia()))

describe('check', () => {
  it('becomes authed when /auth/me answers', async () => {
    setAuthApi(fakeApi())
    const auth = useAuthStore()
    await auth.check()
    expect(auth.status).toBe('authed')
    expect(auth.user).toEqual(david)
  })

  it('becomes guest on 401', async () => {
    setAuthApi(fakeApi({ get: async () => { throw new ApiError('Belum login atau sesi sudah habis.', 401) } }))
    const auth = useAuthStore()
    await auth.check()
    expect(auth.status).toBe('guest')
  })

  it('becomes offline when the server is unreachable or broken', async () => {
    setAuthApi(fakeApi({ get: async () => { throw new ApiError('Nggak bisa nyambung ke server.', 0) } }))
    const auth = useAuthStore()
    await auth.check()
    expect(auth.status).toBe('offline')
    setAuthApi(fakeApi({ get: async () => { throw new ApiError('x', 503) } }))
    await auth.check()
    expect(auth.status).toBe('offline')
  })

  it('shares one request between concurrent checks', async () => {
    const api = fakeApi()
    setAuthApi(api)
    const auth = useAuthStore()
    await Promise.all([auth.check(), auth.check()])
    expect(api.get).toHaveBeenCalledTimes(1)
  })
})

describe('login', () => {
  it('sends only one request when tapped twice quickly', async () => {
    const api = fakeApi()
    setAuthApi(api)
    const auth = useAuthStore()
    const first = auth.login('david', 'rahasia-123')
    const second = auth.login('david', 'rahasia-123')
    expect(auth.loggingIn).toBe(true)
    await Promise.all([first, second])
    expect(api.post).toHaveBeenCalledTimes(1)
    expect(api.post).toHaveBeenCalledWith('/auth/login', { username: 'david', password: 'rahasia-123' })
    expect(auth.status).toBe('authed')
    expect(auth.loggingIn).toBe(false)
  })

  it('rethrows the ApiError and keeps status on failure', async () => {
    setAuthApi(fakeApi({ post: async () => { throw new ApiError('Username atau password salah.', 401) } }))
    const auth = useAuthStore()
    auth.status = 'guest'
    const err = await auth.login('david', 'salah').catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(401)
    expect(auth.status).toBe('guest')
    expect(auth.loggingIn).toBe(false)
  })
})

describe('logout', () => {
  it('becomes guest even when the request fails', async () => {
    setAuthApi(fakeApi({ post: async () => { throw new ApiError('Nggak bisa nyambung ke server.', 0) } }))
    const auth = useAuthStore()
    auth.user = david
    auth.status = 'authed'
    await auth.logout()
    expect(auth.status).toBe('guest')
    expect(auth.user).toBeNull()
  })
})

it('initials come from the first letter of the name', () => {
  const auth = useAuthStore()
  auth.user = david
  expect(auth.initials).toBe('D')
})

it('markGuest clears the user', () => {
  const auth = useAuthStore()
  auth.user = david
  auth.status = 'authed'
  auth.markGuest()
  expect(auth.status).toBe('guest')
  expect(auth.user).toBeNull()
})

describe('changePassword', () => {
  const authedStore = () => {
    const auth = useAuthStore()
    auth.user = david
    auth.status = 'authed'
    return auth
  }

  it('posts both passwords and flags while saving', async () => {
    let finish
    const api = fakeApi({ post: () => new Promise((r) => (finish = r)) })
    setAuthApi(api)
    const auth = authedStore()
    const saving = auth.changePassword('lama-123456', 'baru-123456')
    expect(api.post).toHaveBeenCalledWith('/auth/password', { currentPassword: 'lama-123456', newPassword: 'baru-123456' })
    expect(auth.changingPassword).toBe(true)
    finish(null)
    await saving
    expect(auth.changingPassword).toBe(false)
  })

  it('throws a wrong current password without logging out', async () => {
    const wrong = new ApiError('Password lama salah.', 422)
    setAuthApi(fakeApi({ post: async () => { throw wrong } }))
    const auth = authedStore()
    await expect(auth.changePassword('salah-123456', 'baru-123456')).rejects.toBe(wrong)
    expect(auth.status).toBe('authed')
    expect(auth.user).toEqual(david)
    expect(auth.changingPassword).toBe(false)
  })

  it('sends only one request when called twice quickly', async () => {
    let finish
    const api = fakeApi({ post: () => new Promise((r) => (finish = r)) })
    setAuthApi(api)
    const auth = authedStore()
    const first = auth.changePassword('lama-123456', 'baru-123456')
    const second = auth.changePassword('lama-123456', 'baru-123456')
    finish(null)
    await Promise.all([first, second])
    expect(api.post).toHaveBeenCalledTimes(1)
  })
})
