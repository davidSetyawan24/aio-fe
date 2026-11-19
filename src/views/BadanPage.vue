<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page b-page">
        <div class="b-toprow">
          <button v-if="!wide" type="button" class="b-back" data-test="back" @click="goBack"><PhCaretLeft :size="18" weight="bold" />Semua menu</button>
          <span v-else />
          <button v-if="!wide" type="button" class="pill ghost small b-hpman" data-test="manual-small" @click="openPanel('manual')"><PhPencilSimple :size="16" />&nbsp;Isi manual</button>
        </div>
        <span class="eyebrow rise"><span class="dot" />Badan</span>
        <div class="b-headrow">
          <h1 class="h1 rise b-h1" style="--i: 1">Badan.<span class="b-sub" data-test="sub">{{ subText }}</span></h1>
          <div v-if="wide" class="b-hact">
            <button type="button" class="pill ghost" data-test="manual" @click="openPanel('manual')"><PhPencilSimple :size="17" />&nbsp;Isi manual</button>
            <button type="button" class="pill" data-test="upload" @click="openPanel('upload')">Upload timbangan <span class="ic"><PhUploadSimple :size="17" weight="bold" /></span></button>
          </div>
        </div>

        <p v-if="failed" class="b-fail" data-test="failed">Nggak bisa muat data badan. <button type="button" @click="load">Coba lagi</button></p>

        <BadanEmpty v-else-if="isEmpty" @upload="openPanel('upload')" @manual="openPanel('manual')" />

        <div v-else-if="store.loaded" class="b-bgrid" data-test="main">
          <section class="b-left">
            <div class="b-label rise">Sekarang</div>
            <BadanHero :summary="store.summary" :last="store.last" :today="today" />
            <BadanTarget :target="store.target" :summary="store.summary" :rows="store.rows" @edit="openPanel('target')" />
          </section>
          <section class="b-mid">
            <BadanChart :key="chartKey" :rows="store.sorted" :target="store.target" :last-on="store.summary.lastOn" />
            <BadanLast :last="store.last" :today="today" @open="(id) => openPanel('detail', id)" />
          </section>
          <section class="b-rw">
            <BadanHistory :rows="store.sorted" :today="today" :all="pc" @open="(id) => openPanel('detail', id)" />
          </section>
        </div>
      </div>

      <BadanPanel v-if="wide" :open="panel.open" :view="panel.view" :id="panel.id" :form-key="panel.key" @close="closePanel" @edit="(i) => openPanel('edit', i)" @detail="(i) => openPanel('detail', i)" @done="onPanelDone" />

      <button v-if="!wide && !isEmpty && store.loaded" slot="fixed" type="button" class="b-fab" data-test="fab" @click="openPanel('upload')">
        Upload <span class="ic"><PhUploadSimple :size="19" weight="bold" /></span>
      </button>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { IonContent, IonPage, onIonViewWillEnter, useIonRouter } from '@ionic/vue'
import { PhCaretLeft, PhPencilSimple, PhUploadSimple } from '@phosphor-icons/vue'
import { useRoute, useRouter } from 'vue-router'
import BadanChart from '@/components/badan/BadanChart.vue'
import BadanEmpty from '@/components/badan/BadanEmpty.vue'
import BadanHero from '@/components/badan/BadanHero.vue'
import BadanHistory from '@/components/badan/BadanHistory.vue'
import BadanLast from '@/components/badan/BadanLast.vue'
import BadanPanel from '@/components/badan/BadanPanel.vue'
import BadanTarget from '@/components/badan/BadanTarget.vue'
import '@/components/badan/badan.css'
import { ARAH_INFO } from '@/lib/badan.js'
import { headerSub } from '@/lib/badanView.js'
import { wibNow } from '@/lib/home.js'
import { useMedia } from '@/lib/media.js'
import { showToast } from '@/lib/personalForm.js'
import { useBadanStore } from '@/stores/badan.js'

const BASE = '/tabs/menu/badan'
const store = useBadanStore()
const ionRouter = useIonRouter()
const route = useRoute()
const router = useRouter()
const wide = useMedia('(min-width: 768px)')
const pc = useMedia('(min-width: 1100px)')
const failed = ref(false)
const today = ref(wibNow().date)
/** Naik tiap halaman dibuka lagi → grafik di-remount (balik ke pilihan bawaan). */
const chartKey = ref(0)

const isEmpty = computed(() => store.loaded && store.weighings.length === 0)
const subText = computed(() => {
  if (isEmpty.value) return 'Belum ada timbangan yang masuk.'
  const s = store.summary
  if (!s) return ''
  return headerSub(s.arah ? ARAH_INFO[s.arah].n : null, s.lastOn, s.lastAt, today.value)
})

async function load() {
  failed.value = false
  try {
    await store.load()
  } catch {
    failed.value = !store.loaded
  }
}

/** HP (<768px) = halaman anak, ≥768px = panel geser. */
const panel = reactive({ open: false, view: 'detail', id: null, key: 0 })
const PATHS = { upload: () => `${BASE}/upload`, manual: () => `${BASE}/catat`, detail: (id) => `${BASE}/${id}`, edit: (id) => `${BASE}/${id}/ubah` }
function openPanel(view, id = null) {
  if (!wide.value && PATHS[view]) return ionRouter.push(PATHS[view](id))
  panel.view = view
  panel.id = id
  panel.key += 1
  panel.open = true
}
const closePanel = () => (panel.open = false)
/** Abis simpan / hapus: ubah → balik ke detailnya, sisanya nutup panel. Toast tetep nongol. */
function onPanelDone(message) {
  if (panel.view === 'edit') openPanel('detail', panel.id)
  else closePanel()
  showToast(message)
}
defineExpose({ openPanel, panel })

/**
 * Lemparan dari halaman anak di layar lebar (?panel=<view>&id=<id>). Baru dijalanin abis datanya ke-muat; abis dipakai query dibuang.
 */
function followLink() {
  if (!store.loaded || !route || route.path !== BASE) return
  const { panel: wanted, id, ...rest } = route.query
  if (wanted === undefined) return
  router?.replace({ path: BASE, query: rest })
  const num = Number(id)
  if (!['detail', 'edit', 'manual', 'upload'].includes(wanted) || !wide.value) return
  if ((wanted === 'detail' || wanted === 'edit') && (!Number.isInteger(num) || !store.weighings.some((w) => w.id === num))) return
  openPanel(wanted, wanted === 'detail' || wanted === 'edit' ? num : null)
}
watch([() => store.loaded, () => route?.query, () => route?.path], followLink, { immediate: true })

const goBack = () => (ionRouter.canGoBack() ? ionRouter.back() : ionRouter.navigate('/tabs/menu', 'back', 'replace'))

let entered = false
onMounted(load)
onIonViewWillEnter(() => {
  chartKey.value += 1
  today.value = wibNow().date
  if (entered) load()
  entered = true
})
</script>

<style scoped>
.b-toprow { display: flex; align-items: center; justify-content: space-between; min-height: 44px; }
.b-back { display: inline-flex; align-items: center; gap: 2px; height: 44px; margin-left: -6px; padding: 0 8px 0 6px; border: 0; background: none; color: var(--muted); font: 700 14.5px var(--ion-font-family); cursor: pointer; }
.b-headrow { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; }
.b-h1 { margin-bottom: 4px; }
.b-sub { display: block; font-size: 15px; letter-spacing: -0.01em; margin-top: 8px; line-height: 1.4; }
.b-hact { display: flex; gap: 8px; flex-shrink: 0; margin-bottom: 6px; }
.b-hact .pill { height: 46px; }
.b-fail { margin: 20px 8px; color: var(--muted); font-weight: 600; }
.b-fail button { border: 0; background: none; font: 700 14px var(--ion-font-family); color: var(--text); text-decoration: underline; cursor: pointer; }
.b-bgrid { display: grid; grid-template-columns: minmax(0, 1fr); }
.b-left > .b-label:first-child, .b-mid > .b-label:first-child { margin-top: 18px; }

.b-fab { position: absolute; right: 18px; bottom: calc(92px + env(safe-area-inset-bottom)); display: flex; align-items: center; gap: 10px; height: 54px; padding: 6px 6px 6px 20px;
  border: 0; border-radius: 99px; background: var(--ink); color: var(--on-ink); font: 700 15px var(--ion-font-family); box-shadow: 0 14px 30px -12px rgba(0, 0, 0, .5); cursor: pointer; transition: transform .2s var(--spring); }
.b-fab:active { transform: scale(.96); }
.b-fab .ic { width: 42px; height: 42px; border-radius: 99px; background: var(--lime); color: var(--lime-ink); display: grid; place-items: center; }

@media (min-width: 768px) { .b-page { padding-bottom: 56px; } }
@media (min-width: 1100px) {
  .b-bgrid { grid-template-columns: minmax(0, 1fr) minmax(0, 1.45fr); grid-template-areas: "left mid" "rw rw"; gap: 0 24px; align-items: start; }
  .b-left { grid-area: left; } .b-mid { grid-area: mid; } .b-rw { grid-area: rw; }
}
@media (min-width: 1600px) {
  .b-bgrid { grid-template-columns: 420px minmax(0, 1fr) 460px; grid-template-areas: "left mid rw"; }
  .b-rw { position: sticky; top: 16px; }
}
@media (min-width: 2200px) { .b-bgrid { grid-template-columns: 480px minmax(0, 1fr) 600px; gap: 0 32px; } }
</style>
