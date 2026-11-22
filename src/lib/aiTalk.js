import { reactive } from 'vue'
import { useIonRouter } from '@ionic/vue'
import { useMedia } from './media.js'

/**
 * Buka chat AI dari halaman mana aja: HP (<768px) pindah ke halaman `/tabs/menu/<asal>/tanya`,
 * layar lebar buka panel kanan. Halaman yang makai pasang `<AiChatPanel v-bind="panel" @close="close" />` kalau `wide`.
 */
export function useAiTalk() {
  const ionRouter = useIonRouter()
  const wide = useMedia('(min-width: 768px)')
  const panel = reactive({ open: false, context: 'gym', sessionId: null, convId: null, formKey: 0 })

  /** `from` = 'gym' | 'badan' (asal halaman), `sessionId` = obrolan evaluasi sesi itu, `origin` = 'riwayat' kalau dibuka dari detail Riwayat (buat label tombol balik di HP). */
  function talk(from, sessionId = null, origin = '') {
    if (wide.value) {
      Object.assign(panel, { open: true, context: from, sessionId, convId: null, formKey: panel.formKey + 1 })
      return
    }
    const query = [sessionId != null ? `sesi=${sessionId}` : '', origin ? `dari=${origin}` : ''].filter(Boolean).join('&')
    ionRouter.push(`/tabs/menu/${from}/tanya${query ? `?${query}` : ''}`)
  }
  const close = () => (panel.open = false)
  return { wide, panel, talk, close }
}
