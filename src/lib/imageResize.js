/**
 * Foto struk dikecilin dulu sebelum dikirim (foto iPhone bisa 3–12 MB / HEIC): sisi terpanjang ±1600px, JPEG.
 * Browser yang nggak bisa (atau gagal) → kirim file asli aja, BE yang nolak kalau kegedean.
 */
export async function resizeForUpload(file, max = 1600) {
  try {
    if (typeof createImageBitmap !== 'function') return file
    const img = await createImageBitmap(file)
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
    img.close?.()
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    return blob ?? file
  } catch {
    return file
  }
}

/**
 * Gambar timbangan (Zepp Life) panjang banget (±1290×3855): dikecilin berdasarkan LEBAR, bukan sisi terpanjang —
 * kalau sisi terpanjang yang dikunci, tulisannya jadi kekecilan buat dibaca. Skala = min(1, maxWidth / lebar), JPEG 0.85.
 * Gagal / browser nggak bisa → kirim file asli.
 */
export async function resizeToWidth(file, maxWidth = 1080) {
  try {
    if (typeof createImageBitmap !== 'function') return file
    const img = await createImageBitmap(file)
    const scale = Math.min(1, maxWidth / img.width)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
    img.close?.()
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    return blob ?? file
  } catch {
    return file
  }
}
