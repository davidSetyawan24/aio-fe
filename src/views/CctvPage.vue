<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page">
        <PageHeader eyebrow="Pribadi" back-to="/tabs/menu">CCTV.<br /><span>{{ st.name === 'live' ? `${st.cameras.length} kamera rumah.` : 'Kamera rumah.' }}</span></PageHeader>

        <template v-if="st.name === 'live'">
          <div class="cc-grid" data-test="grid">
            <div v-for="(cam, i) in st.cameras" :key="cam.key" class="rise" :style="{ '--i': i + 2 }">
              <CctvTile :cam="cam" :bridge-key="st.key" :active="st.playing" @open="focusCam = $event" />
            </div>
          </div>
          <p class="cc-hint">Klik kamera buat gedein. Pindah halaman = AIO CCTV di Mac langsung mati.</p>
        </template>
        <CctvNotice v-else :kind="st.name === 'idle' ? 'checking' : st.name" @start="machine.start()" @retry="machine.retry()" />
      </div>
      <CctvFocus :cam="st.playing ? focusCam : null" :bridge-key="st.key ?? ''" :sharp="sharp" @close="focusCam = null" />
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { IonContent, IonPage, onIonViewDidEnter, onIonViewWillLeave } from '@ionic/vue'
import CctvFocus from '@/components/cctv/CctvFocus.vue'
import CctvNotice from '@/components/cctv/CctvNotice.vue'
import CctvTile from '@/components/cctv/CctvTile.vue'
import PageHeader from '@/components/PageHeader.vue'
import { createPageMachine, fetchStatus, launch, networkPermission, openTali } from '@/lib/cctv.js'
import { detectKind } from '@/lib/device.js'
import { hevcSupported } from '@/lib/msePlayer.js'

// Cuma Mac (Chrome di rumah) yang boleh manggil AIO CCTV. HP / iPad / PC lain → kartu info, nggak nyentuh 127.0.0.1 / aiocctv://.
const isMac = detectKind(globalThis.navigator) === 'Mac'
const st = ref({ name: 'idle', key: null, cameras: [], hevc: false, playing: false })
const machine = createPageMachine({ isMac, deps: { fetchStatus, openTali, launch, networkPermission }, onChange: (s) => (st.value = s) })
const focusCam = ref(null)
const sharp = computed(() => st.value.hevc && hevcSupported())

// Tab ngumpet sebentar → tampilan gede cuma berhenti muter (lihat :cam di atas) & nyambung lagi pas balik.
// Baru ditutup kalau udah nggak live lagi (ninggalin halaman, tali putus, > 1 mnt).
watch(() => st.value.name, (name) => name !== 'live' && (focusCam.value = null))

onIonViewDidEnter(() => machine.enter())
onIonViewWillLeave(() => machine.leave())

const onVisibility = () => (globalThis.document.visibilityState === 'hidden' ? machine.hidden() : machine.visible())
document.addEventListener('visibilitychange', onVisibility)
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibility)
  machine.leave()
})
</script>

<style scoped>
.cc-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; }
@media (min-width: 768px) { .cc-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px; } }
.cc-hint { margin: 18px 4px 0; font-size: 12.5px; color: var(--muted); }
</style>
