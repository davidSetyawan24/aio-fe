<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page b-page b-sub">
        <div class="b-toprow">
          <button type="button" class="bs-back" data-test="back" @click="goBack"><PhCaretLeft :size="18" weight="bold" />{{ view === 'edit' ? 'Detail' : 'Badan' }}</button>
        </div>
        <template v-if="view !== 'detail'">
          <span class="eyebrow rise"><span class="dot" />Badan</span>
          <h1 class="h1 rise" style="--i: 1">{{ title }}.<span class="b-sub-s" data-test="sub">{{ subtitle }}</span></h1>
        </template>

        <p v-if="!store.loaded" class="bp-wait" data-test="wait">{{ failed ? 'Nggak bisa muat data badan.' : 'Bentar ya…' }}</p>
        <template v-else>
          <BadanDetail v-if="view === 'detail'" :weighing-id="id" @edit="goEdit" @done="onDone" />
          <BadanForm v-else-if="view === 'manual'" mode="manual" @done="onDone" @open="goExisting" />
          <BadanForm v-else-if="view === 'edit' && weighing" mode="edit" :initial="weighing" @done="onDone" @open="goExisting" />
          <p v-else-if="view === 'edit'" class="bd-gone" data-test="gone">Timbangannya nggak ketemu. Mungkin udah dihapus.</p>
          <div v-else-if="view === 'upload'" data-test="upload-placeholder" />
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, ref } from 'vue'
import { IonContent, IonPage, onIonViewWillEnter, useIonRouter } from '@ionic/vue'
import { PhCaretLeft } from '@phosphor-icons/vue'
import { useRoute } from 'vue-router'
import BadanDetail from '@/components/badan/BadanDetail.vue'
import BadanForm from '@/components/badan/BadanForm.vue'
import '@/components/badan/badan.css'
import { dLong, jam } from '@/lib/badanView.js'
import { useMedia } from '@/lib/media.js'
import { showToast } from '@/lib/personalForm.js'
import { useBadanStore } from '@/stores/badan.js'

/**
 * Satu halaman pembungkus buat rute anak Badan di HP (<768px): upload, isi manual, detail, ubah — `route.meta.view` yang nentuin.
 * Di layar ≥768 semuanya panel di halaman utama, jadi halaman ini cuma ngelempar ke sana.
 */
const BASE = '/tabs/menu/badan'
const route = useRoute()
const ionRouter = useIonRouter()
const store = useBadanStore()
const wide = useMedia('(min-width: 768px)')

// Dibaca SEKALI pas halaman dibikin (Ionic nyimpen halaman ketumpuk tetep hidup; route global bisa pindah ke :id lain).
const view = route.meta.view
const id = route.params.id ?? null
const failed = ref(false)

const weighing = computed(() => store.weighings.find((w) => w.id === Number(id)) ?? null)
const TITLES = { upload: 'Upload timbangan', manual: 'Isi manual', edit: 'Ubah timbangan' }
const title = TITLES[view] ?? ''
const subtitle = computed(() => {
  if (view === 'manual') return 'Ketik angka dari timbangan / Zepp Life.'
  if (view === 'edit' && weighing.value) return `${dLong(weighing.value.weighedOn)}, ${jam(weighing.value.weighedAt)}`
  if (view === 'upload') return 'Dari gambar Zepp Life.'
  return ''
})

async function ensureLoaded() {
  if (store.loaded) return
  try {
    await store.load()
  } catch {
    failed.value = true
  }
}
ensureLoaded()

onIonViewWillEnter(() => {
  if (!wide.value) return
  ionRouter.navigate(`${BASE}?panel=${view}${id !== null ? `&id=${id}` : ''}`, 'back', 'replace')
})

const goBack = () => (ionRouter.canGoBack() ? ionRouter.back() : ionRouter.navigate(BASE, 'back', 'replace'))
const goEdit = () => ionRouter.navigate(`${BASE}/${id}/ubah`, 'forward', 'push')
const goExisting = (existingId) => ionRouter.navigate(`${BASE}/${existingId}`, 'forward', 'push')

async function onDone(message) {
  goBack()
  await showToast(message)
}
</script>

<style scoped>
.b-toprow { display: flex; align-items: center; min-height: 44px; }
.b-sub-s { display: block; font-size: 15px; letter-spacing: -0.01em; margin-top: 8px; line-height: 1.4; }
</style>
