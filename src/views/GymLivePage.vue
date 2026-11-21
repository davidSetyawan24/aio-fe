<template>
  <ion-page>
    <ion-content :fullscreen="true" class="gl-content">
      <div class="gl-bar" data-test="livebar">
        <div class="gl-barrow">
          <button type="button" class="gy-back" data-test="back" @click="goBack"><PhCaretLeft :size="18" weight="bold" />Gym</button>
          <div class="gl-mid">
            <small>{{ live ? `${PROGRAM_EMOJI[live.program]} Sesi ${PROGRAM_LABEL[live.program]}` : 'Sesi' }}</small>
            <b>{{ clock }}</b>
          </div>
          <button type="button" class="gl-fin" data-test="finish" :disabled="!live || store.finishing" @click="askFinish"><span class="i"><PhFlag :size="16" weight="bold" /></span>Selesai</button>
        </div>
        <div v-if="store.pending > 0" class="gl-pending"><span data-test="pending">⏳ {{ store.pending }} set belum kekirim</span></div>
      </div>

      <div ref="root" class="page gl-page">
        <p v-if="!live" class="gl-wait">Bentar ya…</p>
        <template v-else>
          <div class="gl-sum" data-test="lsum">mulai {{ wibTime(live.startedAt) }} · <b>{{ totalSets }} set</b> · {{ touched }} dari {{ items.length }} gerakan</div>
          <div class="gl-grid" :class="{ 'gl-guard': guard }" @click.capture="onGuardClick">
            <div>
              <div class="gl-list" data-test="list">
                <GymExerciseCard
                  v-for="(item, i) in items"
                  :key="item.exerciseId"
                  v-bind="cardProps(item, i)"
                  :open="i === openIdx"
                  :body="i === openIdx && !pc"
                  @toggle="toggle(i)"
                  @row="(k) => pickRow(item, k)"
                  @change="(j, v) => onChange(i, j, v)"
                  @check="(j, v) => onCheck(i, j, v)"
                  @save="(j, v) => onSave(i, j, v)"
                  @remove="(j) => onRemove(i, j)"
                  @addset="onAddSet(i)"
                  @next="goNext(i)"
                />
              </div>
              <button type="button" class="gl-addex" data-test="addex" :disabled="store.finishing" @click="addOpen = true"><PhPlus :size="18" weight="bold" />Tambah gerakan</button>
              <p class="gl-hint">Urutan bebas — tap gerakan mana aja. Yang nggak disentuh = dilewatin. Set yang belum dicentang nggak disimpen.</p>
            </div>
            <div v-if="pc && openItem" class="gl-pane" data-test="pane">
              <GymExerciseCard
                :key="openItem.exerciseId"
                v-bind="cardProps(openItem, openIdx)"
                open
                body
                @row="(k) => pickRow(openItem, k)"
                @change="(j, v) => onChange(openIdx, j, v)"
                @check="(j, v) => onCheck(openIdx, j, v)"
                @save="(j, v) => onSave(openIdx, j, v)"
                @remove="(j) => onRemove(openIdx, j)"
                @addset="onAddSet(openIdx)"
                @next="goNext(openIdx)"
              />
            </div>
          </div>
        </template>
      </div>

      <GymAddExerciseSheet
        v-if="live"
        :open="addOpen"
        :wide="wide"
        :program="live.program"
        :programs="store.data?.programs ?? []"
        :exercises="store.exercises"
        :exclude="items.map((it) => it.exerciseId)"
        @close="addOpen = false"
        @add="onAddExercise"
      />
    </ion-content>
    <GymRestBar v-if="timer" :timer="timer" :now="now" @plus30="onPlus30" @skip="onSkip" />
  </ion-page>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { IonContent, IonPage, actionSheetController, onIonViewWillEnter, onIonViewWillLeave, useIonRouter } from '@ionic/vue'
import { PhCaretLeft, PhFlag, PhPlus } from '@phosphor-icons/vue'
import GymAddExerciseSheet from '@/components/gym/GymAddExerciseSheet.vue'
import GymExerciseCard from '@/components/gym/GymExerciseCard.vue'
import GymRestBar from '@/components/gym/GymRestBar.vue'
import '@/components/gym/gym.css'
import '@/components/gym/gymLive.css'
import { beep, unlockAudio } from '@/lib/beep.js'
import { plus30, startTimer, validTimer } from '@/lib/gymTimer.js'
import { PROGRAM_EMOJI, PROGRAM_LABEL, bestSet, clockText, livePr, setText, wibTime } from '@/lib/gym.js'
import { useMedia } from '@/lib/media.js'
import { showToast } from '@/lib/personalForm.js'
import { useGymStore } from '@/stores/gym.js'

const GYM = '/tabs/menu/gym'
const store = useGymStore()
const ionRouter = useIonRouter()
const pc = useMedia('(min-width: 1100px)')
const wide = useMedia('(min-width: 768px)')
const root = ref(null)
const now = ref(Date.now())
const addOpen = ref(false)
/** Baris yang kebuka di editor per gerakan (exerciseId → kunci baris / null). Nggak ada = set pertama yang belum ✓. */
const cursors = reactive({})
let active = false
let leaving = false
let tick = null

// Draf sesi di HP langsung dibuka (tanpa nunggu jaringan).
store.restore()

const live = computed(() => store.live)
const items = computed(() => live.value?.items ?? [])
const openIdx = computed(() => live.value?.open ?? -1)
const openItem = computed(() => items.value[openIdx.value] ?? null)
const exById = computed(() => new Map(store.exercises.map((x) => [x.id, x])))
const doneOf = (item) => item.rows.filter((r) => r.done)
const totalSets = computed(() => items.value.reduce((n, it) => n + doneOf(it).length, 0))
const touched = computed(() => items.value.filter((it) => doneOf(it).length).length)
const clock = computed(() => (live.value ? clockText((now.value - Date.parse(live.value.startedAt)) / 1000) : '00:00:00'))
const timer = computed(() => (validTimer(live.value?.timer) ? live.value.timer : null))
const nameOf = (item) => exById.value.get(item.exerciseId)?.name ?? 'Gerakan'

function curOf(item) {
  const id = item.exerciseId
  if (id in cursors) {
    const k = cursors[id]
    if (k === null || item.rows.some((r) => r.key === k)) return k
  }
  return item.rows.find((r) => !r.done)?.key ?? null
}
/** Gerakan pertama (selain ini) yang belum disentuh. */
const nextOf = (i) => items.value.findIndex((it, k) => k !== i && !doneOf(it).length)

function cardProps(item, i) {
  const n = nextOf(i)
  return {
    item,
    index: i,
    exercise: exById.value.get(item.exerciseId) ?? null,
    cur: curOf(item),
    nextName: n >= 0 ? nameOf(items.value[n]) : null,
    disabled: store.finishing,
  }
}

/** HP: gerakan yang baru kebuka digulung ke atas (di bawah bar). PC: panel kanan, nggak perlu. */
function scrollToOpen() {
  if (pc.value) return
  nextTick(() => root.value?.querySelector('.gl-list .gl-ex.open')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }))
}
function openAt(i) {
  const item = items.value[i]
  if (item) delete cursors[item.exerciseId]
  store.setOpen(i)
  scrollToOpen()
}
function toggle(i) {
  if (i === openIdx.value) {
    if (!pc.value) store.setOpen(-1)
    return
  }
  openAt(i)
}
const goNext = (i) => openAt(nextOf(i))

function pickRow(item, key) {
  cursors[item.exerciseId] = curOf(item) === key ? null : key
}

/** Angka set yang belum ✓ langsung kesimpen di draf HP (biar nggak ilang kalau app ketutup). */
function onChange(i, j, vals) {
  if (!items.value[i]?.rows[j]?.done) store.edit(i, j, vals)
}

/** Tap kedua yang kebut abis ✓ jangan kena editor set berikutnya yang baru muncul (±350 ms). */
const GUARD_MS = 350
const guard = ref(false)
let guardUntil = 0
let guardTimer = null
function startGuard() {
  guardUntil = Date.now() + GUARD_MS
  guard.value = true
  clearTimeout(guardTimer)
  guardTimer = setTimeout(() => (guard.value = false), GUARD_MS)
}
function onGuardClick(e) {
  if (Date.now() >= guardUntil || !e.target?.closest?.('[data-test="editor"]')) return
  e.stopPropagation()
  e.preventDefault()
}

function onCheck(i, j, vals) {
  const item = items.value[i]
  if (!item) return
  unlockAudio()
  const set = [Math.round(vals.weight * 100) / 100, vals.reps]
  const pr = livePr(set, exById.value.get(item.exerciseId)?.record ?? null, bestSet(doneOf(item).map((r) => [r.weight, r.reps])))
  if (!store.check(i, j, vals)) return
  delete cursors[item.exerciseId]
  startGuard()
  if (pr) showToast(`🏆 PR baru: ${setText(set)}`)
  // Abis ✓: timer istirahat gerakan ini nyala (✓ baru = timer diganti).
  const t = Date.now()
  store.setTimer(startTimer(exById.value.get(item.exerciseId)?.restSec ?? 120, nameOf(item), t))
  now.value = t
}

function onPlus30() {
  if (timer.value) store.setTimer(plus30(timer.value))
}
const onSkip = () => store.setTimer(null)

/**
 * Timer udah lewat? Tandain & bunyiin SEKALI. Bunyi cuma kalau halaman keliatan dan lewatnya baru aja
 * (bukan pas balik dari background / buka ulang app) → nggak pernah bunyi telat.
 */
const BEEP_FRESH_MS = 1500
function checkTimer(canBeep = true) {
  const t = timer.value
  if (!t || t.beeped || Date.now() < t.endAt) return
  const fresh = Date.now() - t.endAt <= BEEP_FRESH_MS
  store.markBeeped()
  if (canBeep && fresh && document.visibilityState === 'visible') beep()
}

function onSave(i, j, vals) {
  const item = items.value[i]
  if (!item || !store.edit(i, j, vals)) return
  delete cursors[item.exerciseId]
  showToast('Set dibenerin ✓')
}

function onRemove(i, j) {
  const item = items.value[i]
  if (!item || !store.remove(i, j)) return
  delete cursors[item.exerciseId]
  showToast('Set dihapus')
}

function onAddSet(i) {
  const j = store.addSet(i)
  const item = items.value[i]
  if (j >= 0 && item) cursors[item.exerciseId] = item.rows[j].key
}

function onAddExercise(x) {
  addOpen.value = false
  // Udah ada di sesi → cukup buka kartunya.
  const have = items.value.findIndex((it) => it.exerciseId === x.id)
  if (have >= 0) {
    openAt(have)
    return
  }
  if (store.addExercise(x) < 0) return
  delete cursors[x.id]
  showToast(`${x.name} ditambahin`)
  scrollToOpen()
}

// ---- Selesai ----

function finishText() {
  const left = items.value.filter((it) => doneOf(it).length).reduce((n, it) => n + it.rows.length - doneOf(it).length, 0)
  const skipped = items.value.filter((it) => !it.extra && !doneOf(it).length).map(nameOf)
  return `${totalSets.value} set kesimpen.${left ? ` ${left} set yang belum dicentang nggak ikut.` : ''}${skipped.length ? ` Dilewatin: ${skipped.join(', ')}.` : ''}`
}

let asking = false
async function askFinish() {
  if (asking || !live.value || store.finishing) return
  asking = true
  try {
    const empty = totalSets.value === 0
    const sheet = await actionSheetController.create(
      empty
        ? {
            header: 'Belum ada set yang dicentang — sesi ini dibuang?',
            buttons: [{ text: 'Buang sesi', role: 'destructive', data: 'discard' }, { text: 'Lanjut latihan', role: 'cancel' }],
          }
        : {
            header: `Selesai sesi ${PROGRAM_LABEL[live.value.program]}?`,
            subHeader: finishText(),
            buttons: [{ text: 'Selesai', data: 'finish' }, { text: 'Lanjut latihan', role: 'cancel' }],
          },
    )
    await sheet.present()
    const { data } = await sheet.onDidDismiss()
    if (data === 'finish') await finish()
    else if (data === 'discard') await discard()
  } finally {
    asking = false
  }
}

async function finish() {
  leaving = true
  try {
    const report = await store.finish()
    ionRouter.replace(`${GYM}/selesai/${report.session.id}`)
  } catch (e) {
    leaving = false
    showToast(e?.message || 'Sesinya belum keselesaiin. Coba lagi.')
  }
}

async function discard() {
  leaving = true
  try {
    await store.discard()
    ionRouter.navigate(GYM, 'back', 'replace')
  } catch (e) {
    leaving = false
    showToast(e?.message || 'Sesinya belum kebuang. Coba lagi.')
  }
}

// ---- Masuk / keluar halaman ----

const toGym = () => ionRouter.navigate(GYM, 'back', 'replace')
// ‹ Gym: sesi tetep jalan.
const goBack = () => (ionRouter.canGoBack() ? ionRouter.back() : toGym())

/** Ada draf → cocokin sama server di belakang. Nggak ada → coba muat dulu (sesi dari device lain), masih nggak ada → balik ke Gym. */
async function ensureLive() {
  if (store.live) {
    store.load().catch(() => {})
    return
  }
  try {
    await store.load()
  } catch {
    // offline: nggak ada draf di HP ini
  }
  if (!store.live && active && !leaving) toGym()
}

// Sesinya ilang pas halaman kebuka (diselesaiin / dibuang dari tempat lain) → balik ke Gym.
watch(live, (v) => {
  if (!v && active && !leaving) toGym()
})
watch(
  () => store.notice?.id,
  () => store.notice && showToast(store.notice.text),
)

const TICK_MS = 300
function startTick() {
  now.value = Date.now()
  checkTimer(false)
  if (!tick)
    tick = setInterval(() => {
      now.value = Date.now()
      checkTimer()
    }, TICK_MS)
  document.addEventListener('visibilitychange', onVisible)
}
function stopTick() {
  clearInterval(tick)
  tick = null
  clearTimeout(guardTimer)
  guard.value = false
  guardUntil = 0
  document.removeEventListener('visibilitychange', onVisible)
}
/** Balik keliatan (mis. dari Spotify): sisa waktu dihitung ulang dari jam selesai, kalau udah lewat → tanpa bunyi. */
function onVisible() {
  now.value = Date.now()
  checkTimer(true)
}

let entered = false
onMounted(() => {
  active = true
  startTick()
  ensureLive()
})
onIonViewWillEnter(() => {
  active = true
  leaving = false
  startTick()
  addOpen.value = false
  if (entered) {
    store.restore()
    ensureLive()
  }
  entered = true
})
onIonViewWillLeave(() => {
  active = false
  addOpen.value = false
  stopTick()
})
onBeforeUnmount(() => {
  active = false
  stopTick()
})
</script>

<style scoped>
/* Tab bar disembunyiin di sesi: padding bawah global (buat tab bar) diganti padding halaman (muat bar timer istirahat). */
ion-content.gl-content::part(scroll) { padding-bottom: 0; }
</style>
