/** Pesan buat ditampilin di halaman login dari error BE / koneksi. */
export function loginMessage(err) {
  const status = err?.status
  if (status === 0) return 'Nggak bisa nyambung ke server.'
  if (status === 422) {
    const firstField = err.fields && Object.values(err.fields).flat()[0]
    return firstField || err.message
  }
  if (status === 401 || status === 429) return err.message
  return 'Ada yang error. Coba lagi ya.'
}

/** Ambil angka detik dari "… Coba lagi dalam 42 detik." (default 60). */
export function retryAfterFromMessage(message) {
  const match = /(\d+)\s*detik/.exec(message ?? '')
  return match ? Number(match[1]) : 60
}
