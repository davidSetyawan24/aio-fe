import { createApp } from 'vue'
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

// scrollAssist dimatiin: tebakan tinggi keyboard Ionic (290px) salah buat keyboard iOS asli, dan geseran
// otomatisnya bentrok sama "mode ngetik" di halaman login. Form wajib dirancang tetep kelihatan di atas keyboard.
const app = createApp(App).use(IonicVue, { scrollAssist: false }).use(createPinia()).use(router)

// Sesi habis di tengah jalan → balik ke login (sekali aja, tanpa loop).
setUnauthorizedHandler(() => handleSessionExpired(useAuthStore(), router))

// Tema diterapkan sebelum mount biar nggak kedip (pilihan per device, Profil → Tampilan).
useThemeStore().init()

// Mount langsung (nggak nunggu router siap) biar layar pembuka kelihatan selama status login dicek.
app.mount('#app')
document.documentElement.classList.remove('booting')
