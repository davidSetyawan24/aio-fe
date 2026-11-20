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

        <template v-if="speed">
          <div class="bf-group"><span>Kecepatan</span><small>seberapa cepet {{ cut ? 'turunnya' : 'naiknya' }}</small></div>
          <div class="bt-seg" role="group" aria-label="Kecepatan" data-test="pace-seg">
            <button v-for="k in paceKeys" :key="k" type="button" :class="{ on: form.pace === k }" :data-pace="k" :aria-pressed="String(form.pace === k)" @click="setPace(k)">{{ PACE_INFO[k] }}</button>
          </div>
          <p v-if="errors.pace" class="bt-ferr" data-test="err-pace">{{ errors.pace }}</p>
          <!-- Tinggi kotak ini cuma boleh berubah karena tap (arah / kecepatan), bukan ketikan: bagian yang ikut isian selalu
               ke-render (pengganti "–") & punya tempat tetap — kalau tinggi berubah di atas kolom yang lagi diketik, iOS ngelempar form. -->
          <div class="bt-spdx" data-test="speed-line">
            <p class="bt-spd-main">
              {{ cut ? 'Turun' : 'Naik' }}
              <template v-if="speed.lo != null"><b>±{{ kgWeek(speed.lo) }}–{{ kgWeek(speed.hi) }} kg/minggu</b> ({{ pctText }} berat)</template>
              <b v-else>{{ pctText }} berat/minggu</b>
              · makan <b data-test="speed-food">{{ food.state === 'ok' ? `±${fmt(food.kcal, 0)} kkal` : '–' }}</b>
              · nyampe <span data-test="speed-reach"><template v-if="speed.reach">{{ fmtN(speed.reach.goal) }} kg <b>±{{ monthShort(speed.reach.month) }}</b> (±{{ speed.reach.weeks }} minggu)</template><template v-else>–</template></span>
            </p>
            <small>{{ cut ? 'Patokan riset: turun 0,5–1% berat/minggu masih jaga otot.' : 'Patokan riset: naik 0,25–0,5% berat/minggu biar lemaknya nggak ikut banyak.' }}</small>
            <small v-if="form.pace === 'agresif'" data-test="pace-agresif">Defisit &gt;500 kkal/hari, risiko otot lebih gede.</small>
            <div class="bt-spd-warn" :class="{ on: belowBmr }" data-test="pace-warn" :aria-hidden="String(!belowBmr)">
              <PhWarning :size="16" weight="bold" /><span>Target makan di bawah BMR — otot bisa ikut kebakar. Coba kecepatan Normal.</span>
            </div>
          </div>
        </template>

        <div class="bf-group"><span>Angka target</span><small>semua boleh kosong</small></div>
        <div class="bf-grid">
          <label class="bf-nf" :class="{ bad: errors.fat }">
            <span class="lb">Target lemak</span>
            <span class="iw"><input v-model="form.fat" class="bf-in" inputmode="decimal" placeholder="–" aria-label="Target lemak" data-test="t-fat" autocomplete="off" @input="clear('fat')" @keydown.enter.prevent="focusNext" /><em>%</em></span>
            <span class="orig">sekarang {{ now('fat', '%') }}</span>
            <span v-if="errors.fat" class="em-err" data-test="err-fat">{{ errors.fat }}</span>
          </label>
          <label class="bf-nf" :class="{ bad: errors.muscle }">
            <span class="lb">Target otot</span>
            <span class="iw"><input v-model="form.muscle" class="bf-in" inputmode="decimal" placeholder="–" aria-label="Target otot" data-test="t-muscle" autocomplete="off" @input="clear('muscle')" @keydown.enter.prevent="focusNext" /><em>kg</em></span>
            <span class="orig">sekarang {{ now('muscle', ' kg') }}</span>
            <span v-if="errors.muscle" class="em-err" data-test="err-muscle">{{ errors.muscle }}</span>
          </label>
        </div>

        <div class="bf-group"><span>Kisaran berat</span><small>sekarang {{ now('weight', ' kg') }}</small></div>
        <div class="bt-rng">
          <label class="bf-nf" :class="{ bad: errors.weightMin }">
            <span class="lb">Paling ringan</span>
            <span class="iw"><input v-model="form.weightMin" class="bf-in" inputmode="decimal" placeholder="–" aria-label="Paling ringan" data-test="t-min" autocomplete="off" @input="clear('weightMin')" @keydown.enter.prevent="focusNext" /><em>kg</em></span>
            <span v-if="errors.weightMin" class="em-err" data-test="err-min">{{ errors.weightMin }}</span>
          </label>
          <span class="bt-dash">–</span>
          <label class="bf-nf" :class="{ bad: errors.weightMax }">
            <span class="lb">Paling berat</span>
            <span class="iw"><input v-model="form.weightMax" class="bf-in" inputmode="decimal" placeholder="–" aria-label="Paling berat" data-test="t-max" autocomplete="off" @input="clear('weightMax')" @keydown.enter.prevent="focusNext" /><em>kg</em></span>
            <span v-if="errors.weightMax" class="em-err" data-test="err-max">{{ errors.weightMax }}</span>
          </label>
        </div>
        <p class="bf-hint">Yang dikosongin nggak muncul di progres. Grafik &amp; warna panah ngikut arah yang lo pilih.</p>

        <div class="bf-group" style="margin-top: 28px"><span>Aktivitas</span><small>diisi sekali</small></div>
        <div class="bt-asub">Kerja harian</div>
        <div class="bt-seg wrap3" role="group" aria-label="Kerja harian">
          <button v-for="k in WORK_TYPES" :key="k" type="button" :class="{ on: form.workType === k }" :data-work="k" :aria-pressed="String(form.workType === k)" @click="setWork(k)">{{ WORK_INFO[k] }}</button>
        </div>
        <p v-if="errors.workType" class="bt-ferr" data-test="err-workType">{{ errors.workType }}</p>
        <div class="bf-grid" style="margin-top: 8px">
          <label v-for="f in WORK_FIELDS" :key="f.k" class="bf-nf" :class="{ bad: errors[f.k] }">
            <span class="lb">{{ f.lb }}</span>
            <span class="iw"><input v-model="form[f.k]" class="bf-in" inputmode="numeric" :aria-label="f.lb" :data-test="f.t" autocomplete="off" @input="clear(f.k)" @keydown.enter.prevent="focusNext" /><em>{{ f.u }}</em></span>
            <span v-if="errors[f.k]" class="em-err" :data-test="`err-${f.k}`">{{ errors[f.k] }}</span>
          </label>
        </div>
        <div class="bt-asub">Gym</div>
        <div class="bf-grid">
          <label v-for="f in GYM_FIELDS" :key="f.k" class="bf-nf" :class="{ bad: errors[f.k] }">
            <span class="lb">{{ f.lb }}</span>
            <span class="iw"><input v-model="form[f.k]" class="bf-in" inputmode="numeric" :aria-label="f.lb" :data-test="f.t" autocomplete="off" @input="clear(f.k)" @keydown.enter.prevent="focusNext" /><em>{{ f.u }}</em></span>
            <span v-if="errors[f.k]" class="em-err" :data-test="`err-${f.k}`">{{ errors[f.k] }}</span>
          </label>
        </div>
        <p class="bf-hint">Nanti otomatis dari Fitness Tracker.</p>
        <div class="bt-asub">Olahraga lain <small>opsional</small></div>
        <label class="bf-nf" :class="{ bad: errors.otherSport }">
          <span class="iw"><input v-model="form.otherSport" class="bf-in bt-txt" maxlength="120" placeholder="misal futsal Sabtu 2 jam" aria-label="Olahraga lain" data-test="a-other" autocomplete="off" @input="clear('otherSport')" @keydown.enter.prevent="focusNext" /></span>
          <span v-if="errors.otherSport" class="em-err" data-test="err-otherSport">{{ errors.otherSport }}</span>
        </label>
        <div class="bt-asub">Catatan buat AI <small>opsional</small></div>
        <label class="bf-nf" :class="{ bad: errors.notes }">
          <textarea v-model="form.notes" class="bf-in bt-ta" rows="2" maxlength="500" aria-label="Catatan buat AI" data-test="a-notes" @input="clear('notes')" />
          <span v-if="errors.notes" class="em-err" data-test="err-notes">{{ errors.notes }}</span>
        </label>
        <div class="bt-asub">Pengali dipakai</div>
        <div class="bt-mults" role="group" aria-label="Pengali dipakai">
          <button v-for="(v, k) in LEVELS" :key="k" type="button" :class="{ on: level.used === k }" :data-level="k" :aria-pressed="String(level.used === k)" @click="pickLevel(k)">
            {{ LEVEL_INFO[k] }}<b>×{{ multText(v) }}</b><span v-if="level.suggested === k" class="bt-rec">disaranin</span>
          </button>
        </div>
        <p v-if="errors.level" class="bt-ferr" data-test="err-level">{{ errors.level }}</p>
        <p v-if="form.levelManual && level.suggested && level.used !== level.suggested" class="bf-hint" data-test="level-hint">
          Saran dari isian lo: {{ LEVEL_INFO[level.suggested] }} · <button type="button" class="bt-sugg" data-test="use-sugg" @click="useSuggestion">Pakai saran</button>
        </p>
        <div v-if="food.state === 'ok'" class="bt-tdee" data-test="tdee"><span>TDEE = BMR {{ fmt(food.bmr, 0) }} × {{ multText(food.mult) }}</span><b>±{{ fmt(Math.round(food.tdee / 10) * 10, 0) }} kkal</b></div>
        <p class="bf-hint">Disaranin dari kerja harian + gym yang lo isi. Boleh dipilih sendiri.</p>

        <p v-if="lines.length" class="bf-err" role="alert" data-test="target-error"><template v-for="(l, i) in lines" :key="i">{{ l }}<br v-if="i < lines.length - 1" /></template></p>

        <button type="submit" class="bf-save" data-test="target-save" :disabled="busy !== ''">Simpen <span><span v-if="busy === 'save'" class="bt-spin" /><PhCheck v-else :size="20" weight="bold" /></span></button>
        <button v-if="target" type="button" class="bt-link" data-test="target-delete" :disabled="busy !== ''" @click="remove">Hapus target</button>
      </form>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { PhCheck, PhWarning, PhX } from '@phosphor-icons/vue'
import { ARAH, ARAH_INFO, fmt, foodPlan, LEVEL_INFO, LEVELS, PACE_INFO, PACES, WORK_INFO, WORK_TYPES } from '@/lib/badan.js'
import { fmtU, kgWeek, monthShort } from '@/lib/badanView.js'
import { errorLines, focusNext, showToast, useShake } from '@/lib/personalForm.js'
import { activityErrors, activityPayload, levelFor, speedPreview, targetErrors, targetPayload, targetToForm } from '@/lib/badanTarget.js'
import { useBadanStore } from '@/stores/badan.js'

/** Atur target: sheet dari bawah (HP) / dialog di tengah (≥768px). Buka dari BadanPage. */
const props = defineProps({
  open: { type: Boolean, default: false },
  target: { type: Object, default: null },
  summary: { type: Object, default: null },
  wide: { type: Boolean, default: false },
})
const emit = defineEmits(['close'])

const WORK_FIELDS = [
  { k: 'workHours', lb: 'Jam/hari', u: 'jam', t: 'a-hours' },
  { k: 'workDays', lb: 'Hari/minggu', u: 'hari', t: 'a-days' },
]
const GYM_FIELDS = [
  { k: 'gymPerWeek', lb: 'Kali/minggu', u: '×', t: 'a-gym' },
  { k: 'gymMinutes', lb: 'Menit/sesi', u: 'menit', t: 'a-min' },
]

const store = useBadanStore()
const form = reactive(targetToForm(null, null))
const errors = reactive({})
const lines = ref([])
const busy = ref('')
const { shake, doShake } = useShake()

const info = computed(() => ARAH_INFO[form.arah])
const changed = computed(() => Boolean(props.target) && form.arah !== props.target.arah)
const now = (k, unit) => fmtU(props.summary?.[k] ?? null, 1, unit)
const clear = (k) => {
  delete errors[k]
  lines.value = []
}

/* Kecepatan & aktivitas: semua angka hidup dihitung dari isian (belum disimpen). */
const fmtN = (n) => String(n).replace('.', ',')
const multText = (v) => fmt(v, 3).replace(/0+$/, '')
const cut = computed(() => form.arah === 'cutting')
const paceKeys = computed(() => Object.keys(PACES[form.arah] ?? {}))
const speed = computed(() => speedPreview(form, props.summary?.weight ?? null, props.summary?.lastOn ?? null))
const pctText = computed(() => `${speed.value.pct.map(fmtN).join('–')}%`)
const level = computed(() => levelFor(form))
const food = computed(() => {
  const used = level.value.used
  // foodPlan nggak ngecek kecepatan yang nggak ada buat arahnya (mis. Bulking + Agresif) → jaga di sini juga.
  const pace = PACES[form.arah] && !PACES[form.arah][form.pace] ? 'normal' : form.pace
  return foodPlan(store.weighings, { arah: form.arah, pace }, used ? { level: used } : null)
})

const belowBmr = computed(() => food.value.state === 'ok' && food.value.belowBmr)

// Bulking nggak punya Agresif → balik ke Normal biar kecepatannya selalu valid buat arahnya.
watch(
  () => form.arah,
  (arah) => {
    if (PACES[arah] && !PACES[arah][form.pace]) form.pace = 'normal'
  },
)

function setPace(k) {
  form.pace = k
  clear('pace')
}
function setWork(k) {
  form.workType = k
  clear('workType')
}
function pickLevel(k) {
  form.level = k
  form.levelManual = true
  clear('level')
}
function useSuggestion() {
  form.levelManual = false
  clear('level')
}

// Tiap dibuka, isian mulai lagi dari target yang tersimpen.
watch(
  () => props.open,
  (open) => {
    if (!open) return
    Object.assign(form, targetToForm(props.target, store.activity))
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

/** Kolom yang punya tempat pesan sendiri di sheet; pesan server lainnya jadi baris di bawah. */
const SLOTS = new Set(['pace', 'fat', 'muscle', 'weightMin', 'weightMax', 'workType', 'workHours', 'workDays', 'gymPerWeek', 'gymMinutes', 'otherSport', 'notes', 'level'])

async function run(kind, job, message, { reload = false } = {}) {
  if (busy.value) return
  busy.value = kind
  lines.value = []
  try {
    await job()
  } catch (err) {
    const rest = []
    if (err?.fields) {
      for (const [k, v] of Object.entries(err.fields)) {
        if (typeof v?.[0] !== 'string') continue
        if (SLOTS.has(k)) errors[k] = v[0]
        else rest.push(v[0])
      }
    }
    lines.value = rest.length ? rest : Object.keys(errors).length ? [] : errorLines(err)
    doShake()
    // Simpen 2 langkah: yang udah masuk (aktivitas) nggak dibatalin → muat ulang biar halaman nampilin data terbaru.
    if (reload) await store.load().catch(() => {})
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
  Object.assign(errors, targetErrors(form), activityErrors(form))
  if (Object.keys(errors).length) return doShake()
  const activity = activityPayload(form)
  const target = targetPayload(form)
  return run(
    'save',
    async () => {
      if (activity) await store.saveActivity(activity)
      await store.saveTarget(target)
    },
    'Target kesimpen ✓',
    { reload: true },
  )
}

const remove = () => run('delete', () => store.deleteTarget(), 'Target dihapus')
</script>

<style>
.bt-spin { width: 18px; height: 18px; border-radius: 99px; border: 2.5px solid rgba(28, 36, 0, .25); border-top-color: var(--lime-ink); animation: bt-spin .7s linear infinite; }
@keyframes bt-spin { to { transform: rotate(360deg); } }
</style>
