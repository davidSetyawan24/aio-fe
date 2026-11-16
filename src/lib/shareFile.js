/** Bagikan / simpan file (gambar split bill, PDF invoice): HP/iPad lewat menu Bagikan, laptop langsung download. */

/**
 * Cara nyimpen (keputusan David 15/11): Mac (mouse) langsung download; iPhone/iPad (layar sentuh) pakai menu Bagikan,
 * karena download di iOS masuk app Files, bukan galeri Foto. Browser yang nggak bisa share file → download.
 */
export function saveMode({ touch, canShare }) {
  return touch && canShare ? 'share' : 'download'
}

const isTouch = () => Boolean(typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches)

/** Download lewat <a download> (nama file ikut `file.name`). */
export function downloadFile(file) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(file)
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}

/**
 * Menu Bagikan (HP/iPad) atau download (laptop). iOS cuma ngizinin `navigator.share` langsung dari tap:
 * file-nya harus udah jadi & fungsi ini dipanggil tanpa `await` apa pun sebelumnya.
 * → 'shared' | 'cancelled' (menu ditutup) | 'downloaded'
 */
export async function shareOrDownload(file, title) {
  if (saveMode({ touch: isTouch(), canShare: Boolean(navigator.canShare?.({ files: [file] })) }) === 'share') {
    try {
      await navigator.share({ files: [file], title })
      return 'shared'
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled'
    }
  }
  downloadFile(file)
  return 'downloaded'
}
