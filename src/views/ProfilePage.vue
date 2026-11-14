<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div v-if="!wide" class="page narrow" data-test="phone">
        <PageHeader eyebrow="Profil" bell>{{ firstName }}.<br /><span>@{{ auth.user?.username }}</span></PageHeader>

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

      <!-- PC / iPad landscape: dasbor full selebar layar (HP di atas nggak berubah). -->
      <div v-else class="page pc" data-test="pc">
        <PageHeader eyebrow="Profil" bell>{{ firstName }}. <span>@{{ auth.user?.username }}</span></PageHeader>

        <div class="pc-grid">
          <div class="c12 shell rise" style="--i: 2">
            <div class="pc-me" data-test="pc-account">
              <span class="big">{{ auth.initials }}</span>
              <div class="grow">
                <div class="nm">{{ auth.user?.name }}</div>
                <div class="un">@{{ auth.user?.username }}</div>
                <div class="facts">
                  <span v-if="devices.loaded" class="fact"><b>{{ devices.items.length }}</b> device lagi login</span>
                  <span class="fact">tema <b>{{ currentThemeLabel }}</b></span>
                </div>
              </div>
              <button class="out" data-test="pc-logout" @click="confirmLogout">Keluar <span class="ic"><PhSignOut :size="17" weight="bold" /></span></button>
            </div>
          </div>

          <section class="c8 sec rise" style="--i: 3">
            <div class="pc-label">Tampilan <small>berlaku di device ini aja</small></div>
            <div class="shell">
              <div class="core themes" role="radiogroup" aria-label="Tema">
                <button v-for="opt in themeOptions" :key="opt.value" class="tile" :class="{ on: theme.pref === opt.value }" role="radio" data-test="theme-tile"
                  :aria-checked="String(theme.pref === opt.value)" @click="theme.setPref(opt.value)">
                  <span class="pv" :class="opt.value" aria-hidden="true">
                    <span v-for="half in previewHalves(opt.value)" :key="half" class="half" :class="half">
                      <span class="sb"><i /><i /><i /></span>
                      <span class="ct"><span class="hero" /><i /><i class="short" /></span>
                    </span>
                  </span>
                  <span class="t"><span class="t-label">{{ opt.label }}</span><span class="radio"><PhCheck :size="13" weight="bold" /></span></span>
                  <span class="s">{{ opt.sub }}</span>
                </button>
              </div>
            </div>
          </section>

          <section class="c4 sec rise" style="--i: 3">
            <div class="pc-label">Keamanan</div>
            <div class="shell">
              <div class="core sec-list">
                <button class="item" data-test="ganti-password" @click="ionRouter.push('/tabs/profil/password')">
                  <span class="em" style="background: #E4F7C4">🔒</span>
                  <span class="grow"><span class="title">Ganti password</span><span class="sub">Device lain ikut ke-logout</span></span>
                  <PhCaretRight :size="18" class="go" />
                </button>
                <p class="hint">Keluar (tombol di kartu akun) cuma ngehapus sesi di device ini.</p>
              </div>
            </div>
          </section>

          <section class="c12 rise" style="--i: 4">
            <div class="pc-label">Device yang lagi login <small v-if="devices.loaded">{{ devices.items.length }}</small></div>
            <div class="shell">
              <div class="core devs">
                <p v-if="!devices.loaded" class="empty">{{ devicesError || 'Lagi ngambil daftar device…' }}</p>
                <button v-for="d in devices.items" :key="d.id" class="dev" :class="{ current: d.current }" data-test="device-card"
                  @click="ionRouter.push(`/tabs/profil/device/${d.id}`)">
                  <span class="top">
                    <span class="em" :style="{ background: kindLook(d.kind).tint }"><component :is="kindLook(d.kind).icon" :size="21" /></span>
                    <span v-if="d.current" class="chip-me">device ini</span>
                    <PhCaretRight v-else :size="16" class="go" />
                  </span>
                  <span>
                    <span class="title">{{ displayName(d) }}</span>
                    <span class="sub"><span v-if="d.current" class="dot-on" />{{ d.kind }} · {{ activeLabel(d.lastUsedAt, new Date(), d.current) }}</span>
                  </span>
                </button>
              </div>
            </div>
            <p class="hint">Klik device buat ganti nama atau keluarin.</p>
          </section>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
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

const currentThemeLabel = computed(() => themeOptions.value.find((o) => o.value === theme.pref)?.label ?? '')
/** Gambar mini app di kartu tema: "Ikut sistem" = separuh terang, separuh gelap. */
const previewHalves = (value) => (value === 'system' ? ['light', 'dark'] : [value])

/* PC / iPad landscape (≥1100px) pakai dasbor; HP tetep list satu kolom. */
const query = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(min-width: 1100px)') : null
const wide = ref(Boolean(query?.matches))
const onMedia = (e) => (wide.value = e.matches)
query?.addEventListener?.('change', onMedia)
onBeforeUnmount(() => query?.removeEventListener?.('change', onMedia))

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

/* ===== PC (dasbor full) — semua di bawah .pc, HP nggak kena ===== */
.pc { max-width: none; padding-left: 48px; padding-right: 48px; padding-bottom: 60px; }
.pc :deep(.h1 span) { margin-left: .2em; }
.pc-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 24px; }
.c12 { grid-column: span 12; } .c8 { grid-column: span 8; } .c4 { grid-column: span 4; }
.sec { display: flex; flex-direction: column; }
.sec > .shell { flex: 1; }
.sec > .shell > .core { height: 100%; }
.pc-label { display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em;
  color: var(--muted); margin: 0 10px 10px; }
.pc-label small { font-size: 12px; letter-spacing: .02em; text-transform: none; color: var(--text); font-weight: 700; }
.pc .hint { margin: 10px 10px 0; }

.pc-me { position: relative; overflow: hidden; display: flex; align-items: center; gap: 22px; padding: 26px 28px; border-radius: 25px; background: #141410; color: #F3F2EE; }
.pc-me::before { content: ''; position: absolute; right: -60px; top: -140px; width: 420px; height: 420px; border-radius: 99px;
  background: radial-gradient(circle, rgba(200, 240, 74, .2), transparent 65%); pointer-events: none; }
.pc-me .big { position: relative; width: 84px; height: 84px; border-radius: 28px; background: var(--lime); color: var(--lime-ink); display: grid; place-items: center;
  font-weight: 800; font-size: 36px; box-shadow: 0 18px 40px -16px rgba(200, 240, 74, .5); flex-shrink: 0; }
.pc-me .grow { position: relative; }
.pc-me .nm { font-size: 28px; font-weight: 800; letter-spacing: -0.03em; }
.pc-me .un { color: rgba(243, 242, 238, .6); font-size: 14px; margin-top: 2px; }
.pc-me .facts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.pc-me .fact { padding: 6px 11px; border-radius: 99px; background: rgba(243, 242, 238, .08); font-size: 12px; font-weight: 600; color: rgba(243, 242, 238, .75); }
.pc-me .fact b { color: #F3F2EE; }
.out { position: relative; display: inline-flex; align-items: center; gap: 10px; height: 50px; padding: 6px 6px 6px 20px; border: 0; border-radius: 99px;
  background: rgba(243, 242, 238, .1); color: #F3F2EE; font: 600 15px var(--ion-font-family); cursor: pointer; transition: transform .3s var(--spring); }
.out:active { transform: scale(.97); }
.out .ic { width: 38px; height: 38px; border-radius: 99px; display: grid; place-items: center; background: rgba(240, 83, 61, .18); color: #FF8A73; }

.themes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; padding: 12px; }
.tile { display: block; border: 0; border-radius: 20px; padding: 10px; background: var(--soft); color: var(--text); text-align: left; font: inherit; cursor: pointer;
  transition: transform .3s var(--spring), background-color .3s; }
.tile:hover { transform: translateY(-2px); }
.tile.on { background: var(--card); box-shadow: inset 0 0 0 2px var(--ink); }
.pv { display: flex; height: 108px; border-radius: 14px; overflow: hidden; box-shadow: 0 0 0 1px var(--hair); }
.half { flex: 1; display: grid; grid-template-columns: 30% 1fr; }
.half.light { background: #F3F2EE; } .half.dark { background: #0B0B0A; }
.pv.system .half { grid-template-columns: 34% 1fr; }
.sb { display: flex; flex-direction: column; gap: 6px; padding: 10px 8px; }
.ct { display: flex; flex-direction: column; gap: 7px; padding: 10px; }
.sb i, .ct i { display: block; height: 7px; border-radius: 9px; }
.ct i.short { width: 70%; }
.light .sb i, .light .ct i { background: #E1E0DA; } .dark .sb i, .dark .ct i { background: #2A2A27; }
.ct .hero { position: relative; height: 34px; border-radius: 9px; background: #141410; }
.dark .ct .hero { background: #1E1E1B; }
.ct .hero::after { content: ''; position: absolute; right: 8px; bottom: 7px; width: 8px; height: 16px; border-radius: 3px; background: var(--lime); }
.tile .t { display: flex; align-items: center; justify-content: space-between; margin: 12px 4px 2px; font-weight: 700; font-size: 15px; }
.tile .s { display: block; margin: 0 4px 4px; font-size: 12.5px; color: var(--muted); }
.tile .radio { width: 24px; height: 24px; }
.tile.on .radio { background: var(--lime); color: var(--lime-ink); box-shadow: 0 6px 16px -6px rgba(200, 240, 74, 0.9); }

.sec-list { padding: 8px; }
.pc .item:hover { background: var(--soft); }

.devs { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; padding: 12px; }
.dev { display: flex; flex-direction: column; gap: 14px; padding: 16px; border: 0; border-radius: 20px; background: var(--soft); color: var(--text); text-align: left;
  font: inherit; cursor: pointer; transition: transform .3s var(--spring); }
.dev:hover { transform: translateY(-2px); }
.dev.current { background: var(--card); box-shadow: inset 0 0 0 2px var(--lime); }
.dev .top { display: flex; align-items: center; justify-content: space-between; }
.dev .em { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; color: #141410; }
.dev .title, .dev .sub { display: block; }
.dev .go { color: var(--muted); }
.dev .chip-me { margin-left: 0; }
</style>
