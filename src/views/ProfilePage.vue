<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page narrow">
        <PageHeader eyebrow="Profil">{{ firstName }}.<br /><span>@{{ auth.user?.username }}</span></PageHeader>

        <div class="shell rise" style="--i: 2">
          <div class="core me">
            <span class="avatar">{{ auth.initials }}</span>
            <div class="who">
              <div class="title">{{ auth.user?.name }}</div>
              <div class="sub">@{{ auth.user?.username }}</div>
            </div>
          </div>
        </div>

        <div class="group-label rise" style="--i: 3">Tampilan</div>
        <div class="shell rise" style="--i: 3">
          <div class="core list" role="radiogroup" aria-label="Tema">
            <button v-for="opt in themeOptions" :key="opt.value" class="item" :class="{ on: theme.pref === opt.value }" role="radio"
              :aria-checked="String(theme.pref === opt.value)" @click="theme.setPref(opt.value)">
              <span class="em" :style="{ background: opt.tint }"><component :is="opt.icon" :size="21" /></span>
              <span class="grow">
                <span class="title">{{ opt.label }}</span>
                <span class="sub">{{ opt.sub }}</span>
              </span>
              <span class="radio"><PhCheck :size="14" weight="bold" /></span>
            </button>
          </div>
        </div>

        <div class="group-label rise" style="--i: 4">Keamanan</div>
        <div class="shell rise" style="--i: 4">
          <div class="core list">
            <button class="item" data-test="ganti-password" @click="ionRouter.push('/tabs/profil/password')">
              <span class="em" style="background: #E4F7C4">🔒</span>
              <span class="grow">
                <span class="title">Ganti password</span>
                <span class="sub">Device lain ikut ke-logout</span>
              </span>
              <PhCaretRight :size="18" class="go" />
            </button>
          </div>
        </div>

        <div class="group-label rise" style="--i: 5">Device yang lagi login <small v-if="devices.loaded">{{ devices.items.length }}</small></div>
        <div class="shell rise" style="--i: 5">
          <div class="core list">
            <p v-if="!devices.loaded" class="empty">{{ devicesError || 'Lagi ngambil daftar device…' }}</p>
            <button v-for="d in devices.items" :key="d.id" class="item" data-test="device" @click="ionRouter.push(`/tabs/profil/device/${d.id}`)">
              <span class="em" :style="{ background: kindLook(d.kind).tint }"><component :is="kindLook(d.kind).icon" :size="21" /></span>
              <span class="grow">
                <span class="title">{{ displayName(d) }}<span v-if="d.current" class="chip-me">device ini</span></span>
                <span class="sub"><span v-if="d.current" class="dot-on" />{{ d.kind }} · {{ activeLabel(d.lastUsedAt, new Date(), d.current) }}</span>
              </span>
              <PhCaretRight :size="18" class="go" />
            </button>
          </div>
        </div>
        <p class="hint rise" style="--i: 5">Tap device buat ganti nama atau keluarin.</p>

        <button class="pill ghost logout rise" style="--i: 6" @click="confirmLogout">
          Keluar <span class="ic"><PhSignOut :size="16" weight="bold" /></span>
        </button>
        <p class="hint rise" style="--i: 7">Keluar cuma ngehapus sesi di device ini.</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, ref } from 'vue'
import { actionSheetController, IonContent, IonPage, onIonViewWillEnter, useIonRouter } from '@ionic/vue'
import { useRouter } from 'vue-router'
import { PhCaretRight, PhCheck, PhDeviceMobile, PhMoon, PhSignOut, PhSun } from '@phosphor-icons/vue'
import PageHeader from '@/components/PageHeader.vue'
import { kindLook } from '@/lib/deviceKinds.js'
import { activeLabel } from '@/lib/relativeTime.js'
import { useAuthStore } from '@/stores/auth.js'
import { displayName, useDevicesStore } from '@/stores/devices.js'
import { useThemeStore } from '@/stores/theme.js'

const auth = useAuthStore()
const router = useRouter()
const ionRouter = useIonRouter()
const firstName = computed(() => auth.user?.name?.trim().split(/\s+/)[0] ?? 'Profil')

// Tampilan: pilihan tema per device (disimpen di device ini, bukan di akun).
const theme = useThemeStore()
const themeOptions = computed(() => [
  { value: 'system', label: 'Ikut sistem', sub: `Ngikutin device (lagi ${theme.systemDark ? 'gelap' : 'terang'})`, icon: PhDeviceMobile, tint: '#F3E1FF' },
  { value: 'light', label: 'Terang', sub: 'Selalu terang', icon: PhSun, tint: '#FFE9D6' },
  { value: 'dark', label: 'Gelap', sub: 'Selalu gelap', icon: PhMoon, tint: '#DCEBFF' },
])

// Device yang lagi login: dimuat ulang tiap Profil kebuka (abis rename/keluarin di halaman device, atau balik dari tab lain).
const devices = useDevicesStore()
const devicesError = ref('')
onIonViewWillEnter(async () => {
  try {
    await devices.load()
    devicesError.value = ''
  } catch {
    if (!devices.loaded) devicesError.value = 'Daftar device belum bisa diambil. Coba buka Profil lagi.'
  }
})

async function confirmLogout() {
  const sheet = await actionSheetController.create({
    header: 'Keluar dari AIO Space?',
    subHeader: 'Device ini perlu login lagi nanti.',
    buttons: [
      { text: 'Keluar', role: 'destructive', data: 'logout' },
      { text: 'Batal', role: 'cancel' },
    ],
  })
  await sheet.present()
  const { data } = await sheet.onDidDismiss()
  if (data !== 'logout') return
  await auth.logout()
  await router.replace('/login')
}
</script>

<style scoped>
.narrow { max-width: 620px; }
.me { display: flex; align-items: center; gap: 16px; padding: 20px; }
.avatar { width: 64px; height: 64px; border-radius: 22px; background: var(--lime); color: var(--lime-ink); display: grid; place-items: center;
  font-weight: 800; font-size: 28px; box-shadow: 0 16px 34px -14px rgba(200, 240, 74, 0.8); flex-shrink: 0; }
.who { min-width: 0; }
.group-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em; color: var(--muted); margin: 26px 8px 10px; }
.list { padding: 6px; }
.item { display: flex; align-items: center; gap: 14px; width: 100%; padding: 10px 12px 10px 10px; border: 0; border-radius: 20px; background: transparent;
  color: var(--text); font: inherit; text-align: left; cursor: pointer; transition: background .3s var(--spring); }
.item + .item { margin-top: 2px; }
.item:active, .item.on { background: var(--soft); }
.item .em { width: 42px; height: 42px; border-radius: 14px; display: grid; place-items: center; font-size: 20px; flex-shrink: 0; color: #141410; }
.item .title, .item .sub { display: block; }
.item .go { color: var(--muted); flex-shrink: 0; }
.group-label small { float: right; font-size: inherit; letter-spacing: .08em; margin-right: 4px; }
.chip-me { display: inline-flex; padding: 2px 8px; margin-left: 6px; border-radius: 99px; background: var(--lime); color: var(--lime-ink); font-size: 11px; font-weight: 700; vertical-align: 2px; }
.dot-on { display: inline-block; width: 7px; height: 7px; border-radius: 9px; background: var(--green); margin-right: 5px; vertical-align: 1px; }
.empty { color: var(--muted); font-size: 13px; margin: 0; padding: 14px 12px; }
/* Radio: lingkaran → lime + centang hitam (sama kayak checkbox to-do di design.md). */
.radio { width: 26px; height: 26px; border-radius: 99px; flex-shrink: 0; display: grid; place-items: center; color: transparent;
  box-shadow: inset 0 0 0 2px rgba(138, 138, 130, 0.35); transition: background .35s var(--spring), box-shadow .35s var(--spring), transform .45s var(--spring); }
.item.on .radio { background: var(--lime); color: var(--lime-ink); box-shadow: 0 6px 16px -6px rgba(200, 240, 74, 0.9); transform: scale(1.06); }
.logout { margin-top: 26px; width: 100%; justify-content: space-between; height: 58px; padding: 8px 8px 8px 22px; font-size: 16px; }
.logout .ic { width: 42px; height: 42px; background: rgba(240, 83, 61, 0.14); color: var(--red); }
.hint { color: var(--muted); font-size: 12.5px; margin: 14px 4px 0; }
</style>
