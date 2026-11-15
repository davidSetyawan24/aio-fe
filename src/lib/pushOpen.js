/** Tap notif di layar HP → app pindah ke layar notif itu (`?n=<id>` bikin notifnya ditandain dibaca, lihat main.js). */
import { consumePendingOpen, openPath } from './push.js'

/**
 * - App udah kebuka: service worker ngirim pesan `{ type: 'aio-open', url }` (lebih aman di iOS daripada `client.navigate`).
 * - App dibuka dari notif: iOS kadang buka halaman awal → alamat yang ditunda service worker dipake sekali.
 */
export async function listenPushOpen({ serviceWorker, caches, navigate }) {
  serviceWorker?.addEventListener?.('message', (event) => {
    if (event.data?.type === 'aio-open' && typeof event.data.url === 'string') navigate(openPath(event.data.url))
  })
  const pending = await consumePendingOpen(caches)
  if (pending) navigate(pending)
}
