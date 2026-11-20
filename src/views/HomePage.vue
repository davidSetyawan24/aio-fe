<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page h-page">
        <header class="h-hello rise">
          <h1 class="h1">{{ greeting(now.minutes, auth.user?.name) }}<span>{{ dateLine(store.data?.today ?? now.date) }}</span></h1>
          <NotifBell />
        </header>

        <div v-if="error && !store.data" class="h-error-box">
          <p class="h-error">{{ error }}</p>
          <button class="h-retry" data-test="retry" :disabled="loading" @click="load">Coba lagi</button>
        </div>

        <div v-if="store.data" class="h-grid">
          <section class="h-attn" data-test="slot-attn"><HomeAttention :items="store.data.attention" :today="store.data.today" /></section>
          <section class="h-today" data-test="slot-today">
            <HomeToday :events="store.data.agenda.events" :todos="store.data.agenda.todos" :today="store.data.today" :minutes="now.minutes" />
          </section>
          <section class="h-side" data-test="slot-side">
            <div v-if="store.data.body && !pc" class="h-bodywrap"><HomeBody :body="store.data.body" :today="store.data.today" /></div>
            <HomeMoney :money="store.data.money" :owed="store.data.owed" :today="store.data.today">
              <template v-if="store.data.body && pc" #afterHero><div class="h-bodywrap"><HomeBody :body="store.data.body" :today="store.data.today" /></div></template>
            </HomeMoney>
          </section>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { IonContent, IonPage, onIonViewDidEnter, onIonViewDidLeave, onIonViewWillEnter } from '@ionic/vue'
import HomeAttention from '@/components/HomeAttention.vue'
import HomeBody from '@/components/HomeBody.vue'
import HomeMoney from '@/components/HomeMoney.vue'
import HomeToday from '@/components/HomeToday.vue'
import NotifBell from '@/components/NotifBell.vue'
import { startBellPolling } from '@/lib/bellPolling.js'
import { useMedia } from '@/lib/media.js'
import { dateLine, greeting, wibNow } from '@/lib/home.js'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { useAuthStore } from '@/stores/auth.js'
import { useHomeStore } from '@/stores/home.js'

const auth = useAuthStore()
/** PC (≥1100): kartu Badan pas di bawah "Duit hari ini"; HP/iPad: di atas Duit, abis Hari ini. */
const pc = useMedia('(min-width: 1100px)')
const store = useHomeStore()
const now = ref(wibNow())
const error = ref('')
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    await store.load()
    error.value = ''
  } catch (err) {
    // Udah ada data → diem aja, data lama tetep keliatan.
    if (!store.data) error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

/** Beranda lagi kebuka (bukan ketumpuk di belakang tab lain) — balik dari background cuma muat ulang kalau lagi kebuka; tab lain → dimuat pas dibuka lagi. */
let active = false
onIonViewDidEnter(() => (active = true))
onIonViewDidLeave(() => (active = false))

function onVisible() {
  if (active && document.visibilityState === 'visible') {
    now.value = wibNow()
    load()
  }
}

let stopPolling = () => {}
onIonViewWillEnter(() => {
  now.value = wibNow()
  load()
})
onMounted(() => {
  document.addEventListener('visibilitychange', onVisible)
  stopPolling = startBellPolling(() => {
    now.value = wibNow()
    store.ensureToday(now.value.date)?.catch(() => {})
  })
})
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisible)
  stopPolling()
})
</script>

<style scoped>
.h-page { padding-bottom: 110px; }
@media (min-width: 768px) { .h-page { max-width: 760px; margin: 0 auto; } }
.h-hello { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.h-hello .h1 { margin: 4px 0 6px; }
.h-hello .h1 span { display: block; font-size: .62em; letter-spacing: -0.02em; margin-top: 4px; }
.h-error-box { margin: 24px 6px; }
.h-error { color: var(--red); font-size: 13px; font-weight: 600; margin: 0 0 12px; }
.h-retry { height: 44px; padding: 0 20px; border: 0; border-radius: 99px; background: var(--ink); color: var(--on-ink); font: 700 14px var(--ion-font-family); cursor: pointer; }
.h-retry:disabled { opacity: .5; cursor: default; }

.h-grid { display: block; margin-top: 8px; }
.h-side { display: flex; flex-direction: column; }

@media (min-width: 1100px) {
  .h-page { max-width: none; margin: 0; padding: 64px 48px 48px; }
  .h-grid { display: grid; grid-template-columns: minmax(0, 1fr) 380px; grid-template-areas: 'attn side' 'today side'; gap: 0 24px; align-items: start; }
  /* Kolom kanan (Duit + Badan) bisa lebih tinggi dari Perlu diurus: sisa tingginya diserap baris Hari ini (1fr), bukan bikin celah di bawah Perlu diurus. */
  .h-grid { grid-template-rows: auto 1fr; }
  .h-attn { grid-area: attn; }
  .h-today { grid-area: today; }
  .h-side { grid-area: side; }
}
@media (min-width: 1600px) {
  .h-grid { grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr) 420px; grid-template-areas: 'attn today side'; grid-template-rows: auto; }
  .h-side { position: sticky; top: 24px; }
}
@media (min-width: 2200px) {
  .h-hello .h1 { font-size: 52px; }
  .h-grid { grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) 480px; gap: 0 32px; }
}
@media (hover: hover) { .h-retry:not(:disabled):hover { opacity: .85; } }
</style>
