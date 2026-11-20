<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page b-page">
        <div class="b-toprow">
          <button type="button" class="b-back" data-test="back" @click="goBack"><PhCaretLeft :size="18" weight="bold" />Semua menu</button>
          <button v-if="!wide" type="button" class="pill ghost small b-hpman" data-test="manual-small" @click="choose(MANUAL_CHOICE)"><PhPencilSimple :size="16" />&nbsp;Isi manual</button>
        </div>
        <span class="eyebrow rise"><span class="dot" />Badan</span>
        <div class="b-headrow">
          <h1 class="h1 rise b-h1" style="--i: 1">Badan.<span class="b-sub" data-test="sub">{{ subText }}</span></h1>
          <div v-if="wide" class="b-hact">
            <button type="button" class="pill ghost" data-test="manual" @click="choose(MANUAL_CHOICE)"><PhPencilSimple :size="17" />&nbsp;Isi manual</button>
            <button type="button" class="pill b-alt" data-test="sleep-upload" @click="openPanel('sleepUpload')">Upload tidur <span class="ic"><PhMoon :size="16" weight="bold" /></span></button>
            <button type="button" class="pill" data-test="upload" @click="openPanel('upload')">Upload timbangan <span class="ic"><PhUploadSimple :size="17" weight="bold" /></span></button>
          </div>
        </div>

        <p v-if="failed" class="b-fail" data-test="failed">Nggak bisa muat data badan. <button type="button" @click="load">Coba lagi</button></p>

        <BadanEmpty
          v-else-if="isEmpty" :food="store.food" :target="store.target" :sleep="store.lastSleep" :sleep-sum="store.sleepSum" :today="today"
          @upload="openPanel('upload')" @manual="choose(MANUAL_CHOICE)" @sleep="openPanel('sleepUpload')" @target="openPanel('target')" @open-sleep="(id) => openPanel('sleepDetail', id)"
        />

        <div v-else-if="store.loaded" class="b-bgrid" data-test="main">
          <section class="b-left">
            <div class="b-label rise">Sekarang</div>
            <BadanHero :summary="store.summary" :last="store.last" :today="today" />
            <BadanTarget :target="store.target" :summary="store.summary" :rows="store.rows" :pace="store.pace" :pace-eta="store.paceEtaInfo" @edit="openPanel('target')" />
            <BadanFood :food="store.food" :target="store.target" :count="store.summary.count" @target="openPanel('target')" @upload="openPanel('upload')" />
          </section>
          <section class="b-mid">
            <BadanChart :key="chartKey" :rows="store.sorted" :sleeps="store.sleeps" :target="store.target" :last-on="store.summary.lastOn" />
            <BadanLast :last="store.last" :today="today" @open="(id) => openPanel('detail', id)" />
            <BadanSleepCard :sleep="store.lastSleep" :summary="store.sleepSum" :today="today" @open="(id) => openPanel('sleepDetail', id)" />
          </section>
          <section class="b-rw">
            <BadanHistory :rows="store.sorted" :sleeps="store.sleeps" :today="today" :all="pc" @open="(id) => openPanel('detail', id)" @open-sleep="(id) => openPanel('sleepDetail', id)" />
          </section>
        </div>
      </div>

      <BadanPanel v-if="wide" :open="panel.open" :view="panel.view" :id="panel.id" :form-key="panel.key" @close="closePanel" @edit="(i) => openPanel('edit', i)" @detail="(i) => openPanel('detail', i)" @manual="openPanel('manual')" @sleep-detail="(i) => openPanel('sleepDetail', i)" @sleep-edit="(i) => openPanel('sleepEdit', i)" @sleep-manual="openPanel('sleepManual')" @done="onPanelDone" />

      <BadanTargetSheet :open="targetOpen" :target="store.target" :summary="store.summary" :wide="wide" @close="targetOpen = false" />

      <button v-if="!wide && !isEmpty && store.loaded" slot="fixed" type="button" class="b-fab" data-test="fab" @click="choose(UPLOAD_CHOICE)">
        Upload <span class="ic"><PhUploadSimple :size="19" weight="bold" /></span>
      </button>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { IonContent, IonPage, actionSheetController, onIonViewWillEnter, onIonViewWillLeave, useIonRouter } from '@ionic/vue'
import { PhCaretLeft, PhMoon, PhPencilSimple, PhUploadSimple } from '@phosphor-icons/vue'
import { useRoute, useRouter } from 'vue-router'
import BadanChart from '@/components/badan/BadanChart.vue'
import BadanEmpty from '@/components/badan/BadanEmpty.vue'
import BadanFood from '@/components/badan/BadanFood.vue'
import BadanHero from '@/components/badan/BadanHero.vue'
import BadanHistory from '@/components/badan/BadanHistory.vue'
import BadanLast from '@/components/badan/BadanLast.vue'
import BadanPanel from '@/components/badan/BadanPanel.vue'
import BadanSleepCard from '@/components/badan/BadanSleepCard.vue'
import BadanTargetSheet from '@/components/badan/BadanTargetSheet.vue'
import BadanTarget from '@/components/badan/BadanTarget.vue'
import '@/components/badan/badan.css'
import { ARAH_INFO } from '@/lib/badan.js'
import { headerSub, isBadanChild } from '@/lib/badanView.js'
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
/** Naik tiap Badan dibuka lagi dari luar → grafik di-remount (balik ke pilihan bawaan). */
const chartKey = ref(0)
/** Keluar ke halaman anak Badan (detail / catat / ubah / upload di HP) → pas balik pilihan grafik tetep. */
let toChild = false

const isEmpty = computed(() => store.loaded && store.weighings.length === 0)
const subText = computed(() => {
  if (isEmpty.value) return headerSub(null, null, null, today.value, store.lastSleep)
  const s = store.summary
  if (!s) return ''
  return headerSub(s.arah ? ARAH_INFO[s.arah].n : null, s.lastOn, s.lastAt, today.value, store.lastSleep)
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
const PATHS = {
  upload: () => `${BASE}/upload`, manual: () => `${BASE}/catat`, detail: (id) => `${BASE}/${id}`, edit: (id) => `${BASE}/${id}/ubah`,
  sleepManual: () => `${BASE}/tidur/catat`, sleepDetail: (id) => `${BASE}/tidur/${id}`, sleepEdit: (id) => `${BASE}/tidur/${id}/ubah`,
  sleepUpload: () => `${BASE}/tidur/upload`,
}
const targetOpen = ref(false)
function openPanel(view, id = null) {
  if (view === 'target') {
    targetOpen.value = true
    return
  }
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
  else if (panel.view === 'sleepEdit') openPanel('sleepDetail', panel.id)
  else closePanel()
  if (message) showToast(message)
}
/** FAB "Upload" (HP) & semua tombol "Isi manual" (header HP/PC, layar kosong) nanya dulu timbangan atau tidur. */
const UPLOAD_CHOICE = { header: 'Upload apa?', subHeader: 'Pilih gambar yang mau dibaca.', views: ['upload', 'sleepUpload'] }
const MANUAL_CHOICE = { header: 'Isi manual apa?', views: ['manual', 'sleepManual'] }
let choosing = false
async function choose({ views, ...texts }) {
  if (choosing) return
  choosing = true
  try {
    const sheet = await actionSheetController.create({
      ...texts,
      buttons: [{ text: '⚖️ Timbangan', data: views[0] }, { text: '🌙 Tidur', data: views[1] }, { text: 'Batal', role: 'cancel' }],
    })
    await sheet.present()
    const { data } = await sheet.onDidDismiss()
    if (views.includes(data)) openPanel(data)
  } finally {
    choosing = false
  }
}
defineExpose({ openPanel, panel, targetOpen })

const LINK_VIEWS = ['detail', 'edit', 'manual', 'upload', 'sleepDetail', 'sleepEdit', 'sleepManual', 'sleepUpload']
const WEIGHING_ID = new Set(['detail', 'edit'])
const SLEEP_ID = new Set(['sleepDetail', 'sleepEdit'])
/**
 * Lemparan dari halaman anak di layar lebar (?panel=<view>&id=<id>). Baru dijalanin abis datanya ke-muat; abis dipakai query dibuang.
 */
function followLink() {
  if (!store.loaded || !route || route.path !== BASE) return
  const { panel: wanted, id, ...rest } = route.query
  if (wanted === undefined) return
  router?.replace({ path: BASE, query: rest })
  const num = Number(id)
  if (!LINK_VIEWS.includes(wanted) || !wide.value) return
  const rows = WEIGHING_ID.has(wanted) ? store.weighings : SLEEP_ID.has(wanted) ? store.sleeps : null
  if (rows && (!Number.isInteger(num) || !rows.some((r) => r.id === num))) return
  openPanel(wanted, rows ? num : null)
}
watch([() => store.loaded, () => route?.query, () => route?.path], followLink, { immediate: true })

const goBack = () => (ionRouter.canGoBack() ? ionRouter.back() : ionRouter.navigate('/tabs/menu', 'back', 'replace'))

let entered = false
onMounted(load)
// Pas ini jalan rute global udah pindah ke tujuan.
onIonViewWillLeave(() => (toChild = isBadanChild(route?.path)))
onIonViewWillEnter(() => {
  if (!toChild) chartKey.value += 1
  toChild = false
  today.value = wibNow().date
  if (entered) load()
  entered = true
})
</script>

<style scoped>
.b-toprow { display: flex; align-items: center; justify-content: space-between; min-height: 44px; }
.b-back { display: inline-flex; align-items: center; gap: 2px; height: 44px; margin-left: -6px; padding: 0 8px 0 6px; border: 0; background: none; color: var(--muted); font: 700 14.5px var(--ion-font-family); cursor: pointer; }
.b-headrow { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; }
/* iPad (768–1099): sub-judul dapet lebar penuh, tombol turun ke baris sendiri. */
@media (min-width: 768px) and (max-width: 1099px) {
  .b-headrow { flex-direction: column; align-items: flex-start; gap: 6px; }
  .b-hact { margin-bottom: 0; }
}
.b-h1 { margin-bottom: 4px; }
.b-sub { display: block; font-size: 15px; letter-spacing: -0.01em; margin-top: 8px; line-height: 1.4; }
.b-hact { display: flex; flex-wrap: wrap; gap: 8px; flex-shrink: 0; margin-bottom: 6px; }
.b-hact .pill { height: 46px; }
/* Upload tidur: pill hitam, ikonnya nggak lime biar Upload timbangan tetep yang utama. */
.b-alt .ic { background: rgba(255, 255, 255, .14); color: var(--on-ink); }
:root.theme-dark .b-alt .ic { background: rgba(0, 0, 0, .1); }
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
