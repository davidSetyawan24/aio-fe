import { ref } from 'vue'
import { copyToClipboard } from './clipboard.js'
import { showToast } from './personalForm.js'

/** Salin + tandai (ikon ✓ ±1,6 dtk) + toast "<label> kesalin ✓". `key` = baris mana yang lagi ✓. */
export function useCopy() {
  const copiedKey = ref(null)
  let timer = null

  async function copy(key, label, text) {
    const ok = await copyToClipboard(text)
    if (!ok) return showToast('Nggak bisa nyalin. Coba lagi ya.')
    copiedKey.value = key
    clearTimeout(timer)
    timer = setTimeout(() => (copiedKey.value = null), 1600)
    return showToast(`${label} kesalin ✓`)
  }

  return { copiedKey, copy }
}
