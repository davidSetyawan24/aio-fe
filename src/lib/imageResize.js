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
