import { ApiError } from '@/lib/api.js'
import { apiErrorMessage, validatePasswordChange } from './passwordChange.js'

const ok = { current: 'lama-123456', next: 'baru-123456', confirm: 'baru-123456' }

describe('validatePasswordChange', () => {
  it('needs the current password', () => {
    expect(validatePasswordChange({ ...ok, current: '' })).toBe('Password lama wajib diisi.')
  })

  it('needs a new password', () => {
    expect(validatePasswordChange({ ...ok, next: '', confirm: '' })).toBe('Password baru wajib diisi.')
  })

  it('needs at least 8 characters', () => {
    expect(validatePasswordChange({ ...ok, next: '1234567', confirm: '1234567' })).toBe('Password baru minimal 8 karakter.')
  })

  it('needs the repeat to match', () => {
    expect(validatePasswordChange({ ...ok, confirm: 'baru-12345' })).toBe('Ulangi password-nya belum sama.')
  })

  it('refuses the same password as before', () => {
    expect(validatePasswordChange({ current: 'sama-123456', next: 'sama-123456', confirm: 'sama-123456' })).toBe(
      'Password baru nggak boleh sama kayak yang lama.',
    )
  })

  it('accepts a valid change', () => {
    expect(validatePasswordChange(ok)).toBeNull()
  })

  it('counts spaces instead of trimming them', () => {
    expect(validatePasswordChange({ ...ok, next: '  1234567 ', confirm: '  1234567 ' })).toBeNull()
  })
})

describe('apiErrorMessage', () => {
  it('shows the first field message from a validation error', () => {
    const err = new ApiError('Data tidak valid.', 422, { newPassword: ['Password baru minimal 8 karakter.'] })
    expect(apiErrorMessage(err)).toBe('Password baru minimal 8 karakter.')
  })

  it('shows the message when there are no fields', () => {
    expect(apiErrorMessage(new ApiError('Password lama salah.', 422))).toBe('Password lama salah.')
  })
})
