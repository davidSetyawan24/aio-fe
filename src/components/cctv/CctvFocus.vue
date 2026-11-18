<template>
  <!-- Ke dalem ion-app (bukan body): nutupin sidebar juga & tetep satu tumpukan sama popup Ionic. -->
  <Teleport to="ion-app">
    <div v-if="cam" class="cc-focus" data-test="focus" role="dialog" aria-modal="true" :aria-label="`Kamera ${cam.ip}`">
      <div class="cc-fbar">
        <span class="cc-ftag"><span class="cc-fdot" :class="{ on: shown === 'live' }" />{{ cam.ip }}<em v-if="sharpLive" class="cc-fq">tajem</em></span>
        <button type="button" class="cc-fx" data-test="focus-close" aria-label="Tutup" @click="$emit('close')"><PhX :size="20" weight="bold" /></button>
      </div>
      <div class="cc-fstage">
        <video ref="smallEl" class="cc-fvid" :class="{ 'cc-hide': sharpLive }" muted playsinline autoplay disablepictureinpicture />
        <video v-if="sharp" ref="sharpEl" class="cc-fvid" :class="{ 'cc-hide': !sharpLive }" data-test="focus-sharp" muted playsinline autoplay disablepictureinpicture
          @loadeddata="sharpReady = true" />
        <div v-if="shown === 'connecting'" class="cc-fover"><span class="cc-fspin" />Lagi nyambung…</div>
        <div v-else-if="shown === 'error'" class="cc-fover">
          <b>Kamera nggak nyambung.</b>
          <span>Cek kamera nyala & IP-nya di app Onassis.</span>
          <button type="button" class="cc-fretry" data-test="focus-retry" @click="retry">Coba lagi</button>
        </div>
      </div>
      <p v-if="!sharp" class="cc-fnote">Kualitas tinggi nggak didukung browser ini.</p>
      <p v-else-if="sharpDown && !sharpLive && smallState === 'live'" class="cc-fnote">Kualitas tinggi lagi nggak nyambung, pakai yang biasa dulu.</p>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { PhX } from '@phosphor-icons/vue'
import { SHARP_RETRIES, SHARP_RETRY_MS } from '@/lib/cctv.js'
import { playCamera } from '@/lib/msePlayer.js'

/**
 * Satu kamera digedein. Langsung muter stream kecil; kalau `sharp`, stream tajem (H.265) ikut disambung di belakang —
 * baru dituker begitu gambar tajemnya udah ada (nunggu keyframe bisa > 4 dtk), jadi nggak pernah layar item.
 * Tajem putus → balik ke yang kecil, yang tajem dicoba lagi beberapa kali. Dua-duanya gagal → "Coba lagi".
 */
const props = defineProps({
  /** null = tertutup. */
  cam: { type: Object, default: null },
  bridgeKey: { type: String, default: '' },
  /** AIO CCTV punya stream tajem & browser ini bisa muter H.265. */
  sharp: { type: Boolean, default: false },
})
const emit = defineEmits(['close'])

const smallEl = ref(null)
const sharpEl = ref(null)
const smallState = ref('connecting')
const sharpState = ref('connecting')
const sharpReady = ref(false)
/** Stream tajem pernah putus & belum nyambung lagi (buat tulisan kecil di bawah). */
const sharpDown = ref(false)
let small = null
let big = null
let sharpTimer = null
let sharpTries = 0

const sharpLive = computed(() => props.sharp && sharpState.value === 'live' && sharpReady.value)
const shown = computed(() => {
  if (sharpLive.value || smallState.value === 'live') return 'live'
  if (smallState.value === 'connecting') return 'connecting'
  // Yang kecil gagal, yang tajem masih nyambung / nunggu gambar pertama → tunggu dia.
  if (props.sharp && big && sharpState.value !== 'error') return 'connecting'
  return 'error'
})

function clearSharpTimer() {
  clearTimeout(sharpTimer)
  sharpTimer = null
}
function stopAll() {
  clearSharpTimer()
  small?.stop()
  big?.stop()
  small = big = null
}
function playSmall() {
  smallState.value = 'connecting'
  let p = null
  p = playCamera(smallEl.value, { key: props.bridgeKey, cam: props.cam.key, q: 'kecil', onState: (s) => p && small === p && onSmall(s) })
  small = p
}
function playSharp() {
  sharpState.value = 'connecting'
  sharpReady.value = false
  let p = null
  p = playCamera(sharpEl.value, { key: props.bridgeKey, cam: props.cam.key, q: 'tajem', onState: (s) => p && big === p && onSharp(s) })
  big = p
}
function onSmall(s) {
  if (s !== 'error') return (smallState.value = s)
  small = null
  smallState.value = 'error'
  // Yang tajem masih nyoba nyambung → biarin; selainnya nyerah (nunggu "Coba lagi").
  if (!(props.sharp && big)) clearSharpTimer()
}
function onSharp(s) {
  if (s === 'live') {
    sharpTries = 0
    sharpState.value = 'live'
    return
  }
  if (s !== 'error') return (sharpState.value = s)
  big = null
  sharpReady.value = false
  sharpState.value = 'error'
  sharpDown.value = true
  if (smallState.value === 'error') return // dua-duanya gagal → "Coba lagi"
  if (!small) playSmall() // yang kecil udah dilepas pas tajem jalan → sambung lagi
  if (sharpTries >= SHARP_RETRIES) return
  sharpTries += 1
  sharpTimer = setTimeout(() => {
    sharpTimer = null
    if (props.cam && smallState.value !== 'error') playSharp()
  }, SHARP_RETRY_MS)
}
function startAll() {
  stopAll()
  sharpTries = 0
  sharpDown.value = false
  sharpReady.value = false
  playSmall()
  if (props.sharp) playSharp()
  else sharpState.value = 'connecting'
}
const retry = () => props.cam && startAll()

watch(
  () => props.cam,
  async (cam) => {
    stopAll()
    if (!cam) return
    await nextTick()
    if (props.cam === cam) startAll()
  },
  { immediate: true },
)
// Gambar tajem udah keliatan → stream kecil dilepas (hemat kamera).
watch(sharpLive, (on) => {
  if (!on) return
  sharpDown.value = false
  if (!small) return
  small.stop()
  small = null
  smallState.value = 'stopped'
})

const onKey = (e) => {
  if (e.key === 'Escape' && props.cam) emit('close')
}
document.addEventListener('keydown', onKey)
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  stopAll()
})
</script>

<!-- Di-teleport ke ion-app → style-nya global (diawali cc-, nggak bentrok). Selalu gelap kayak layar nonton. -->
<style>
.cc-focus { position: fixed; inset: 0; z-index: 40; display: flex; flex-direction: column; gap: 14px; padding: 22px 28px 26px;
  background: #070807; color: #F3F2EE; font-family: var(--ion-font-family); animation: cc-fin .5s var(--spring) both; }
@keyframes cc-fin { from { opacity: 0; transform: scale(.985); } }
.cc-fbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.cc-ftag { display: inline-flex; align-items: center; gap: 9px; height: 36px; padding: 0 14px; border-radius: 99px; background: rgba(255, 255, 255, .08);
  font-size: 14px; font-weight: 700; letter-spacing: -0.01em; font-variant-numeric: tabular-nums; }
.cc-fdot { width: 8px; height: 8px; border-radius: 99px; background: #85857D; }
.cc-fdot.on { background: var(--lime); box-shadow: 0 0 0 3px rgba(200, 240, 74, .25); }
.cc-fq { font-style: normal; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .12em; color: rgba(243, 242, 238, .55); }
.cc-fx { width: 44px; height: 44px; border-radius: 99px; border: 0; background: rgba(255, 255, 255, .1); color: #F3F2EE; display: grid; place-items: center;
  cursor: pointer; transition: transform .4s var(--spring), background .4s var(--spring); }
.cc-fx:active { transform: scale(.94); }
.cc-fstage { position: relative; flex: 1; min-height: 0; border-radius: 24px; overflow: hidden; background: #000; }
.cc-fvid { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; display: block; transition: opacity .35s var(--spring); }
.cc-fvid.cc-hide { opacity: 0; }
.cc-fover { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center;
  color: rgba(243, 242, 238, .78); font-size: 14px; font-weight: 600; }
.cc-fover b { color: #F3F2EE; font-size: 18px; font-weight: 800; letter-spacing: -0.02em; }
.cc-fover span { font-size: 13px; font-weight: 500; color: rgba(243, 242, 238, .6); }
.cc-fspin { width: 26px; height: 26px; border-radius: 99px; border: 2.5px solid rgba(243, 242, 238, .18); border-top-color: var(--lime); animation: cc-fturn .9s linear infinite; }
@keyframes cc-fturn { to { transform: rotate(360deg); } }
.cc-fretry { margin-top: 4px; height: 40px; padding: 0 18px; border: 0; border-radius: 99px; background: rgba(255, 255, 255, .12); color: #F3F2EE;
  font: 700 13.5px var(--ion-font-family); cursor: pointer; transition: transform .4s var(--spring), background .4s var(--spring); }
.cc-fretry:active { transform: scale(.96); }
.cc-fnote { margin: 0; text-align: center; font-size: 12.5px; font-weight: 500; color: rgba(243, 242, 238, .55); }
@media (hover: hover) { .cc-fx:hover, .cc-fretry:hover { background: rgba(255, 255, 255, .16); } }
</style>
