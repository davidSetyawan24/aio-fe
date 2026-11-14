import { ApiError } from './api.js'
import { loginMessage, retryAfterFromMessage } from './loginMessage.js'

describe('loginMessage', () => {
  it('shows the first field message on validation errors', () => {
    expect(loginMessage(new ApiError('Data tidak valid.', 422, { password: ['Password wajib diisi.'] }))).toBe('Password wajib diisi.')
  })
  it('falls back to the envelope message on 422 without fields', () => {
    expect(loginMessage(new ApiError('Data tidak valid.', 422, null))).toBe('Data tidak valid.')
  })
  it('shows the BE message for wrong credentials and lockout', () => {
    expect(loginMessage(new ApiError('Username atau password salah.', 401))).toBe('Username atau password salah.')
    expect(loginMessage(new ApiError('Terlalu banyak percobaan. Coba lagi dalam 42 detik.', 429))).toBe(
      'Terlalu banyak percobaan. Coba lagi dalam 42 detik.',
    )
  })
  it('explains an unreachable server', () => {
    expect(loginMessage(new ApiError('whatever', 0))).toBe('Nggak bisa nyambung ke server.')
  })
  it('uses a generic message for anything else', () => {
    expect(loginMessage(new ApiError('Terjadi kesalahan di server.', 500))).toBe('Ada yang error. Coba lagi ya.')
    expect(loginMessage(new Error('boom'))).toBe('Ada yang error. Coba lagi ya.')
  })
})

describe('retryAfterFromMessage', () => {
  it('reads the seconds from the lockout message', () => {
    expect(retryAfterFromMessage('Terlalu banyak percobaan. Coba lagi dalam 42 detik.')).toBe(42)
  })
  it('defaults to 60 when the number is missing', () => {
    expect(retryAfterFromMessage('Terlalu banyak percobaan.')).toBe(60)
  })
})
