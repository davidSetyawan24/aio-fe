/* Service worker AIO Space: simpen file app (offline) + notif di layar HP (Web Push). */
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { notificationFromPush, rememberPendingOpen } from './lib/push.js'
import { isSkipWaiting } from './lib/swMessages.js'

// File hasil build (diisi vite-plugin-pwa). Versi baru NUNGGU sampai tombol "Muat ulang" dipencet
// (biar halaman lama yang masih kebuka nggak nyari file versi lama yang udah dibuang).
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
self.addEventListener('message', (event) => {
  if (isSkipWaiting(event.data)) self.skipWaiting()
})
clientsClaim()
// Alamat app (mis. /tabs/uang) dibuka offline → index.html.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

self.addEventListener('push', (event) => {
  let data = null
  try {
    data = event.data ? event.data.json() : null
  } catch {
    data = null
  }
  const { title, options, unread } = notificationFromPush(data)
  const badge = unread === null ? Promise.resolve() : (unread > 0 ? self.navigator.setAppBadge?.(unread) : self.navigator.clearAppBadge?.())?.catch?.(() => {})
  event.waitUntil(Promise.all([self.registration.showNotification(title, options), badge ?? Promise.resolve()]))
})

// Tap notif → buka layar yang pas (`?n=<id>` bikin app nandain notif itu dibaca).
// App udah kebuka → fokus + kabarin lewat pesan (client.navigate rawan error di iOS, WebKit bug 263687).
// App belum kebuka → alamatnya disimpen dulu (iOS kadang buka halaman awal, bukan alamatnya; app ngambil pas mulai).
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/tabs/home', self.location.origin).href
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin)
      if (open) {
        // Pesan DULU: kalau fokus jendela ditolak browser, app tetep pindah ke layar notif.
        open.postMessage({ type: 'aio-open', url })
        try {
          await open.focus()
        } catch {
          // fokus gagal nggak masalah, app udah dikabarin
        }
        return
      }
      await rememberPendingOpen(self.caches, url)
      await self.clients.openWindow(url)
    })(),
  )
})
