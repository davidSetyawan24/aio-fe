<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page gy-page">
        <div class="gy-toprow">
          <button type="button" class="gy-back" data-test="back" @click="goBack"><PhCaretLeft :size="18" weight="bold" />Gym</button>
        </div>
        <span class="eyebrow rise"><span class="dot" />Gym</span>
        <h1 class="h1 rise" style="--i: 1">Riwayat.<span v-if="sub" data-test="sub">{{ sub }}</span></h1>

        <p v-if="failed && !hist.loaded" class="gy-fail" data-test="failed">Nggak bisa muat riwayat. <button type="button" @click="load">Coba lagi</button></p>
        <p v-else-if="!hist.loaded" class="gy-wait" data-test="wait">Bentar ya…</p>
        <div v-else-if="!hist.weeks.length" class="shell"><div class="gy-core gy-empty" data-test="empty"><div class="em">🏋️</div><h2>Belum ada sesi</h2><p>Pilih latihan di halaman Gym buat mulai. Sesi yang udah selesai muncul di sini.</p></div></div>
        <template v-else>
          <div class="gy-histgrid">
            <section v-for="(wk, i) in hist.weeks" :key="wk.start">
              <div class="gy-label rise" :style="{ '--i': Math.min(i, 6) }" data-test="week-label"><span>{{ weekTitle(wk.start, today) }}</span><small>{{ wk.count }} sesi · {{ volText(wk.volume) }} kg</small></div>
              <div class="shell rise" :style="{ '--i': Math.min(i, 6) }"><div class="gy-core"><GymHistoryRows :sessions="wk.sessions" @open="openSession" /></div></div>
            </section>
          </div>
          <ion-infinite-scroll threshold="240px" :disabled="!hist.next" @ionInfinite="more">
            <ion-infinite-scroll-content loading-spinner="crescent" />
          </ion-infinite-scroll>
        </template>
      </div>

      <GymSessionPanel v-if="wide" :open="!!sesiId" :id="shownId" :editing="editing" @close="closePanel" @edit="setQuery(shownId, true)" @stop-edit="setQuery(shownId, false)" @deleted="closePanel" @talk="talk('gym', shownId)" />
      <AiChatPanel v-if="wide" v-bind="aiPanel" @close="closeAi" />
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { IonContent, IonInfiniteScroll, IonInfiniteScrollContent, IonPage, onIonViewWillEnter, useIonRouter } from '@ionic/vue'
import { PhCaretLeft } from '@phosphor-icons/vue'
import { useRoute, useRouter } from 'vue-router'
import GymHistoryRows from '@/components/gym/GymHistoryRows.vue'
import AiChatPanel from '@/components/ai/AiChatPanel.vue'
import GymSessionPanel from '@/components/gym/GymSessionPanel.vue'
import '@/components/gym/gym.css'
import '@/components/gym/gymReport.css'
import { dShort } from '@/lib/badanView.js'
import { volText } from '@/lib/gym.js'
import { weekTitle } from '@/lib/gymReport.js'
import { wibNow } from '@/lib/home.js'
import { useAiTalk } from '@/lib/aiTalk.js'
import { useMedia } from '@/lib/media.js'
import { useGymStore } from '@/stores/gym.js'

const BASE = '/tabs/menu/gym'
const RIWAYAT = `${BASE}/riwayat`
const store = useGymStore()
const ionRouter = useIonRouter()
const route = useRoute()
const router = useRouter()
const wide = useMedia('(min-width: 1100px)')
const { panel: aiPanel, talk, close: closeAi } = useAiTalk()
const failed = ref(false)
const today = ref(wibNow().date)

const hist = computed(() => store.hist)
const sub = computed(() => (store.data?.firstOn ? `${store.data.totalSessions} sesi sejak ${dShort(store.data.firstOn)}` : ''))

async function load() {
  failed.value = false
  try {
    await store.loadHistory()
  } catch {
    failed.value = true
  }
}
async function more(ev) {
  try {
    await store.moreHistory()
  } catch {
    // gagal nyambung: geser lagi buat nyoba ulang
  }
  ev.target?.complete?.()
}

// Abis ubah / hapus / Selesai riwayat jadi basi → muat ulang (isi lama tetep keliatan sampe yang baru dateng).
watch(() => store.hist.stale, (stale) => stale && load())
load()
if (!store.data) store.load().catch(() => {})
onIonViewWillEnter(() => {
  today.value = wibNow().date
})

// PC: detail / ubah sesi = panel kanan, dikendaliin lewat ?sesi=<id>[&ubah=1].
const sesiId = computed(() => (wide.value && Number.isInteger(Number(route.query.sesi)) && route.query.sesi ? Number(route.query.sesi) : null))
const editing = computed(() => route.query.ubah === '1')
// Id terakhir dipertahanin biar isi panel nggak kosong pas animasi nutup.
const shownId = ref(sesiId.value)
watch(sesiId, (v) => v != null && (shownId.value = v))

const setQuery = (id, ubah) => router.replace({ path: RIWAYAT, query: { sesi: String(id), ...(ubah ? { ubah: '1' } : {}) } })
const closePanel = () => router.replace({ path: RIWAYAT, query: {} })
const openSession = (id) => (wide.value ? setQuery(id, false) : ionRouter.push(`${RIWAYAT}/${id}`))
const goBack = () => (ionRouter.canGoBack() ? ionRouter.back() : ionRouter.navigate(BASE, 'back', 'replace'))
</script>
