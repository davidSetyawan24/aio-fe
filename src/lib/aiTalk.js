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

  /** `from` = 'gym' | 'badan' (asal halaman), `sessionId` = obrolan evaluasi sesi itu. */
  function talk(from, sessionId = null) {
    if (wide.value) {
      Object.assign(panel, { open: true, context: from, sessionId, convId: null, formKey: panel.formKey + 1 })
      return
    }
    ionRouter.push(`/tabs/menu/${from}/tanya${sessionId != null ? `?sesi=${sessionId}` : ''}`)
  }
  const close = () => (panel.open = false)
  return { wide, panel, talk, close }
}
