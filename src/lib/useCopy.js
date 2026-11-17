import { ref } from 'vue'
import { toastController } from '@ionic/vue'
import { copyToClipboard } from './clipboard.js'

/** Salin + tandai (ikon ✓ ±1,6 dtk) + toast "<label> kesalin ✓". `key` = baris mana yang lagi ✓. */
export function useCopy() {
  const copiedKey = ref(null)
  let timer = null

  const toast = async (message) => (await toastController.create({ message, duration: 1800, position: 'top', cssClass: 'aio-toast' })).present()

  async function copy(key, label, text) {
    const ok = await copyToClipboard(text)
    if (!ok) return toast('Nggak bisa nyalin. Coba lagi ya.').catch(() => {})
    copiedKey.value = key
    clearTimeout(timer)
    timer = setTimeout(() => (copiedKey.value = null), 1600)
    return toast(`${label} kesalin ✓`).catch(() => {})
  }

  return { copiedKey, copy }
}
