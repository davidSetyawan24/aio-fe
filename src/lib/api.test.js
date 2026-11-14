import { AxiosError } from 'axios'
import { ApiError, createApi, resolveApiBase } from './api.js'

/** Adapter palsu: balikin respons kayak BE beneran, tanpa jaringan. */
function fakeAdapter(status, body, seen = []) {
  return async (config) => {
    seen.push(config)
    const response = { status, data: body, headers: {}, config, statusText: '' }
    if (status === 0) throw new AxiosError('Network Error', 'ERR_NETWORK', config, {})
    if (status >= 400) throw new AxiosError('fail', 'ERR_BAD_RESPONSE', config, {}, response)
    return response
  }
}

describe('resolveApiBase', () => {
  it('follows the hostname the app was opened from (phone via laptop IP)', () => {
    expect(resolveApiBase({}, { protocol: 'http:', hostname: '192.168.8.124' })).toBe('http://192.168.8.124:3000')
  })
  it('uses VITE_API_URL when set, without trailing slash', () => {
    expect(resolveApiBase({ VITE_API_URL: 'https://aiobe.davidsetyawan.com/' }, { protocol: 'https:', hostname: 'x' })).toBe(
      'https://aiobe.davidsetyawan.com',
    )
  })
})

describe('createApi', () => {
  it('unwraps the envelope and returns data', async () => {
    const api = createApi({ baseURL: 'http://x', adapter: fakeAdapter(200, { success: true, message: 'Login berhasil.', data: { user: { id: 1 } } }) })
    await expect(api.post('/auth/login', { username: 'a' })).resolves.toEqual({ user: { id: 1 } })
  })

  it('sends cookies with every request', async () => {
    const seen = []
    const api = createApi({ baseURL: 'http://x', adapter: fakeAdapter(200, { success: true, message: '', data: null }, seen) })
    await api.get('/auth/me')
    expect(seen[0].withCredentials).toBe(true)
  })

  it('turns a validation error into ApiError with field messages', async () => {
    const api = createApi({
      baseURL: 'http://x',
      adapter: fakeAdapter(422, { success: false, message: 'Data tidak valid.', data: { password: ['Password wajib diisi.'] } }),
    })
    const err = await api.post('/auth/login', {}).catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(422)
    expect(err.message).toBe('Data tidak valid.')
    expect(err.fields.password[0]).toBe('Password wajib diisi.')
  })

  it('calls onUnauthorized once on 401, then rejects', async () => {
    const onUnauthorized = vi.fn()
    const api = createApi({
      baseURL: 'http://x',
      onUnauthorized,
      adapter: fakeAdapter(401, { success: false, message: 'Belum login atau sesi sudah habis.', data: null }),
    })
    const err = await api.get('/auth/me').catch((e) => e)
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
    expect(err.status).toBe(401)
    expect(err.message).toBe('Belum login atau sesi sudah habis.')
  })

  it('gives up after 15 seconds instead of waiting forever', async () => {
    const seen = []
    const api = createApi({ baseURL: 'http://x', adapter: fakeAdapter(200, { success: true, message: '', data: null }, seen) })
    await api.get('/auth/me')
    expect(seen[0].timeout).toBe(15000)
  })

  it('treats a timed-out request as an unreachable server', async () => {
    const api = createApi({
      baseURL: 'http://x',
      adapter: async (config) => {
        throw new AxiosError('timeout of 15000ms exceeded', 'ECONNABORTED', config, {})
      },
    })
    const err = await api.get('/auth/me').catch((e) => e)
    expect(err.status).toBe(0)
    expect(err.message).toBe('Nggak bisa nyambung ke server.')
  })

  it('reports an unreachable server as status 0 in Indonesian', async () => {
    const api = createApi({ baseURL: 'http://x', adapter: fakeAdapter(0) })
    const err = await api.get('/health').catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(0)
    expect(err.message).toBe('Nggak bisa nyambung ke server.')
  })

  it('falls back to a generic message when the error body is not an envelope', async () => {
    const api = createApi({ baseURL: 'http://x', adapter: fakeAdapter(502, '<html>Bad Gateway</html>') })
    const err = await api.get('/health').catch((e) => e)
    expect(err.status).toBe(502)
    expect(err.message).toBe('Ada yang error di server. Coba lagi ya.')
  })
})

describe('createApi extras', () => {
  it('adds the device headers to every request', async () => {
    const seen = []
    const api = createApi({
      baseURL: 'http://x',
      adapter: fakeAdapter(200, { success: true, message: '', data: null }, seen),
      extraHeaders: () => ({ 'X-AIO-Device': 'kunci', 'X-AIO-Device-Kind': 'iPad' }),
    })
    await api.get('/auth/me')
    expect(seen[0].headers['X-AIO-Device']).toBe('kunci')
    expect(seen[0].headers['X-AIO-Device-Kind']).toBe('iPad')
  })

  it('has patch and del', async () => {
    const seen = []
    const api = createApi({ baseURL: 'http://x', adapter: fakeAdapter(200, { success: true, message: '', data: { ok: 1 } }, seen) })
    await expect(api.patch('/auth/devices/2', { name: 'a' })).resolves.toEqual({ ok: 1 })
    await api.del('/auth/devices/2')
    expect(seen.map((c) => c.method)).toEqual(['patch', 'delete'])
  })

  it('has put with a body', async () => {
    const seen = []
    const api = createApi({ baseURL: 'http://x', adapter: fakeAdapter(200, { success: true, message: '', data: { ok: 1 } }, seen) })
    await expect(api.put('/budgets/3', { amount: 1 })).resolves.toEqual({ ok: 1 })
    expect(seen[0].method).toBe('put')
    expect(JSON.parse(seen[0].data)).toEqual({ amount: 1 })
  })
})
