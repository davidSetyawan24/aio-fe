<template>
  <ion-app>
    <AppSplash v-if="showSplash" :gym-program="gymDraft?.program ?? null" />
    <ion-split-pane v-else content-id="main" when="md" :disabled="isLogin">
      <!-- Sidebar cuma buat iPad/Mac (split-pane ≥768px). Gesture geser dimatiin: di iPhone itu kebiasaan "back". -->
      <ion-menu content-id="main" type="overlay" :disabled="isLogin" :swipe-gesture="false">
        <nav class="side">
          <div class="brand"><AioLogo :size="30" /></div>
          <router-link v-for="item in sideItems" :key="item.path" :to="item.path" class="nav" :class="{ active: isActive(item.path) }">
            <component :is="item.icon" :size="21" :weight="isActive(item.path) ? 'fill' : 'light'" />{{ item.label }}
          </router-link>
          <div class="grow" />
          <router-link to="/tabs/profil" class="account" :class="{ active: isActive('/tabs/profil') }">
            <span class="avatar">{{ auth.initials }}</span>
            <span class="who"><b>{{ auth.user?.name }}</b><small>@{{ auth.user?.username }}</small></span>
            <PhCaretRight :size="18" class="more" />
          </router-link>
        </nav>
      </ion-menu>
      <ion-router-outlet id="main" />
    </ion-split-pane>
    <GymForgotDialog />
    <UpdateBanner :no-sidebar="showSplash || isLogin" />
  </ion-app>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, watch, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IonApp, IonMenu, IonRouterOutlet, IonSplitPane } from '@ionic/vue'
import AioLogo from '@/components/AioLogo.vue'
import AppSplash from '@/components/AppSplash.vue'
import GymForgotDialog from '@/components/gym/GymForgotDialog.vue'
import UpdateBanner from '@/components/UpdateBanner.vue'
import { PhCaretRight } from '@phosphor-icons/vue'
import { tabItems } from '@/modules/registry.js'
import { setStatusBarColor, statusBarColor } from '@/lib/theme.js'
import { showToast } from '@/lib/personalForm.js'
import { retryConnection } from '@/lib/retryConnection.js'
import { GYM_LIVE_PATH } from '@/router/guard.js'
import { useAuthStore } from '@/stores/auth.js'
import { peekLiveDraft, useGymStore } from '@/stores/gym.js'
import { useThemeStore } from '@/stores/theme.js'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const gym = useGymStore()
// Server nggak kejangkau tapi ada sesi Gym jalan di HP ini → halaman sesi live tetep jalan dari draf (set nggak boleh ilang gara-gara sinyal).
const gymDraft = computed(() => (auth.status === 'offline' ? (gym.live ?? peekLiveDraft()) : null))
const offlineGym = computed(() => !!gymDraft.value && route.path === GYM_LIVE_PATH)
const showSplash = computed(() => auth.status === 'unknown' || (auth.status === 'offline' && !offlineGym.value))
const isLogin = computed(() => route.path === '/login')
// Sidebar iPad/Mac: sama kayak tab bar, tapi Profil jadi kartu akun di bawah.
const sideItems = tabItems().filter((t) => t.path !== '/tabs/profil')
const isActive = (path) => route.path === path || route.path.startsWith(`${path}/`)

// Warna status bar / bar Safari ikut tema, kecuali login & splash/offline yang selalu gelap.
const theme = useThemeStore()
watchEffect(() => setStatusBarColor(document, statusBarColor(theme.resolved, isLogin.value || showSplash.value)))

// Lagi offline (mis. sesi Gym dari draf) lalu sinyal balik / app balik keliatan → cek login lagi (401 → login, draf tetep di HP).
let rechecking = false
async function recheck() {
  if (auth.status !== 'offline' || rechecking) return
  rechecking = true
  try {
    await retryConnection(auth, router)
  } finally {
    rechecking = false
  }
}
const onVisible = () => document.visibilityState === 'visible' && recheck()
onMounted(() => {
  window.addEventListener('online', recheck)
  document.addEventListener('visibilitychange', onVisible)
})
onBeforeUnmount(() => {
  window.removeEventListener('online', recheck)
  document.removeEventListener('visibilitychange', onVisible)
})

// Kabar dari store Gym (mis. "Disambung ke sesi Push yang udah jalan") bisa muncul dari halaman mana aja → toast di sini, sekali per kabar.
watch(
  () => gym.notice?.id,
  () => gym.notice && showToast(gym.notice.text),
)
</script>

<style scoped>
.side { padding: 32px 18px 18px; display: flex; flex-direction: column; gap: 4px; height: 100%; }
.brand { margin: 0 10px 26px; }
.grow { flex: 1; }
.account { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 20px; background: var(--card); color: var(--text);
  text-decoration: none; box-shadow: 0 0 0 1px var(--hair), var(--lift); transition: transform 0.4s var(--spring); }
.account:active { transform: scale(0.97); }
.account.active { box-shadow: 0 0 0 2px var(--ink), var(--lift); }
.account .avatar { width: 40px; height: 40px; border-radius: 14px; background: var(--lime); color: var(--lime-ink); display: grid; place-items: center;
  font-weight: 800; font-size: 17px; flex-shrink: 0; }
.account .who { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.account .who b { font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.account .who small { font-size: 12px; color: var(--muted); }
.account .more { color: var(--muted); }
</style>
