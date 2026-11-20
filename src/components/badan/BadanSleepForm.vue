<template>
  <form class="bf-form" :class="{ 'bf-shake': shake }" novalidate data-test="form" @submit.prevent="submit()">
    <div v-if="blocked" class="bf-block" data-test="block">
      <b><PhWarning :size="18" weight="bold" />Data tidur ini udah pernah disimpen</b>
      <p>{{ dDay(blocked.sleptOn) }} · {{ durL(blocked.totalMin) }} udah ada di riwayat. Nggak disimpen dobel.</p>
      <button type="button" class="pill small" data-test="view-existing" @click="$emit('open', blocked.id)">Liat yang udah ada <span class="ic"><PhCaretRight :size="14" weight="bold" /></span></button>
    </div>
    <template v-else-if="mode === 'result'">
      <div v-if="warn.size" class="bf-warnsum" data-test="warnsum"><PhWarning :size="18" weight="bold" /><span>{{ warn.size }} angka kurang yakin kebacanya. Cocokin sama gambar ya, yang kuning.</span></div>
      <div v-else class="bf-oksum" data-test="oksum"><PhCheck :size="18" weight="bold" /><span>Semua angka kebaca jelas. Tinggal Simpen.</span></div>
    </template>

    <div class="bf-group"><span>Waktu tidur</span></div>
    <div class="bf-grid">
      <label class="bf-nf bs-span2" :class="{ bad: errors.date }">
        <span class="lb">Tanggal (tanggal bangun)</span>
        <span class="iw bf-pick">
          <span class="bf-val" data-test="date-text">{{ dateLabel(form.date, today) }}</span>
          <input type="date" aria-label="Tanggal bangun" data-test="date" :value="form.date" :max="today" min="2000-01-01" @input="onWhen('date', $event)" @change="onWhen('date', $event)" />
        </span>
        <span v-if="errors.date" class="em-err" data-test="err-date">{{ errors.date }}</span>
      </label>
      <label v-for="c in CLOCKS" :key="c.k" class="bf-nf" :class="{ warn: warn.has(c.k) }" :data-k="c.k">
        <span class="lb">{{ c.label }}</span>
        <span class="iw bf-pick">
          <span class="bf-val" :class="{ 'bs-none': !form[c.k] }" :data-test="`${c.k}-text`">{{ timeLabel(form[c.k]) }}</span>
          <input type="time" :aria-label="c.label" :data-test="c.k" :value="form[c.k]" @input="onWhen(c.k, $event)" @change="onWhen(c.k, $event)" />
        </span>
        <button v-if="form[c.k]" type="button" class="bs-clear" :aria-label="`Kosongin ${c.label.toLowerCase()}`" :data-test="`clear-${c.k}`" @click.prevent.stop="clearClock(c.k)"><PhX :size="13" weight="bold" /></button>
        <span v-if="warn.has(c.k)" class="wh"><PhWarning :size="12" weight="bold" />cek lagi</span>
      </label>
    </div>
    <p class="bf-hint">Tidurnya dicatet di tanggal lo bangun.{{ mode !== 'edit' ? ` Tahun ngikut tahun sekarang (${today.slice(0, 4)}).` : '' }}</p>

    <div class="bf-group"><span>Lama tidur</span></div>
    <div class="bf-grid bs-dur">
      <label v-for="d in DURS" :key="d.f" class="bf-nf" :class="{ big: d.big, warn: warn.has(d.k), bad: errors[d.f] }" :data-k="d.k">
        <span class="lb">{{ d.label }}</span>
        <span class="iw">
          <input v-model="form[d.f].h" class="bf-in bs-dh" :style="{ width: chW(form[d.f].h, 1) }" inputmode="numeric" placeholder="0" :aria-label="`${d.label}, jam`" :data-test="`f-${d.f}-h`" autocomplete="off" @input="onNum(d.k, d.f)" @keydown.enter.prevent="focusNext" />
          <em>j</em>
          <input v-model="form[d.f].m" class="bf-in bs-dm" :style="{ width: chW(form[d.f].m, 2) }" inputmode="numeric" placeholder="00" :aria-label="`${d.label}, menit`" :data-test="`f-${d.f}-m`" autocomplete="off" @input="onNum(d.k, d.f)" @keydown.enter.prevent="focusNext" />
          <em>m</em>
        </span>
        <span v-if="!d.big" class="orig" :data-test="`pct-${d.f}`">{{ pct(d.f) || ' ' }}</span>
        <span v-if="warn.has(d.k)" class="wh"><PhWarning :size="12" weight="bold" />cek lagi</span>
        <span v-if="errors[d.f]" class="em-err" :data-test="`err-${d.f}`">{{ errors[d.f] }}</span>
      </label>
    </div>
    <p v-if="clockTotal != null" class="bf-hint" data-test="total-hint">Total diitung dari jam tidur–bangun: {{ durL(clockTotal) }}</p>
    <div class="bs-sum" :class="sum && (sum.ok ? 'ok' : 'off')" data-test="sum-line"><template v-if="sum"><PhCheck v-if="sum.ok" :size="14" weight="bold" /><PhWarning v-else :size="14" weight="bold" />{{ sum.text }}</template></div>

    <div class="bf-group"><span>Lainnya</span><small v-if="mode === 'manual'">boleh kosong</small></div>
    <div class="bf-grid bs-lain">
      <label v-for="o in OTHERS" :key="o.k" class="bf-nf" :class="{ warn: warn.has(o.k), bad: errors[o.k] }" :data-k="o.k">
        <span class="lb">{{ o.label }}</span>
        <span class="iw">
          <input v-model="form[o.k]" class="bf-in" inputmode="numeric" placeholder="0" :data-test="`f-${o.k}`" autocomplete="off" @input="onNum(o.k, o.k)" @keydown.enter.prevent="focusNext" />
          <em v-if="o.unit">{{ o.unit }}</em>
        </span>
        <span v-if="warn.has(o.k)" class="wh"><PhWarning :size="12" weight="bold" />cek lagi</span>
        <span v-if="errors[o.k]" class="em-err" :data-test="`err-${o.k}`">{{ errors[o.k] }}</span>
      </label>
    </div>

    <p v-for="line in lines" :key="line" class="bf-err" role="alert" data-test="error">{{ line }}</p>

    <button type="submit" class="bf-save" data-test="save" :disabled="busy || !!blocked">
      {{ mode === 'edit' ? 'Simpen perubahan' : 'Simpen' }}
      <span><PhCheck :size="20" weight="bold" /></span>
    </button>
    <div v-if="mode === 'result'" class="bf-note"><PhEyeSlash :size="15" />Gambarnya nggak disimpen, cuma angkanya.</div>
  </form>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { actionSheetController } from '@ionic/vue'
import { PhCaretRight, PhCheck, PhEyeSlash, PhWarning, PhX } from '@phosphor-icons/vue'
import { clockSpan } from '@/lib/badan.js'
import { dateLabel, timeLabel } from '@/lib/badanForm.js'
import { blankSleep, durL, durMin, fromSleep, fromSleepRead, sleepErrors, sleepPayload } from '@/lib/badanSleep.js'
import { dDay, dShort } from '@/lib/badanView.js'
import { wibNow } from '@/lib/home.js'
import { errorLines, focusNext, useShake } from '@/lib/personalForm.js'
import { useBadanStore } from '@/stores/badan.js'

/**
 * Form tidur. mode: manual (kosong) · edit (`initial` = tidur dari server) · result (`initial` = hasil baca gambar,
 * `check` = kunci angka yang kurang yakin kebacanya → kolom kuning sampai diketik).
 */
const props = defineProps({
  mode: { type: String, default: 'manual' },
  initial: { type: Object, default: null },
  check: { type: Array, default: () => [] },
})
const emit = defineEmits(['done', 'open'])

const CLOCKS = [{ k: 'bedAt', label: 'Jam tidur' }, { k: 'wakeAt', label: 'Jam bangun' }]
const DURS = [
  { f: 'total', k: 'totalMin', label: 'Total', big: true },
  { f: 'deepMin', k: 'deepMin', label: 'Tidur dalam' },
  { f: 'lightMin', k: 'lightMin', label: 'Ringan' },
  { f: 'remMin', k: 'remMin', label: 'REM' },
]
const OTHERS = [{ k: 'score', label: 'Skor' }, { k: 'awakeCount', label: 'Kebangun', unit: '×' }, { k: 'avgHr', label: 'HR rata-rata', unit: 'bpm' }, { k: 'avgHrv', label: 'HRV', unit: 'ms' }]
/** Beda dalam + ringan + REM sama total yang masih dianggep cocok (menit). */
const SUM_TOLERANCE = 5

const store = useBadanStore()
const now = wibNow()
const today = now.date
const form = reactive(
  props.mode === 'edit' && props.initial ? fromSleep(props.initial) : props.mode === 'result' && props.initial ? fromSleepRead(props.initial, now) : blankSleep(now),
)
const warn = reactive(new Set(props.mode === 'result' ? props.check : []))
const errors = reactive({})
const lines = ref([])
const blocked = ref(null)
const busy = ref(false)
const { shake, doShake } = useShake()
defineExpose({ busy })

/** Lebar kotak angka ngikut isinya (jam 1–2 digit, menit 2) — lebarnya doang yang berubah, tinggi kolom tetep. */
const chW = (v, min) => `${Math.max(min, String(v ?? '').length) + 0.3}ch`
const minutes = (f) => {
  const v = durMin(form[f].h, form[f].m)
  return Number.isFinite(v) ? v : null
}
const bothClocks = computed(() => !!form.bedAt && !!form.wakeAt)
/** Total kosong + jam tidur & bangun ada → total diitung dari jam (lewat tengah malam tetep bener). */
const clockTotal = computed(() => (durMin(form.total.h, form.total.m) === null && bothClocks.value ? clockSpan(form.bedAt, form.wakeAt) : null))
const total = computed(() => minutes('total') ?? clockTotal.value)
const pct = (f) => {
  const v = minutes(f)
  return v != null && total.value > 0 ? `${Math.round((v / total.value) * 100)}%` : ''
}
const sum = computed(() => {
  const parts = ['deepMin', 'lightMin', 'remMin'].map(minutes)
  if (parts.some((v) => v == null) || total.value == null) return null
  const s = parts[0] + parts[1] + parts[2]
  const ok = Math.abs(s - total.value) <= SUM_TOLERANCE
  return { ok, text: `Dalam + ringan + REM = ${durL(s)}, ${ok ? 'cocok sama' : 'beda sama'} total` }
})

function onNum(key, field) {
  warn.delete(key)
  delete errors[field]
}
/** Ganti tanggal / jam → data "udah ada" yang tadi ngeblok bisa dicoba lagi. Jam lengkap → "wajib diisi" di Total ilang. */
function onWhen(k, e) {
  form[k] = e.target.value
  warn.delete(k)
  delete errors[k]
  if (k !== 'date' && bothClocks.value) delete errors.total
  blocked.value = null
}
function clearClock(k) {
  form[k] = ''
  warn.delete(k)
  blocked.value = null
}

const source = () => (props.mode === 'result' ? 'scan' : props.mode === 'edit' ? props.initial?.source ?? 'manual' : 'manual')
const brief = (s) => `${durL(s.totalMin)}${s.score != null ? ` · skor ${s.score}` : ''}`

async function confirmReplace(existingRow, payload) {
  const sheet = await actionSheetController.create({
    header: 'Udah ada data tidur tanggal ini — ganti?',
    subHeader: `${dDay(existingRow.sleptOn)} · ${brief(existingRow)}. Ganti sama yang baru (${brief(payload)})?`,
    buttons: [{ text: 'Ganti', data: 'replace' }, { text: 'Batal', role: 'cancel' }],
  })
  await sheet.present()
  const { data } = await sheet.onDidDismiss()
  return data === 'replace'
}

async function submit() {
  if (busy.value || blocked.value) return
  lines.value = []
  for (const k of Object.keys(errors)) delete errors[k]
  const found = sleepErrors(form, today)
  if (Object.keys(found).length) {
    Object.assign(errors, found)
    doShake()
    return
  }
  busy.value = true
  try {
    await send(sleepPayload(form, source()), null)
  } finally {
    busy.value = false
  }
}

/** Kirim ke server. `replaceWith` = data tidur lama yang udah disetujui buat diganti (kirim ulang `replace: true`). */
async function send(payload, replaceWith) {
  try {
    const opts = { replace: !!replaceWith }
    const res = props.mode === 'edit' ? await store.updateSleep(props.initial.id, payload, opts) : await store.saveSleep(payload, opts)
    const fallback = replaceWith ? `Kesimpen ✓ Data tidur ${dShort(payload.sleptOn)} diganti` : props.mode === 'edit' ? 'Perubahan kesimpen ✓' : 'Data tidur kesimpen ✓'
    emit('done', res?.message || fallback)
  } catch (err) {
    const existingRow = err?.fields?.existing
    if (err?.status === 409 && existingRow && !replaceWith) {
      if (err.fields.reason === 'exact') {
        blocked.value = existingRow
        return
      }
      if (err.fields.reason === 'sameDay') {
        let replace
        try {
          replace = await confirmReplace(existingRow, payload)
        } catch {
          lines.value = ['Pilihan gantinya gagal kebuka. Coba Simpen lagi ya.']
          doShake()
          return
        }
        if (replace) await send(payload, existingRow)
        return
      }
    }
    // 409 yang nggak dikenal / 409 lagi abis Ganti: tetep kasih tau user.
    lines.value = err?.status === 409 ? [err.message] : errorLines(err)
    doShake()
  }
}
</script>
