<template>
  <div class="shell ev" :class="{ dim: loaded && !enabled }" data-test="eval-box">
    <div class="evcore">
      <div class="evhead">
        <span class="bot">🤖</span>
        <span class="grow">
          <b>Evaluasi AI</b>
          <small data-test="sub">{{ subtitle }}</small>
        </span>
      </div>

      <template v-if="!loaded">
        <p class="note" data-test="loading">&nbsp;</p>
      </template>

      <template v-else-if="!enabled">
        <p class="note" data-test="disabled">AI belum disetel.</p>
      </template>

      <template v-else>
        <!-- belum ada isi -->
        <template v-if="state === 'none'">
          <button type="button" class="evbtn" data-test="start" @click="run">Evaluasi sesi ini <span>✨</span></button>
        </template>

        <!-- lagi jalan, belum ada isi -->
        <div v-else-if="state === 'running'" class="bgrow" data-test="running">
          <span class="spin" data-test="spin" />
          <span>AI lagi baca sesi {{ label }} lo (±1–2 menit).<small>Lo bisa tinggal mandi atau ngopi. Begitu jadi, notifnya masuk.</small></span>
        </div>

        <!-- gagal, belum ada isi -->
        <template v-else-if="state === 'failed'">
          <div class="failrow" data-test="failed">⚠️<span>{{ evaluation.error?.message }}<small>Nggak dicoba ulang otomatis. {{ chargeText }}</small></span></div>
          <button type="button" class="evbtn" data-test="rerun" @click="run">Coba lagi <span>↻</span></button>
        </template>

        <!-- ada isi (done / stale / rerunning / rerunFailed) -->
        <template v-else>
          <div class="evbody">
            <div v-for="(p, i) in evaluation.content.poin" :key="i" class="evpt" data-test="point">
              <span class="em">{{ p.ikon }}</span>
              <span><span class="t">{{ p.judul }}</span><span class="isi" v-html="renderAiText(p.isi)" /></span>
            </div>
          </div>
          <div v-if="state === 'rerunning'" class="bgrow slim" data-test="rerunning"><span class="spin" data-test="spin" /><span>Lagi dievaluasi ulang…</span></div>
          <div v-else-if="state === 'rerunFailed'" class="failrow" data-test="rerun-failed">⚠️<span>Evaluasi ulang gagal<small>{{ evaluation.error?.message }} {{ chargeText }}</small></span></div>
          <div v-else-if="evaluation.stale" class="staleRow" data-test="stale"><span>Sesi ini diubah abis dievaluasi.</span></div>
          <button v-if="state === 'rerunFailed' || (state === 'done' && evaluation.stale)" type="button" class="evbtn slim" data-test="rerun" @click="run">{{ state === 'rerunFailed' ? 'Coba lagi' : 'Evaluasi ulang' }} <span>↻</span></button>
          <button type="button" class="talk" data-test="talk" @click="$emit('talk')"><PhChatCircleText :size="19" weight="bold" />Bahas di chat</button>
          <div v-if="mode === 'summary'" class="evfoot" data-test="foot">
            <span>Kesimpen di riwayat sesi ini</span>
            <button type="button" class="evlabel" role="switch" :aria-checked="String(auto)" data-test="auto-switch" @click="toggle">Langsung tiap selesai <span class="sw" :class="{ on: auto }" /></button>
          </div>
        </template>

        <!-- saklar besar: cuma kalau belum ada isi + ringkasan -->
        <button v-if="mode === 'summary' && ['none', 'running', 'failed'].includes(state)" type="button" class="evswitch" role="switch" :aria-checked="String(auto)" data-test="auto-switch" @click="toggle">
          <span class="grow"><b>Langsung evaluasi tiap selesai</b><small>{{ auto ? 'Nyala: tiap pencet Selesai, AI langsung jalan.' : 'Mati: AI baru jalan kalau lo pencet tombol di atas.' }}</small></span>
          <span class="sw" :class="{ on: auto }" />
        </button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { PhChatCircleText } from '@phosphor-icons/vue'
import { PROGRAM_LABEL } from '@/lib/gym.js'
import { evalState, renderAiText, rupiah } from '@/lib/ai.js'
import { wibNow } from '@/lib/home.js'
import { BLN } from '@/lib/agenda.js'
import { useAiStore } from '@/stores/ai.js'

/** Kotak Evaluasi AI satu sesi gym (ringkasan abis Selesai & detail riwayat). Cuma ngabarin `talk`; pindah ke chat diurus yang makai. */
const props = defineProps({
  sessionId: { type: Number, required: true },
  program: { type: String, default: '' },
  mode: { type: String, default: 'summary' },
})
defineEmits(['talk'])

const ai = useAiStore()
const evaluation = computed(() => ai.evals[props.sessionId] ?? null)
const state = computed(() => evalState(evaluation.value))
const loaded = computed(() => ai.settingsLoaded)
const enabled = computed(() => ai.settings.enabled)
const auto = computed(() => ai.settings.autoEval)
const label = computed(() => PROGRAM_LABEL[evaluation.value?.program ?? props.program] ?? '')
const pad = (n) => String(n).padStart(2, '0')

const subtitle = computed(() => {
  if (!loaded.value) return ''
  if (!enabled.value) return 'Belum aktif'
  if (state.value === 'none') return 'Sesi ini belum dievaluasi'
  if (state.value === 'running') return 'Lagi dikerjain di belakang'
  if (state.value === 'failed') return 'Evaluasi sesi ini gagal'
  const at = evaluation.value?.doneAt
  if (!at) return `Abis ${label.value}`
  const wib = new Date(new Date(at).getTime() + 7 * 3_600_000)
  const date = wibNow(new Date(at)).date
  return `Abis ${label.value} · ${Number(date.slice(8))} ${BLN[Number(date.slice(5, 7)) - 1]} ${pad(wib.getUTCHours())}.${pad(wib.getUTCMinutes())}`
})
const chargeText = computed(() => {
  const c = evaluation.value?.error?.chargedRp
  return c == null ? 'Belum kepotong biaya.' : `Kepotong ±${rupiah(c)}.`
})

let stopPoll = () => {}
let disposed = false
function startPoll() {
  if (disposed) return
  stopPoll()
  stopPoll = ai.pollEval(props.sessionId)
}
async function run() {
  const res = await ai.startEval(props.sessionId)
  if (res?.status === 'jalan' || evaluation.value?.status === 'jalan') startPoll()
}
// Nyalain saklar CUMA nyimpen pengaturan; evaluasi sesi ini nggak ikut jalan.
const toggle = () => ai.setAutoEval(!auto.value)

// Balik ke app: evaluasi otomatis mungkin baru kebikin / selesai waktu app ditinggal → cek lagi selama masih "belum ada" / "lagi jalan".
async function onVisible() {
  if (disposed || document.visibilityState !== 'visible' || !enabled.value) return
  if (state.value !== 'none' && state.value !== 'running') return
  await ai.loadEval(props.sessionId)
  if (!disposed && evaluation.value?.status === 'jalan') startPoll()
}

onMounted(async () => {
  document.addEventListener('visibilitychange', onVisible)
  await Promise.all([ai.loadSettings(), ai.loadEval(props.sessionId)])
  if (evaluation.value?.status === 'jalan') startPoll()
})
watch(() => props.sessionId, async () => {
  stopPoll()
  await ai.loadEval(props.sessionId)
  if (evaluation.value?.status === 'jalan') startPoll()
})
onBeforeUnmount(() => {
  disposed = true
  document.removeEventListener('visibilitychange', onVisible)
  stopPoll()
})
</script>

<style scoped>
.ev { margin-top: 0; }
.ev.dim { opacity: .6; }
.evcore { padding: 16px; }
.evhead { display: flex; align-items: center; gap: 10px; }
.evhead .grow { flex: 1; min-width: 0; }
.evhead .bot { width: 38px; height: 38px; border-radius: 13px; background: var(--ink); display: grid; place-items: center; font-size: 19px; flex-shrink: 0; }
.evhead b { display: block; font-size: 16px; font-weight: 800; letter-spacing: -0.02em; }
.evhead small { display: block; font-size: 12px; font-weight: 600; color: var(--muted); margin-top: 1px; }
.note { margin: 14px 0 0; font-size: 13.5px; font-weight: 700; color: var(--muted); }
.evbtn { width: 100%; margin-top: 14px; display: flex; align-items: center; justify-content: space-between; height: 54px; padding: 0 6px 0 20px; border: 0; border-radius: 99px; background: var(--ink); color: var(--on-ink); font: 800 15.5px var(--ion-font-family); cursor: pointer; transition: transform .2s var(--spring); }
.evbtn span { width: 42px; height: 42px; border-radius: 99px; background: var(--lime); color: var(--lime-ink); display: grid; place-items: center; font-size: 19px; }
.evbtn.slim { height: 46px; font-size: 14.5px; }
.evbtn.slim span { width: 36px; height: 36px; font-size: 17px; }
.evbtn:active, .talk:active { transform: scale(.97); }
.evswitch { width: 100%; border: 0; text-align: left; font-family: inherit; color: var(--text); display: flex; align-items: center; gap: 12px; margin-top: 12px; padding: 12px 14px; border-radius: 18px; background: var(--soft); cursor: pointer; }
.evswitch .grow { flex: 1; min-width: 0; }
.evswitch b { display: block; font-size: 14px; font-weight: 800; }
.evswitch small { display: block; font-size: 12px; font-weight: 600; color: var(--muted); margin-top: 1px; line-height: 1.4; }
.sw { width: 50px; height: 30px; border-radius: 99px; background: rgba(127, 127, 120, .35); position: relative; flex-shrink: 0; transition: background .2s; display: inline-block; }
.sw::after { content: ''; position: absolute; left: 3px; top: 3px; width: 24px; height: 24px; border-radius: 99px; background: #fff; box-shadow: 0 2px 6px rgba(0, 0, 0, .2); transition: transform .25s var(--spring); }
.sw.on { background: var(--green); }
.sw.on::after { transform: translateX(20px); }
.bgrow { display: flex; gap: 12px; align-items: center; margin-top: 14px; padding: 14px; border-radius: 18px; background: var(--soft); font-size: 13.5px; font-weight: 700; line-height: 1.45; }
.bgrow.slim { padding: 10px 14px; font-size: 12.5px; }
.bgrow small { display: block; font-weight: 600; color: var(--muted); font-size: 12px; }
.spin { width: 22px; height: 22px; border-radius: 99px; border: 3px solid rgba(127, 127, 120, .25); border-top-color: var(--text); animation: evspin .9s linear infinite; flex-shrink: 0; }
@keyframes evspin { to { transform: rotate(360deg); } }
.failrow { display: flex; gap: 10px; align-items: flex-start; margin-top: 14px; padding: 12px 14px; border-radius: 18px; background: rgba(240, 83, 61, .1); color: var(--red); font-size: 13.5px; font-weight: 700; line-height: 1.45; }
.failrow small { display: block; color: var(--muted); font-weight: 600; font-size: 12px; }
.staleRow { margin-top: 10px; padding: 9px 14px; border-radius: 14px; background: var(--soft); font-size: 12.5px; font-weight: 700; color: var(--muted); }
.evbody { margin-top: 12px; display: grid; gap: 2px; }
.evpt { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 8px; padding: 10px 0; font-size: 14px; font-weight: 600; line-height: 1.5; }
.evpt + .evpt { box-shadow: inset 0 1px 0 var(--hair); }
.evpt .em { font-size: 18px; line-height: 1.35; }
.evpt .t { display: block; font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); margin-bottom: 2px; }
.evpt .isi :deep(p) { margin: 0; }
.evpt .isi :deep(p + p), .evpt .isi :deep(ul) { margin-top: 4px; }
.evpt .isi :deep(ul) { margin-bottom: 0; padding-left: 18px; }
.evpt .isi :deep(b) { font-weight: 800; }
.talk { width: 100%; margin-top: 12px; display: flex; align-items: center; justify-content: center; gap: 8px; height: 50px; border: 0; border-radius: 99px; background: var(--lime); color: var(--lime-ink); font: 800 15px var(--ion-font-family); cursor: pointer; transition: transform .2s var(--spring); }
.evfoot { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 10px; font-size: 11.5px; font-weight: 600; color: var(--muted); }
.evlabel { display: inline-flex; align-items: center; gap: 4px; cursor: pointer; font: 700 11.5px var(--ion-font-family); color: var(--muted); border: 0; background: none; padding: 0; }
.evlabel .sw { transform: scale(.8); transform-origin: right center; }
@media (hover: hover) {
  .evbtn:hover, .talk:hover { transform: translateY(-1px); }
}
:root.theme-dark .failrow { background: rgba(240, 83, 61, .16); }
</style>
