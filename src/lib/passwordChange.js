export const MIN_PASSWORD_LENGTH = 8

export const PASSWORD_CHANGED_MESSAGE = 'Password udah diganti. Device lain udah ke-logout.'

/**
 * Cek isian form ganti password sebelum dikirim. Balikin pesan error pertama, atau null kalau aman.
 * Sengaja nggak di-trim: spasi di awal/akhir itu bagian dari password.
 */
export function validatePasswordChange({ current, next, confirm }) {
  if (!current) return 'Password lama wajib diisi.'
  if (!next) return 'Password baru wajib diisi.'
  if (next.length < MIN_PASSWORD_LENGTH) return `Password baru minimal ${MIN_PASSWORD_LENGTH} karakter.`
  if (confirm !== next) return 'Ulangi password-nya belum sama.'
  if (next === current) return 'Password baru nggak boleh sama kayak yang lama.'
  return null
}

/** Pesan yang ditampilin dari ApiError: pesan field pertama kalau ada (422 validasi), selain itu pesannya langsung. */
export function apiErrorMessage(err) {
  const firstField = err?.fields ? Object.values(err.fields).flat().find((m) => typeof m === 'string') : null
  return firstField ?? err?.message ?? 'Ada yang error. Coba lagi ya.'
}
