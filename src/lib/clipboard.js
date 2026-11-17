/** Salin teks. Pakai API clipboard kalau halaman aman (https / localhost); gagal atau nggak aman → cara cadangan (http dev). */
export async function copyToClipboard(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard && globalThis.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // jatuh ke cara cadangan
    }
  }
  return fallbackCopy(text)
}

function fallbackCopy(text) {
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;'
  document.body.appendChild(area)
  area.select()
  area.setSelectionRange(0, text.length)
  try {
    return document.execCommand('copy') === true
  } catch {
    return false
  } finally {
    area.remove()
  }
}
