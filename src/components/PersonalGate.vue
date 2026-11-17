<template>
  <div v-if="store.unlocked">
    <slot v-if="store.today !== null" />
    <div v-else class="p-state" data-test="loading">
      <template v-if="loadError">
        <p>{{ loadError }}</p>
        <button type="button" class="pill ghost" @click="loadData">Coba lagi</button>
      </template>
      <p v-else>Lagi dimuat…</p>
    </div>
  </div>

  <div v-else class="p-gate">
    <button v-if="!wide" type="button" class="p-back" data-test="back" @click="goBack"><PhCaretLeft :size="18" weight="bold" />Semua menu</button>

    <div v-if="store.status === null" class="p-state" data-test="status-state">
      <template v-if="statusError">
        <p>{{ statusError }}</p>
        <button type="button" class="pill ghost" @click="checkStatus">Coba lagi</button>
      </template>
      <p v-else>Lagi ngecek…</p>
    </div>

    <div v-else-if="!store.status.configured" class="p-state" data-test="unconfigured">
      <div class="p-lic"><PhLockKey :size="34" weight="fill" /></div>
      <p>Data Pribadi belum disetel di server.</p>
    </div>

    <div v-else class="p-card">
      <div v-if="view === 'forgot'" class="p-forgot-box" data-test="forgot-box">
        <div class="p-lic"><PhKey :size="34" weight="fill" /></div>
        <h2>Lupa PIN?</h2>
        <p>Masukin password akun AIO lo dulu. Abis itu lo bikin PIN baru.</p>
        <input v-model="password" class="p-input" type="password" autocomplete="current-password" placeholder="Password akun" @keydown.enter.prevent="forgotNext" />
        <div class="p-perr" role="alert">{{ error }}</div>
        <button type="button" class="p-next" data-test="forgot-next" @click="forgotNext">Lanjut <span><PhArrowRight :size="20" weight="bold" /></span></button>
        <button type="button" class="p-link" @click="toPin">Balik</button>
      </div>

      <template v-else>
        <PinPad :mode="mode" :error="error" :wait-sec="waitSec" @done="onDone" @forgot="toForgot" />
        <button v-if="view === 'forgot-pin'" type="button" class="p-link" @click="toPin">Balik</button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { toastController, useIonRouter } from '@ionic/vue'
import { PhArrowRight, PhCaretLeft, PhKey, PhLockKey } from '@phosphor-icons/vue'
import PinPad from '@/components/PinPad.vue'
import { useMedia } from '@/lib/media.js'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { usePersonalStore } from '@/stores/personal.js'

/** Gerbang Data Pribadi: kekunci → layar PIN; kebuka → isi (slot) setelah datanya dimuat. */
const store = usePersonalStore()
const ionRouter = useIonRouter()
const wide = useMedia('(min-width: 1100px)')

const view = ref('pin') // pin | forgot | forgot-pin
const first = ref(null) // PIN pertama waktu bikin PIN, nunggu diulangi
const error = ref('')
const password = ref('')
const waitSec = ref(0)
const busy = ref(false)
const statusError = ref('')
const loadError = ref('')

const mode = computed(() => {
  if (store.status?.hasPin && view.value !== 'forgot-pin') return 'unlock'
  return first.value === null ? 'create' : 'confirm'
})

const goBack = () => (ionRouter.canGoBack() ? ionRouter.back() : ionRouter.navigate('/tabs/menu', 'back', 'replace'))
const toast = async (message) => (await toastController.create({ message, duration: 1800, position: 'top', cssClass: 'aio-toast' })).present()

async function checkStatus() {
  statusError.value = ''
  try {
    if (store.booted) await store.loadStatus()
    else await store.boot()
  } catch (err) {
    statusError.value = apiErrorMessage(err)
  }
}

async function loadData() {
  loadError.value = ''
  try {
    await store.load()
  } catch (err) {
    // 423 = kekunci lagi → layar PIN muncul sendiri.
    if (err?.status !== 423) loadError.value = apiErrorMessage(err)
  }
}

function reset() {
  view.value = 'pin'
  first.value = null
  error.value = ''
  password.value = ''
}
const toPin = () => reset()
function toForgot() {
  reset()
  view.value = 'forgot'
}
function forgotNext() {
  if (!password.value) {
    error.value = 'Isi password-nya dulu.'
    return
  }
  error.value = ''
  first.value = null
  view.value = 'forgot-pin'
}

let timer = null
function startWait(seconds) {
  waitSec.value = Math.max(1, Math.ceil(seconds))
  clearInterval(timer)
  timer = setInterval(() => {
    waitSec.value -= 1
    if (waitSec.value <= 0) {
      waitSec.value = 0
      clearInterval(timer)
    }
  }, 1000)
}

async function onDone(pin) {
  if (busy.value) return
  error.value = ''
  if (mode.value === 'unlock') return tryUnlock(pin)
  if (first.value === null) {
    first.value = pin
    return
  }
  if (first.value !== pin) {
    first.value = null
    error.value = 'PIN-nya nggak sama. Ulang dari awal ya.'
    return
  }
  return savePin(pin)
}

async function tryUnlock(pin) {
  busy.value = true
  try {
    await store.unlock(pin)
  } catch (err) {
    if (err?.status === 422 && err.fields?.left !== undefined) error.value = `PIN salah. Sisa ${err.fields.left}× lagi.`
    else if (err?.status === 429) startWait(err.fields?.retryAfterSec ?? 60)
    else error.value = err?.message ?? 'Ada yang error. Coba lagi ya.'
  } finally {
    busy.value = false
  }
}

async function savePin(pin) {
  busy.value = true
  const resetting = view.value === 'forgot-pin'
  try {
    if (resetting) await store.resetPin(password.value, pin)
    else await store.setPin(pin)
    reset()
    toast(resetting ? 'PIN baru udah dipasang ✓' : 'PIN udah dipasang ✓').catch(() => {})
  } catch (err) {
    first.value = null
    error.value = err?.message ?? 'Ada yang error. Coba lagi ya.'
    // Password salah → balik ke langkah password.
    if (resetting && err?.status === 422) view.value = 'forgot'
  } finally {
    busy.value = false
  }
}

watch(() => store.unlocked, (open) => {
  if (open) loadData()
  else reset()
}, { immediate: true })

onMounted(checkStatus)
onBeforeUnmount(() => clearInterval(timer))
</script>

<style scoped>
.p-gate { min-height: 70%; }
.p-back { display: flex; align-items: center; gap: 4px; width: fit-content; margin: 0 0 4px -6px; padding: 6px 12px 6px 6px; border: 0; border-radius: 99px;
  background: transparent; color: var(--muted); font: 600 14px var(--ion-font-family); cursor: pointer; }
.p-back:active { background: var(--soft); }
.p-state { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 60px 20px; text-align: center; color: var(--muted); font-weight: 600; font-size: 14px; }
.p-state p { margin: 0; max-width: 300px; line-height: 1.5; }
.p-lic { width: 72px; height: 72px; border-radius: 24px; background: var(--ink); color: var(--lime); display: grid; place-items: center; margin: 22px 0 18px; }
:root.theme-dark .p-lic { color: #141410; background: var(--lime); }
.p-card { display: flex; flex-direction: column; align-items: center; }
@media (min-width: 1100px) {
  .p-gate { display: grid; place-items: center; min-height: 80%; }
  .p-card { width: 380px; padding: 30px; border-radius: 32px; background: var(--card); box-shadow: 0 0 0 1px var(--hair), var(--lift); }
}
.p-forgot-box { display: flex; flex-direction: column; align-items: center; text-align: center; padding-top: 12px; width: 100%; }
.p-forgot-box h2 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.035em; }
.p-forgot-box p { margin: 6px 0 0; color: var(--muted); font-size: 14px; font-weight: 600; line-height: 1.45; max-width: 290px; }
.p-input { width: 100%; max-width: 300px; height: 50px; margin-top: 24px; padding: 0 16px; border: 0; outline: 0; border-radius: 18px; background: var(--soft); color: var(--text); font: 600 16px var(--ion-font-family); }
.p-perr { min-height: 20px; margin-top: 8px; color: var(--red); font-size: 13px; font-weight: 700; }
.p-next { width: 100%; max-width: 300px; margin-top: 8px; display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 6px 0 22px; border: 0; border-radius: 99px;
  background: var(--ink); color: var(--on-ink); font: 700 16px var(--ion-font-family); cursor: pointer; }
.p-next span { width: 44px; height: 44px; border-radius: 99px; background: var(--lime); color: var(--lime-ink); display: grid; place-items: center; }
.p-link { margin-top: 16px; border: 0; background: none; font: 700 14px var(--ion-font-family); color: var(--muted); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
</style>
