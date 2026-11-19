<template>
  <form class="bf-form" :class="{ 'bf-shake': shake }" novalidate data-test="form" @submit.prevent="submit()">
    <div v-if="blocked" class="bf-block" data-test="block">
      <b><PhWarning :size="18" weight="bold" />Timbangan ini udah pernah disimpen</b>
      <p>{{ dDay(blocked.weighedOn) }} · {{ jam(blocked.weighedAt) }} · {{ fmt(blocked.weight, 2) }} kg udah ada di riwayat. Nggak disimpen dobel.</p>
      <button type="button" class="pill small" data-test="view-existing" @click="$emit('open', blocked.id)">Liat yang udah ada <span class="ic"><PhCaretRight :size="14" weight="bold" /></span></button>
    </div>
    <template v-else-if="mode === 'result'">
      <div v-if="warn.size" class="bf-warnsum" data-test="warnsum"><PhWarning :size="18" weight="bold" /><span>{{ warn.size }} angka kurang yakin kebacanya. Cocokin sama gambar ya, yang kuning.</span></div>
      <div v-else class="bf-oksum" data-test="oksum"><PhCheck :size="18" weight="bold" /><span>Semua angka kebaca jelas. Tinggal Simpen.</span></div>
    </template>

    <div class="bf-group"><span>Waktu timbang</span></div>
    <div class="bf-grid">
      <label class="bf-nf" :class="{ bad: errors.date }">
        <span class="lb">Tanggal</span>
        <span class="iw bf-pick">
          <span class="bf-val" data-test="date-text">{{ dateLabel(form.date, today) }}</span>
          <input type="date" aria-label="Tanggal" data-test="date" :value="form.date" :max="today" min="2000-01-01" @input="onWhen('date', $event)" @change="onWhen('date', $event)" />
        </span>
        <span v-if="errors.date" class="em-err" data-test="err-date">{{ errors.date }}</span>
      </label>
      <label class="bf-nf" :class="{ bad: errors.time }">
        <span class="lb">Jam</span>
        <span class="iw bf-pick">
          <span class="bf-val" data-test="time-text">{{ timeLabel(form.time) }}</span>
          <input type="time" aria-label="Jam" data-test="time" :value="form.time" @input="onWhen('time', $event)" @change="onWhen('time', $event)" />
        </span>
        <span v-if="errors.time" class="em-err" data-test="err-time">{{ errors.time }}</span>
      </label>
    </div>
    <p v-if="mode !== 'edit'" class="bf-hint">Tahun ngikut tahun sekarang ({{ today.slice(0, 4) }}).{{ mode === 'result' ? ' Di gambar cuma ada tanggal & jam.' : '' }}</p>

    <div class="bf-group"><span>Utama</span><small v-if="mode === 'manual'">wajib cuma Berat</small></div>
    <div class="bf-grid three">
      <label v-for="k in MAIN" :key="k" class="bf-nf big" :class="{ warn: warn.has(k), bad: errors[k] }" :data-k="k">
        <span class="lb">{{ MAIN_LABEL[k] }}{{ mode === 'manual' && k === 'weight' ? ' *' : '' }}</span>
        <span class="iw">
          <input v-model="form.values[k]" class="bf-in" :inputmode="inputMode(k)" :placeholder="zero(k)" :data-test="`f-${k}`" autocomplete="off" @input="onNum(k)" @keydown.enter.prevent="focusNext" />
          <em v-if="UNIT[k]">{{ UNIT[k] }}</em>
        </span>
        <span v-if="warn.has(k)" class="wh"><PhWarning :size="12" weight="bold" />cek lagi</span>
        <span v-if="errors[k]" class="em-err" :data-test="`err-${k}`">{{ errors[k] }}</span>
      </label>
    </div>

    <div class="bf-group"><span>Lainnya</span><small v-if="mode === 'manual'">boleh kosong</small></div>
    <div class="bf-grid">
      <label v-for="k in OTHERS" :key="k" class="bf-nf" :class="{ warn: warn.has(k), bad: errors[k] }" :data-k="k">
        <span class="lb">{{ METRIC_LABEL[k][0] }}</span>
        <span class="iw">
          <input v-model="form.values[k]" class="bf-in" :inputmode="inputMode(k)" :placeholder="zero(k)" :data-test="`f-${k}`" autocomplete="off" @input="onNum(k)" @keydown.enter.prevent="focusNext" />
          <em v-if="UNIT[k]">{{ UNIT[k] }}</em>
        </span>
        <span v-if="warn.has(k)" class="wh"><PhWarning :size="12" weight="bold" />cek lagi</span>
        <span v-if="errors[k]" class="em-err" :data-test="`err-${k}`">{{ errors[k] }}</span>
      </label>
      <label class="bf-nf">
        <span class="lb">Tipe badan</span>
        <span class="iw">
          <select v-model="form.bodyType" class="bf-in" data-test="bodyType" @keydown.enter.prevent="focusNext">
            <option v-if="mode === 'manual' || !form.bodyType" value="">Pilih…</option>
            <option v-for="t in BODY_TYPES" :key="t.key" :value="t.key">{{ t.label }}</option>
          </select>
        </span>
        <span v-if="zepp" class="orig">{{ zepp }} di Zepp</span>
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
import { PhCaretRight, PhCheck, PhEyeSlash, PhWarning } from '@phosphor-icons/vue'
import { BODY_TYPES, METRICS, METRIC_LABEL, UNIT, fmt } from '@/lib/badan.js'
import { blankForm, dateLabel, formErrors, fromRead, fromWeighing, timeLabel, toPayload } from '@/lib/badanForm.js'
import { dDay, jam } from '@/lib/badanView.js'
import { wibNow } from '@/lib/home.js'
import { errorLines, focusNext, useShake } from '@/lib/personalForm.js'
import { useBadanStore } from '@/stores/badan.js'

/**
 * Form timbangan. mode: manual (kosong) · edit (`initial` = timbangan dari server) · result (`initial` = hasil baca gambar,
 * `check` = kunci angka yang kurang yakin kebacanya → kolom kuning sampai diketik).
 */
const props = defineProps({
  mode: { type: String, default: 'manual' },
  initial: { type: Object, default: null },
  check: { type: Array, default: () => [] },
})
const emit = defineEmits(['done', 'open'])

const MAIN = ['weight', 'fat', 'muscle']
const MAIN_LABEL = { weight: 'Berat', fat: 'Lemak', muscle: 'Otot' }
const OTHERS = ['water', 'bmr', 'visceral', 'bone', 'protein', 'bmi', 'score']

const store = useBadanStore()
const now = wibNow()
const today = now.date
const form = reactive(
  props.mode === 'edit' && props.initial ? fromWeighing(props.initial) : props.mode === 'result' && props.initial ? fromRead(props.initial, now) : blankForm(now),
)
const warn = reactive(new Set(props.mode === 'result' ? props.check : []))
const errors = reactive({})
const lines = ref([])
const blocked = ref(null)
const busy = ref(false)
const { shake, doShake } = useShake()
defineExpose({ busy })

const zepp = computed(() => BODY_TYPES.find((t) => t.key === form.bodyType)?.zepp ?? '')
const inputMode = (k) => (METRICS[k].dec ? 'decimal' : 'numeric')
const zero = (k) => (0).toFixed(METRICS[k].dec).replace('.', ',')

function onNum(k) {
  warn.delete(k)
  delete errors[k]
}
/** Ganti tanggal / jam → timbangan "udah ada" yang tadi ngeblok bisa dicoba lagi. */
function onWhen(k, e) {
  form[k] = e.target.value
  delete errors[k]
  blocked.value = null
}

const source = () => (props.mode === 'result' ? 'scan' : props.mode === 'edit' ? props.initial?.source ?? 'manual' : 'manual')

async function confirmReplace(existingRow, payload) {
  const sheet = await actionSheetController.create({
    header: 'Udah ada timbangan tanggal ini',
    subHeader: `${dDay(existingRow.weighedOn)} jam ${jam(existingRow.weighedAt)} · ${fmt(existingRow.weight, 2)} kg. Ganti sama yang baru (${jam(payload.weighedAt)} · ${fmt(payload.weight, 2)} kg)?`,
    buttons: [{ text: 'Ganti', data: 'replace' }, { text: 'Batal', role: 'cancel' }],
  })
  await sheet.present()
  const { data } = await sheet.onDidDismiss()
  return data === 'replace'
}

async function submit() {
  if (busy.value) return
  lines.value = []
  for (const k of Object.keys(errors)) delete errors[k]
  const found = formErrors(form, today)
  if (Object.keys(found).length) {
    Object.assign(errors, found)
    doShake()
    return
  }
  busy.value = true
  try {
    await send(toPayload(form, source()), null)
  } finally {
    busy.value = false
  }
}

/** Kirim ke server. `replaceWith` = timbangan lama yang udah disetujui buat diganti (kirim ulang `replace: true`). */
async function send(payload, replaceWith) {
  try {
    if (props.mode === 'edit') await store.update(props.initial.id, payload, { replace: !!replaceWith })
    else await store.save(payload, { replace: !!replaceWith })
    const swapped = replaceWith ? ` Timbangan ${jam(replaceWith.weighedAt)} diganti` : ''
    emit('done', `${props.mode === 'edit' ? 'Perubahan kesimpen ✓' : 'Kesimpen ✓'}${swapped}`)
  } catch (err) {
    const existingRow = err?.fields?.existing
    if (err?.status === 409 && existingRow && !replaceWith) {
      if (err.fields.reason === 'exact') {
        blocked.value = existingRow
        return
      }
      if (err.fields.reason === 'sameDay') {
        if (await confirmReplace(existingRow, payload)) await send(payload, existingRow)
        return
      }
    }
    // 409 yang nggak dikenal / 409 lagi abis Ganti: tetep kasih tau user.
    lines.value = err?.status === 409 ? [err.message] : errorLines(err)
    doShake()
  }
}
</script>
