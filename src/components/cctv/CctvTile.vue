<template>
  <div class="shell cc-shell" :class="{ 'cc-clickable': state === 'live' }">
    <div class="cc-tile" data-test="tile" role="button" tabindex="0" :aria-label="`Gedein kamera ${cam.ip}`" @click="open" @keydown.enter="open">
      <video ref="videoEl" class="cc-video" muted playsinline autoplay disablepictureinpicture />
      <span class="cc-tag"><span class="cc-dot" :class="{ on: state === 'live' }" data-test="live-dot" />{{ cam.ip }}</span>
      <span v-if="state === 'live'" class="cc-grow" aria-hidden="true"><PhArrowsOut :size="17" weight="bold" /></span>
      <div v-if="state === 'connecting'" class="cc-over"><span class="cc-spin" />Lagi nyambung…</div>
      <div v-else-if="state === 'reconnecting'" class="cc-over" data-test="tile-reconnecting"><span class="cc-spin" />Lagi nyambung ulang…</div>
      <div v-else-if="state === 'error'" class="cc-over cc-err">
        <b>Kamera nggak nyambung.</b>
        <span>Cek kamera nyala & IP-nya di app Onassis.</span>
        <button type="button" class="cc-retry" data-test="tile-retry" @click.stop="restart">Coba lagi</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { PhArrowsOut } from '@phosphor-icons/vue'
import { RECONNECT_MS } from '@/lib/cctv.js'
import { playCamera } from '@/lib/msePlayer.js'

/** Satu kotak kamera di grid: stream kecil (640×360), label IP + titik live. Klik → digedein. Putus → nyambung ulang sendiri. */
const props = defineProps({
  cam: { type: Object, required: true },
  bridgeKey: { type: String, required: true },
  /** false = tab lagi disembunyiin / halaman ditinggal → video dilepas. */
  active: { type: Boolean, default: true },
})
const emit = defineEmits(['open'])

const videoEl = ref(null)
/** connecting → live; putus → reconnecting (nyoba lagi sendiri) → error kalau jatahnya abis. */
const state = ref('connecting')
let player = null
let run = 0
let retryTimer = null
let attempt = 0

function stop() {
  run += 1
  clearTimeout(retryTimer)
  retryTimer = null
  player?.stop()
  player = null
}
function play() {
  stop()
  const my = run
  player = playCamera(videoEl.value, { key: props.bridgeKey, cam: props.cam.key, q: 'kecil', onState: (s) => my === run && onPlayer(s) })
}
function onPlayer(s) {
  if (s === 'live') {
    attempt = 0
    state.value = 'live'
    return
  }
  if (s !== 'error') return (state.value = s)
  player = null
  if (!props.active || attempt >= RECONNECT_MS.length) return (state.value = 'error')
  state.value = 'reconnecting'
  retryTimer = setTimeout(() => {
    retryTimer = null
    play()
  }, RECONNECT_MS[attempt++])
}
function start() {
  attempt = 0
  state.value = 'connecting'
  play()
}
const restart = () => start()
function open() {
  if (state.value === 'error' || state.value === 'reconnecting') return
  emit('open', props.cam)
}

onMounted(() => props.active && start())
watch(() => props.active, (on) => (on ? start() : stop()))
onBeforeUnmount(stop)
</script>

<style scoped>
.cc-shell { transition: transform .5s var(--spring); }
.cc-tile { position: relative; aspect-ratio: 16 / 9; border-radius: 25px; overflow: hidden; background: #0B0B0A; cursor: pointer; outline: none;
  box-shadow: var(--lift); }
.cc-tile:focus-visible { box-shadow: 0 0 0 3px var(--lime); }
.cc-shell:active { transform: scale(.985); }
.cc-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; display: block; }
.cc-tag { position: absolute; left: 14px; bottom: 14px; display: inline-flex; align-items: center; gap: 8px; height: 30px; padding: 0 12px;
  border-radius: 99px; background: rgba(10, 10, 8, .62); color: #F3F2EE; font-size: 12.5px; font-weight: 700; letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums; box-shadow: 0 0 0 1px rgba(255, 255, 255, .08); }
.cc-dot { width: 8px; height: 8px; border-radius: 99px; background: #85857D; transition: background .4s var(--spring), box-shadow .4s var(--spring); }
.cc-dot.on { background: var(--lime); box-shadow: 0 0 0 3px rgba(200, 240, 74, .25); animation: cc-pulse 2.4s var(--spring) infinite; }
@keyframes cc-pulse { 50% { box-shadow: 0 0 0 5px rgba(200, 240, 74, .08); } }
.cc-grow { position: absolute; top: 14px; right: 14px; width: 36px; height: 36px; border-radius: 99px; display: grid; place-items: center;
  background: rgba(10, 10, 8, .62); color: #F3F2EE; opacity: 0; transition: opacity .4s var(--spring), transform .5s var(--spring); }
.cc-over { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
  padding: 20px; text-align: center; color: rgba(243, 242, 238, .78); font-size: 13.5px; font-weight: 600; }
.cc-err b { color: #F3F2EE; font-size: 16px; font-weight: 800; letter-spacing: -0.02em; }
.cc-err span { font-size: 12.5px; font-weight: 500; color: rgba(243, 242, 238, .65); max-width: 300px; }
.cc-err::before { content: ''; width: 8px; height: 8px; border-radius: 99px; background: var(--red); box-shadow: 0 0 0 4px rgba(240, 83, 61, .18); }
.cc-retry { margin-top: 4px; height: 36px; padding: 0 16px; border: 0; border-radius: 99px; background: rgba(255, 255, 255, .12); color: #F3F2EE;
  font: 700 13px var(--ion-font-family); cursor: pointer; transition: transform .4s var(--spring); }
.cc-retry:active { transform: scale(.96); }
.cc-spin { width: 22px; height: 22px; border-radius: 99px; border: 2.5px solid rgba(243, 242, 238, .18); border-top-color: var(--lime); animation: cc-turn .9s linear infinite; }
@keyframes cc-turn { to { transform: rotate(360deg); } }

@media (hover: hover) {
  .cc-clickable:hover { transform: translateY(-3px); }
  .cc-clickable:hover .cc-grow { opacity: 1; transform: scale(1.04); }
  .cc-retry:hover { background: rgba(255, 255, 255, .18); }
}
</style>
