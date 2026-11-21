<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page gy-page">
        <div class="gy-toprow">
          <button type="button" class="gy-back" data-test="back" @click="goBack"><PhCaretLeft :size="18" weight="bold" />Semua menu</button>
        </div>
        <span class="eyebrow rise"><span class="dot" />Kesehatan</span>
        <h1 class="h1 rise" style="--i: 1">Gym.<span data-test="sub">{{ sub }}</span></h1>

        <button v-if="liveInfo" type="button" class="gy-livecard rise" data-test="livecard" @click="goLive">
          <span class="em">{{ PROGRAM_EMOJI[liveInfo.program] }}</span>
          <span class="grow"><b>Sesi {{ PROGRAM_LABEL[liveInfo.program] }} lagi jalan</b><small><i class="dot" />{{ clock }} · {{ liveInfo.sets }} set</small></span>
          <span class="gobtn">Lanjut <PhCaretRight :size="16" weight="bold" /></span>
        </button>

        <p v-if="failed" class="gy-fail" data-test="failed">Nggak bisa muat data gym. <button type="button" @click="load">Coba lagi</button></p>
        <p v-else-if="!data" class="gy-wait" data-test="wait">Bentar ya…</p>

        <template v-else>
          <div class="gy-label rise" style="--i: 1"><span>Pilih latihan</span><small v-if="liveInfo" data-test="busy">selesaiin sesi yang jalan dulu</small></div>
          <GymTiles :programs="data.programs" :today="today" :disabled="!!liveInfo" @pick="openPick" />

          <div class="gy-gmain">
            <section>
              <template v-if="data.firstOn">
                <div class="gy-label rise" style="--i: 6"><span>Minggu ini</span></div>
                <GymWeek :week="data.week" :today="today" />
                <div class="gy-label rise" style="--i: 7"><span>Riwayat</span><button type="button" class="gy-lk" data-test="go-history" @click="go('riwayat')">Semua <PhCaretRight :size="14" weight="bold" /></button></div>
                <div class="shell rise" style="--i: 7"><div class="gy-core"><GymHistoryRows :sessions="data.recent" @open="(id) => go(`riwayat/${id}`)" /></div></div>
              </template>
              <template v-else>
                <div class="gy-label"><span>Riwayat</span></div>
                <div class="shell"><div class="gy-core gy-empty" data-test="empty"><div class="em">🏋️</div><h2>Belum ada sesi</h2><p>Pilih latihan di atas buat mulai. Angka tiap set kesimpen di sini, sesi berikutnya tinggal nerusin.</p></div></div>
              </template>
            </section>
            <section>
              <template v-if="data.firstOn && mini">
                <div class="gy-label rise" style="--i: 8"><span>Grafik gerakan</span><button type="button" class="gy-lk" @click="openChart">Buka <PhCaretRight :size="14" weight="bold" /></button></div>
                <div class="shell rise" style="--i: 8">
                  <div class="gy-core">
                    <button type="button" class="gy-minichart" data-test="mini" @click="openChart">
                      <span class="gy-mctop"><b>{{ mini.name }}</b><span>terakhir <b>{{ setText(mini.last) }}</b></span></span>
                      <GymMiniChart :points="data.mini.points" mini />
                    </button>
                  </div>
                </div>
              </template>
              <div class="gy-label rise" style="--i: 9"><span>Program</span></div>
              <div class="shell rise" style="--i: 9">
                <div class="gy-core">
                  <button type="button" class="gy-linkrow" data-test="go-program" @click="go('program')"><span class="ic">🗂️</span><span class="grow"><b>Atur program</b><small>Gerakan tiap latihan, urutan, istirahat</small></span><span class="go"><PhCaretRight :size="18" weight="bold" /></span></button>
                  <button v-if="data.firstOn" type="button" class="gy-linkrow" data-test="go-history-link" @click="go('riwayat')"><span class="ic">📜</span><span class="grow"><b>Semua riwayat</b><small>{{ data.totalSessions }} sesi sejak {{ dShort(data.firstOn) }}</small></span><span class="go"><PhCaretRight :size="18" weight="bold" /></span></button>
                </div>
              </div>
            </section>
          </div>
        </template>
      </div>

      <GymPickSheet v-if="data" :open="pick.open" :program="pick.key" :programs="data.programs" :exercises="data.exercises" :wide="wide" @close="pick.open = false" @start="startSession" />
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { IonContent, IonPage, onIonViewWillEnter, onIonViewWillLeave, useIonRouter } from '@ionic/vue'
import { PhCaretLeft, PhCaretRight } from '@phosphor-icons/vue'
import GymHistoryRows from '@/components/gym/GymHistoryRows.vue'
import GymMiniChart from '@/components/gym/GymMiniChart.vue'
import GymPickSheet from '@/components/gym/GymPickSheet.vue'
import GymTiles from '@/components/gym/GymTiles.vue'
import GymWeek from '@/components/gym/GymWeek.vue'
import '@/components/gym/gym.css'
import { HARI, weekdayOf } from '@/lib/agenda.js'
import { dShort } from '@/lib/badanView.js'
import { PROGRAM_EMOJI, PROGRAM_LABEL, bestSet, setText } from '@/lib/gym.js'
import { wibNow } from '@/lib/home.js'
import { useMedia } from '@/lib/media.js'
import { useGymStore } from '@/stores/gym.js'

const BASE = '/tabs/menu/gym'
const store = useGymStore()
const ionRouter = useIonRouter()
const wide = useMedia('(min-width: 768px)')
const failed = ref(false)
const today = ref(wibNow().date)
const now = ref(Date.now())
const pick = reactive({ open: false, key: 'push' })
let starting = false
let tick = null

// Draf sesi di HP (bisa ada walau lagi offline) langsung dibuka biar kartu "lagi jalan" nongol dari awal.
store.restore()

const data = computed(() => store.data)
const sub = computed(() => `${HARI[weekdayOf(today.value)]}, ${dShort(today.value)} · latihan apa hari ini?`)

/** Sesi yang lagi jalan: draf di HP ini, atau (kalau dimulai dari device lain) yang dibawa server. */
const liveInfo = computed(() => {
  const l = store.live
  if (l) return { program: l.program, startedAt: l.startedAt, sets: l.items.reduce((n, it) => n + it.rows.filter((r) => r.done).length, 0) }
  const a = store.data?.active
  return a ? { program: a.program, startedAt: a.startedAt, sets: a.sets.length } : null
})
const clock = computed(() => {
  if (!liveInfo.value) return ''
  const sec = Math.max(0, Math.floor((now.value - new Date(liveInfo.value.startedAt).getTime()) / 1000))
  const p = (n) => String(n).padStart(2, '0')
  return `${p(Math.floor(sec / 3600))}:${p(Math.floor(sec / 60) % 60)}:${p(sec % 60)}`
})

/** Gerakan di kartu grafik mini: namanya + beban terberat titik terakhir. */
const mini = computed(() => {
  const m = store.data?.mini
  if (!m || !m.points.length) return null
  const x = store.data.exercises.find((e) => e.id === m.exerciseId)
  return { name: x?.name ?? 'Gerakan', last: bestSet([m.points[m.points.length - 1].best]) }
})

async function load() {
  failed.value = false
  try {
    await store.load()
  } catch {
    failed.value = !store.data
  }
}

const go = (sub) => ionRouter.push(`${BASE}/${sub}`)
const goLive = () => ionRouter.push(`${BASE}/sesi`)
const openChart = () => ionRouter.push(`${BASE}/grafik?gerakan=${store.data.mini.exerciseId}`)
const goBack = () => (ionRouter.canGoBack() ? ionRouter.back() : ionRouter.navigate('/tabs/menu', 'back', 'replace'))

function openPick(key) {
  if (liveInfo.value) return
  starting = false
  pick.key = key
  pick.open = true
}
/** Mulai sesi langsung (tanpa nunggu jaringan): draf dibikin di HP, kirim ke server di belakang. */
function startSession(key) {
  if (starting || liveInfo.value) return
  starting = true
  store.start(key)
  pick.open = false
  ionRouter.push(`${BASE}/sesi`)
}

function startTick() {
  if (!tick) tick = setInterval(() => (now.value = Date.now()), 1000)
}
function stopTick() {
  clearInterval(tick)
  tick = null
}

let entered = false
onMounted(() => {
  startTick()
  load()
})
onIonViewWillLeave(stopTick)
onIonViewWillEnter(() => {
  today.value = wibNow().date
  now.value = Date.now()
  startTick()
  pick.open = false
  if (entered) load()
  entered = true
})
onBeforeUnmount(stopTick)
</script>
