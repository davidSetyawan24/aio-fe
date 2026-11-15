/* Service worker AIO Space: simpen file app (offline) + notif di layar HP (Web Push). */
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { notificationFromPush } from './lib/push.js'

// File hasil build (diisi vite-plugin-pwa). Versi baru langsung dipake (sama kayak autoUpdate sebelumnya).
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
self.skipWaiting()
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

// Tap notif → buka layar yang pas (`?n=<id>` bikin app nandain notif itu dibaca). Tab AIO yang udah kebuka dipake ulang.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/tabs/home', self.location.origin).href
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin)
      if (open) {
        await open.focus()
        return open.navigate(url).catch(() => self.clients.openWindow(url))
      }
      return self.clients.openWindow(url)
    })(),
  )
})
