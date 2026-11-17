import { createApp } from 'vue'
import { startBellPolling } from './lib/bellPolling.js'
import { createPinia } from 'pinia'
import { IonicVue } from '@ionic/vue'

import '@fontsource/plus-jakarta-sans/400.css'
import '@fontsource/plus-jakarta-sans/500.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import '@fontsource/plus-jakarta-sans/800.css'
import '@ionic/vue/css/core.css'
import '@ionic/vue/css/normalize.css'
import '@ionic/vue/css/structure.css'
import '@ionic/vue/css/typography.css'
import '@ionic/vue/css/padding.css'
import '@ionic/vue/css/flex-utils.css'
import '@ionic/vue/css/display.css'
// Palet gelap Ionic ikut class `ion-palette-dark` di <html> (diatur store tema), bukan langsung tema device.
import '@ionic/vue/css/palettes/dark.class.css'
import './theme/tokens.css'
import './theme/base.css'

import App from './App.vue'
import { setUnauthorizedHandler } from './lib/api.js'
import { handleSessionExpired } from './lib/sessionExpired.js'
import { router } from './router/index.js'
import { useAuthStore } from './stores/auth.js'
import { useThemeStore } from './stores/theme.js'
import { isMainPage, useNotificationsStore } from './stores/notifications.js'
import { takeNotifId } from './lib/push.js'
import { listenPushOpen } from './lib/pushOpen.js'
import { usePushStore } from './stores/push.js'
import { installPersonalLock } from './lib/personalLock.js'
import { usePersonalStore } from './stores/personal.js'

// scrollAssist dimatiin: tebakan tinggi keyboard Ionic (290px) salah buat keyboard iOS asli, dan geseran
// otomatisnya bentrok sama "mode ngetik" di halaman login. Form wajib dirancang tetep kelihatan di atas keyboard.
const app = createApp(App).use(IonicVue, { scrollAssist: false }).use(createPinia()).use(router)

// Sesi habis di tengah jalan → balik ke login (sekali aja, tanpa loop).
setUnauthorizedHandler(() => handleSessionExpired(useAuthStore(), router))

// Tema diterapkan sebelum mount biar nggak kedip (pilihan per device, Profil → Tampilan).
useThemeStore().init()

// Angka lonceng (nggak realtime): disegerin tiap buka halaman utama & pas app balik dari background.
const refreshBell = () => {
  if (useAuthStore().status === 'authed') useNotificationsStore().refreshCount().catch(() => {})
}
router.afterEach((to) => isMainPage(to.path) && refreshBell())
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && refreshBell())
// Pengingat Agenda dibikin server tiap menit → lonceng ikut dicek tiap 60 detik selama app keliatan.
startBellPolling(refreshBell)

// Notif di layar HP: keadaan device ini dicek sekali abis login (sekalian kirim ulang langganan ke server).
// Dibuka dari tap notif (`?n=<id>`) → notif itu ditandain dibaca, `n` dibuang dari alamat.
router.afterEach((to) => {
  if (useAuthStore().status !== 'authed') return
  const push = usePushStore()
  if (push.state === 'loading') push.init().catch(() => {})
  const { id, path } = takeNotifId(to.fullPath)
  if (id === null) return
  useNotificationsStore().readFromPush(id).catch(() => {})
  router.replace(path)
})

// Data Pribadi: kekunci lagi pas pindah halaman / app ditinggal lama. Diam kalau belum login atau lagi kekunci.
installPersonalLock({
  router,
  store: {
    lock: () => {
      const personal = usePersonalStore()
      if (useAuthStore().status === 'authed' && personal.unlocked) personal.lock()
    },
  },
})

// Tap notif di layar HP: pesan dari service worker (app kebuka) / alamat yang ketunda (app dibuka dari notif).
listenPushOpen({ serviceWorker: navigator.serviceWorker, caches: globalThis.caches, navigate: (path) => router.push(path) }).catch(() => {})

// Mount langsung (nggak nunggu router siap) biar layar pembuka kelihatan selama status login dicek.
app.mount('#app')
document.documentElement.classList.remove('booting')
