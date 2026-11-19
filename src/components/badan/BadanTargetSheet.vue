<template>
  <!-- Ke dalem ion-app (bukan body): popup Ionic dipasang di ion-app, kalau di body ketutup scrim. -->
  <Teleport to="ion-app">
    <div class="bt-scrim" :class="{ show: open }" @click="close" />
    <div class="bt-sheet" :class="{ show: open, dialog: wide }" data-test="target-sheet" role="dialog" aria-modal="true" aria-label="Atur target" :aria-hidden="String(!open)">
      <div class="bt-handle" />
      <form :class="{ 'bf-shake': shake }" novalidate data-test="target-form" @submit.prevent="save">
        <div class="bt-head">
          <div><h2>Atur target</h2><p>Biar progres &amp; warna panah di Badan nyambung sama tujuan lo.</p></div>
          <button type="button" class="bp-x" aria-label="Tutup" data-test="target-close" @click="close"><PhX :size="18" weight="bold" /></button>
        </div>

        <div class="bf-group" style="margin-top: 16px"><span>Arah</span></div>
        <div class="bt-arahs" role="group" aria-label="Arah">
          <button v-for="a in ARAH" :key="a" type="button" :class="{ on: form.arah === a }" :data-arah="a" :aria-pressed="String(form.arah === a)" @click="form.arah = a">{{ ARAH_INFO[a].n }}</button>
        </div>
        <div class="bt-arahx" data-test="arah-info"><span class="em">{{ info.em }}</span><div>{{ info.t }}<small>{{ info.s }}</small></div></div>
        <p v-if="changed" class="bf-hint" data-test="arah-change">Ganti arah = progres mulai dari nol (riwayat tetep).</p>

        <div class="bf-group"><span>Angka target</span><small>semua boleh kosong</small></div>
        <div class="bf-grid">
          <label class="bf-nf" :class="{ bad: errors.fat }">
            <span class="lb">Target lemak</span>
            <span class="iw"><input v-model="form.fat" class="bf-in" inputmode="decimal" placeholder="–" aria-label="Target lemak" data-test="t-fat" autocomplete="off" @input="clear('fat')" @keydown.enter.prevent="focusNext" /><em>%</em></span>
            <span class="orig">sekarang {{ now('fat') }}%</span>
            <span v-if="errors.fat" class="em-err" data-test="err-fat">{{ errors.fat }}</span>
          </label>
          <label class="bf-nf" :class="{ bad: errors.muscle }">
            <span class="lb">Target otot</span>
            <span class="iw"><input v-model="form.muscle" class="bf-in" inputmode="decimal" placeholder="–" aria-label="Target otot" data-test="t-muscle" autocomplete="off" @input="clear('muscle')" @keydown.enter.prevent="focusNext" /><em>kg</em></span>
            <span class="orig">sekarang {{ now('muscle') }} kg</span>
            <span v-if="errors.muscle" class="em-err" data-test="err-muscle">{{ errors.muscle }}</span>
          </label>
        </div>

        <div class="bf-group"><span>Kisaran berat</span><small>sekarang {{ now('weight') }} kg</small></div>
        <div class="bt-rng">
          <label class="bf-nf" :class="{ bad: errors.weightMin }">
            <span class="lb">Paling ringan</span>
            <span class="iw"><input v-model="form.weightMin" class="bf-in" inputmode="decimal" placeholder="–" aria-label="Paling ringan" data-test="t-min" autocomplete="off" @input="clear('weightMin')" @keydown.enter.prevent="focusNext" /><em>kg</em></span>
            <span v-if="errors.weightMin" class="em-err" data-test="err-min">{{ errors.weightMin }}</span>
          </label>
          <span class="bt-dash">–</span>
          <label class="bf-nf" :class="{ bad: errors.weightMax }">
            <span class="lb">Paling berat</span>
            <span class="iw"><input v-model="form.weightMax" class="bf-in" inputmode="decimal" placeholder="–" aria-label="Paling berat" data-test="t-max" autocomplete="off" @input="clear('weightMax')" @keydown.enter.prevent="save" /><em>kg</em></span>
            <span v-if="errors.weightMax" class="em-err" data-test="err-max">{{ errors.weightMax }}</span>
          </label>
        </div>
        <p class="bf-hint">Yang dikosongin nggak muncul di progres. Grafik &amp; warna panah ngikut arah yang lo pilih.</p>

        <p v-if="lines.length" class="bf-err" role="alert" data-test="target-error"><template v-for="(l, i) in lines" :key="i">{{ l }}<br v-if="i < lines.length - 1" /></template></p>

        <button type="submit" class="bf-save" data-test="target-save" :disabled="busy !== ''">Simpen <span><span v-if="busy === 'save'" class="bt-spin" /><PhCheck v-else :size="20" weight="bold" /></span></button>
        <button v-if="target" type="button" class="bt-link" data-test="target-delete" :disabled="busy !== ''" @click="remove">Hapus target</button>
      </form>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { PhCheck, PhX } from '@phosphor-icons/vue'
import { ARAH, ARAH_INFO, fmt } from '@/lib/badan.js'
import { errorLines, focusNext, showToast, useShake } from '@/lib/personalForm.js'
import { targetErrors, targetPayload, targetToForm } from '@/lib/badanTarget.js'
import { useBadanStore } from '@/stores/badan.js'

/** Atur target: sheet dari bawah (HP) / dialog di tengah (≥768px). Buka dari BadanPage. */
const props = defineProps({
  open: { type: Boolean, default: false },
  target: { type: Object, default: null },
  summary: { type: Object, default: null },
  wide: { type: Boolean, default: false },
})
const emit = defineEmits(['close'])

const store = useBadanStore()
const form = reactive(targetToForm(null))
const errors = reactive({})
const lines = ref([])
const busy = ref('')
const { shake, doShake } = useShake()

const info = computed(() => ARAH_INFO[form.arah])
const changed = computed(() => Boolean(props.target) && form.arah !== props.target.arah)
const now = (k) => fmt(props.summary?.[k] ?? null, 1)
const clear = (k) => {
  delete errors[k]
  lines.value = []
}

// Tiap dibuka, isian mulai lagi dari target yang tersimpen.
watch(
  () => props.open,
  (open) => {
    if (!open) return
    Object.assign(form, targetToForm(props.target))
    for (const k of Object.keys(errors)) delete errors[k]
    lines.value = []
    busy.value = ''
  },
  { immediate: true },
)

function close() {
  if (!busy.value) emit('close')
}
// Esc nutup — kecuali ada popup Ionic di atasnya.
const onKey = (e) => {
  if (e.key !== 'Escape' || !props.open) return
  if (document.querySelector('ion-action-sheet, ion-alert')) return
  close()
}
document.addEventListener('keydown', onKey)
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))

async function run(kind, job, message) {
  if (busy.value) return
  busy.value = kind
  lines.value = []
  try {
    await job()
  } catch (err) {
    if (err?.fields) for (const [k, v] of Object.entries(err.fields)) if (typeof v?.[0] === 'string' && k in form && k !== 'arah') errors[k] = v[0]
    lines.value = Object.keys(errors).length ? [] : errorLines(err)
    doShake()
    return
  } finally {
    busy.value = ''
  }
  emit('close')
  showToast(message)
}

function save() {
  if (busy.value) return
  for (const k of Object.keys(errors)) delete errors[k]
  Object.assign(errors, targetErrors(form))
  if (Object.keys(errors).length) return doShake()
  return run('save', () => store.saveTarget(targetPayload(form)), 'Target kesimpen ✓')
}

const remove = () => run('delete', () => store.deleteTarget(), 'Target dihapus')
</script>

<style>
.bt-spin { width: 18px; height: 18px; border-radius: 99px; border: 2.5px solid rgba(28, 36, 0, .25); border-top-color: var(--lime-ink); animation: bt-spin .7s linear infinite; }
@keyframes bt-spin { to { transform: rotate(360deg); } }
</style>
